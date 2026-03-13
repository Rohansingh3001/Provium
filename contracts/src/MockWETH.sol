// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockWETH is ERC20, Ownable {
    mapping(address => uint256) public lastFaucet;
    
    constructor() ERC20("WETH", "WETH") Ownable(msg.sender) {}
    
    function faucet() external {
        require(block.timestamp >= lastFaucet[msg.sender] + 1 days, "Max once per 24 hours");
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, 10 ether);
    }
    
    function mintTo(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
