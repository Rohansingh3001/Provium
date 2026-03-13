// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LendingProtocol is ReentrancyGuard, Ownable {
    struct Position {
        uint256 collateral;    // WETH in wei
        uint256 debt;          // USDC in 6 decimals
        uint256 lastUpdated;   // block.timestamp
    }
    
    mapping(address => Position) public positions;
    address[] public userList;
    mapping(address => bool) public isUser;
    
    bytes32 public currentPositionRoot;
    uint256 public positionRootBlock;
    address public agentAddress;
    
    uint256 public constant MIN_RATIO_BPS = 15000; // 150%
    uint256 public constant LIQUIDATION_RATIO_BPS = 12000; // 120%
    uint256 public wethPriceInUSDC = 2000 * 1e6;
    
    IERC20 public weth;
    IERC20 public usdc;
    
    event Deposit(address indexed user, uint256 amount, uint256 blockNum);
    event Borrow(address indexed user, uint256 amount, uint256 blockNum);
    event Repay(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Liquidation(address indexed user, uint256 blockNum);
    event PositionRootCommitted(bytes32 root, uint256 blockNum);
    event ViolationSimulated(address indexed user, uint256 blockNum);

    modifier onlyAgent() {
        require(msg.sender == agentAddress, "Only agent");
        _;
    }

    constructor(address _weth, address _usdc) Ownable(msg.sender) {
        weth = IERC20(_weth);
        usdc = IERC20(_usdc);
    }

    function deposit(uint256 wethAmount) external nonReentrant {
        weth.transferFrom(msg.sender, address(this), wethAmount);
        positions[msg.sender].collateral += wethAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        
        if (!isUser[msg.sender]) {
            userList.push(msg.sender);
            isUser[msg.sender] = true;
        }
        emit Deposit(msg.sender, wethAmount, block.number);
    }

    function borrow(uint256 usdcAmount) external nonReentrant {
        positions[msg.sender].debt += usdcAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        require(getHealthFactor(msg.sender) >= MIN_RATIO_BPS, "Undercapitalized");
        usdc.transfer(msg.sender, usdcAmount);
        emit Borrow(msg.sender, usdcAmount, block.number);
    }

    function repay(uint256 usdcAmount) external nonReentrant {
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        positions[msg.sender].debt -= usdcAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        emit Repay(msg.sender, usdcAmount);
    }

    function withdraw(uint256 wethAmount) external nonReentrant {
        positions[msg.sender].collateral -= wethAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        require(getHealthFactor(msg.sender) >= MIN_RATIO_BPS, "Undercapitalized");
        weth.transfer(msg.sender, wethAmount);
        emit Withdraw(msg.sender, wethAmount);
    }

    function liquidate(address user) external nonReentrant {
        require(getHealthFactor(user) < LIQUIDATION_RATIO_BPS, "Safe");
        uint256 coll = positions[user].collateral;
        uint256 debtToRepay = positions[user].debt;
        
        positions[user].collateral = 0;
        positions[user].debt = 0;
        
        usdc.transferFrom(msg.sender, address(this), debtToRepay);
        weth.transfer(msg.sender, coll);
        
        emit Liquidation(user, block.number);
    }

    function commitPositionRoot(bytes32 root, uint256 blockNum) external onlyAgent {
        currentPositionRoot = root;
        positionRootBlock = blockNum;
        emit PositionRootCommitted(root, blockNum);
    }

    function getHealthFactor(address user) public view returns (uint256) {
        if (positions[user].debt == 0) return type(uint256).max;
        // Units: collateral is in wei (1e18), debt is in USDC-6 (1e6).
        // wethPriceInUSDC = 2000 * 1e6 (USDC per WETH, 6 decimals).
        // Collateral value in USDC-6 = collateral_wei * wethPriceInUSDC / 1e18
        // Health factor in BPS = collateral_value_usdc / debt_usdc * 10000
        // = (collateral * wethPriceInUSDC / 1e18) / debt * 10000
        // = (collateral * wethPriceInUSDC * 10000) / (debt * 1e18)
        // Example: 5 WETH (5e18 wei), 5000 USDC (5000*1e6), price=2000*1e6
        // = (5e18 * 2000*1e6 * 10000) / (5000*1e6 * 1e18) = 20000 bps = 200%  ✓
        return (positions[user].collateral * wethPriceInUSDC * 10000) / (positions[user].debt * 1e18);
    }

    function getUserAtIndex(uint256 i) external view returns (address) {
        return userList[i];
    }
    
    function getUserCount() external view returns (uint256) {
        return userList.length;
    }
    
    function getPosition(address user) external view returns (uint256, uint256) {
        return (positions[user].collateral, positions[user].debt);
    }

    function getTotalCollateral() external view returns (uint256 total) {
        for(uint i=0; i<userList.length; i++) {
            total += positions[userList[i]].collateral;
        }
    }

    function getTotalDebt() external view returns (uint256 total) {
        for(uint i=0; i<userList.length; i++) {
            total += positions[userList[i]].debt;
        }
    }

    function triggerUndercollateralization(address user) external onlyOwner {
        positions[user].collateral = (positions[user].debt * 1e18 * 14000) / (wethPriceInUSDC * 10000); 
        emit ViolationSimulated(user, block.number);
    }

    function setAgentAddress(address agent) external onlyOwner {
        agentAddress = agent;
    }
}
