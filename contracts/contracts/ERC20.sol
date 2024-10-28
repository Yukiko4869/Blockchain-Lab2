pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ctERC20 is ERC20 {
    address public owner;
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        owner = msg.sender; 
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    function mint(address to, uint256 amount) external {
        require(to != address(0), "Can't mint to zero");
        _mint(to, amount);
    }
}