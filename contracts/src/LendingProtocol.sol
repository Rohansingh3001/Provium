// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LendingProtocol is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Position {
        uint256 collateral;    // WETH in wei
        uint256 debt;          // USDC in 6 decimals
        uint256 lastUpdated;   // block.timestamp
    }

    mapping(address => Position) public positions;
    address[] public userList;
    mapping(address => bool) public isUser;
    // tracks index of each user in userList for O(1) removal
    mapping(address => uint256) private _userIndex;

    bytes32 public currentPositionRoot;
    uint256 public positionRootBlock;
    address public agentAddress;

    uint256 public constant MIN_RATIO_BPS = 15000; // 150%
    uint256 public constant LIQUIDATION_RATIO_BPS = 12000; // 120%
    // NOTE: for production replace with a live Chainlink feed read.
    // Call setWethPrice() whenever the price needs updating.
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
    event WethPriceUpdated(uint256 oldPrice, uint256 newPrice);

    modifier onlyAgent() {
        require(msg.sender == agentAddress, "Only agent");
        _;
    }

    constructor(address _weth, address _usdc) Ownable(msg.sender) {
        weth = IERC20(_weth);
        usdc = IERC20(_usdc);
    }

    function deposit(uint256 wethAmount) external nonReentrant {
        weth.safeTransferFrom(msg.sender, address(this), wethAmount);
        positions[msg.sender].collateral += wethAmount;
        positions[msg.sender].lastUpdated = block.timestamp;

        if (!isUser[msg.sender]) {
            _userIndex[msg.sender] = userList.length;
            userList.push(msg.sender);
            isUser[msg.sender] = true;
        }
        emit Deposit(msg.sender, wethAmount, block.number);
    }

    function borrow(uint256 usdcAmount) external nonReentrant {
        positions[msg.sender].debt += usdcAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        require(getHealthFactor(msg.sender) >= MIN_RATIO_BPS, "Undercapitalized");
        usdc.safeTransfer(msg.sender, usdcAmount);
        emit Borrow(msg.sender, usdcAmount, block.number);
    }

    function repay(uint256 usdcAmount) external nonReentrant {
        require(usdcAmount <= positions[msg.sender].debt, "Repay exceeds debt");
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        positions[msg.sender].debt -= usdcAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        emit Repay(msg.sender, usdcAmount);
    }

    function withdraw(uint256 wethAmount) external nonReentrant {
        positions[msg.sender].collateral -= wethAmount;
        positions[msg.sender].lastUpdated = block.timestamp;
        require(getHealthFactor(msg.sender) >= MIN_RATIO_BPS, "Undercapitalized");
        weth.safeTransfer(msg.sender, wethAmount);
        emit Withdraw(msg.sender, wethAmount);
    }

    function liquidate(address user) external nonReentrant {
        require(getHealthFactor(user) < LIQUIDATION_RATIO_BPS, "Safe");
        uint256 coll = positions[user].collateral;
        uint256 debtToRepay = positions[user].debt;

        positions[user].collateral = 0;
        positions[user].debt = 0;

        usdc.safeTransferFrom(msg.sender, address(this), debtToRepay);
        weth.safeTransfer(msg.sender, coll);

        // Remove user from list once their position is fully cleared
        _removeUser(user);

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
        // wethPriceInUSDC = price * 1e6 (USDC per WETH, 6 decimals).
        // Collateral value in USDC-6 = collateral_wei * wethPriceInUSDC / 1e18
        // Health factor in BPS = collateral_value_usdc / debt_usdc * 10000
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

    // WARNING: loops over all users — use paginated version in production.
    function getTotalCollateral() external view returns (uint256 total) {
        for (uint256 i = 0; i < userList.length; i++) {
            total += positions[userList[i]].collateral;
        }
    }

    // WARNING: loops over all users — use paginated version in production.
    function getTotalDebt() external view returns (uint256 total) {
        for (uint256 i = 0; i < userList.length; i++) {
            total += positions[userList[i]].debt;
        }
    }

    // Paginated collateral sum: pass offset=0, limit=userList.length for full sum.
    function getTotalCollateralPaginated(uint256 offset, uint256 limit)
        external view returns (uint256 total, uint256 nextOffset)
    {
        uint256 end = offset + limit;
        if (end > userList.length) end = userList.length;
        for (uint256 i = offset; i < end; i++) {
            total += positions[userList[i]].collateral;
        }
        nextOffset = end;
    }

    // Paginated debt sum.
    function getTotalDebtPaginated(uint256 offset, uint256 limit)
        external view returns (uint256 total, uint256 nextOffset)
    {
        uint256 end = offset + limit;
        if (end > userList.length) end = userList.length;
        for (uint256 i = offset; i < end; i++) {
            total += positions[userList[i]].debt;
        }
        nextOffset = end;
    }

    // Demo-only: owner can push a user into undercollateralization.
    function triggerUndercollateralization(address user) external onlyOwner {
        positions[user].collateral = (positions[user].debt * 1e18 * 14000) / (wethPriceInUSDC * 10000);
        emit ViolationSimulated(user, block.number);
    }

    // Update the WETH/USDC price used for health factor calculations.
    // In production this should be replaced by a Chainlink oracle read.
    function setWethPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        emit WethPriceUpdated(wethPriceInUSDC, newPrice);
        wethPriceInUSDC = newPrice;
    }

    function setAgentAddress(address agent) external onlyOwner {
        require(agent != address(0), "Zero address");
        agentAddress = agent;
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    // Swap-and-pop removal from userList in O(1).
    function _removeUser(address user) internal {
        if (!isUser[user]) return;
        uint256 idx = _userIndex[user];
        address last = userList[userList.length - 1];
        userList[idx] = last;
        _userIndex[last] = idx;
        userList.pop();
        delete isUser[user];
        delete _userIndex[user];
    }
}
