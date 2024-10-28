pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";
import "./ERC20.sol";

contract BuyMyRoom is ERC721{

    event HouseListed(uint256 tokenId, uint256 price, address owner);
    event HouseSold(uint256 tokenId, uint256 price, address newOwner);

    struct House {
        uint256 ID;
        address owner;
        uint256 listedTimestamp;
        bool isForSale;
        uint256 price;
    }

    mapping(uint256 => House) public houses; 
    mapping(address => bool) public getfree; 
    address public contractOwner; 
    uint256 public total; 
    uint256 public feePct; 
    ctERC20 public cToken;

    constructor() ERC721("BuyMyRoom", "HNFT"){
        contractOwner = msg.sender;
        total = 0;
        feePct = 2;
        cToken = new ctERC20("Ename", "Esymbol");
    }

    modifier onlyOwner() {
        require(contractOwner == msg.sender, "Not the contract owner");
        _;
    }

    function getfreeHouses() external {
        require(!getfree[msg.sender], "Airdrop already claimed");
        for (uint256 i = 1; i <= 3; i++) {
            total++;
            _mint(msg.sender, total);
            houses[total] = House(total, msg.sender, block.timestamp, false, 0);
        }
        getfree[msg.sender] = true;
    }

    function listHouse(uint256 tokenId, uint256 price) external{
        require(!houses[tokenId].isForSale, "Already for sale");
        houses[tokenId].isForSale = true;
        houses[tokenId].price = price;
        houses[tokenId].listedTimestamp = block.timestamp;
        emit HouseListed(tokenId, price, msg.sender);
    }

    function getOwnInfo(address user) external view returns (House[] memory) {
        uint256 cnt = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (houses[i].owner == user) cnt++;
        }
        House[] memory res = new House[](cnt);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (houses[i].owner == user) {
                res[index] = houses[i];
                index++;
            }
        }
        return res;
    }

    function getSaleHouse() external view returns (House[] memory) {
        uint256 cnt = 0;
        for (uint256 i = 1; i <= total; i++){
            if (houses[i].isForSale) cnt++;
        }
        House[] memory res = new House[](cnt);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (houses[i].isForSale) {
                res[index] = houses[i];
                index++;
            }
        }
        return res;
    }

    function getHouseOwner(uint256 tokenId) external view returns (address) {
        return houses[tokenId].owner;
    }

    function getHousePrice(uint256 tokenId) external view returns (uint256) {
        return houses[tokenId].price / 1 ether;
    }

    function getHouseInfo(uint256 tokenId) external view returns (House memory) {
        return houses[tokenId];
    }

    function getBalance() external view returns (uint256) {
        return cToken.balanceOf(msg.sender);
    }

    function buyTokens() external payable {
        require(msg.value > 0, "Ether > 0");
        uint256 tokensToMint = msg.value;
        cToken.mint(msg.sender, tokensToMint); 
    }

    function buyHouse(uint256 tokenId) external {
        House memory house = houses[tokenId];
        require(house.isForSale, "House is not for sale");
        require(cToken.balanceOf(msg.sender) >= house.price, "Insufficient payment");
        uint256 fee = (block.timestamp - house.listedTimestamp) / 10000 * feePct / 100 * house.price;
        cToken.transferFrom(msg.sender, house.owner, house.price - fee); 
        cToken.transferFrom(msg.sender, contractOwner, fee); 
        _transfer(house.owner, msg.sender, tokenId); 
        houses[tokenId].isForSale = false;
        houses[tokenId].owner = msg.sender;
        houses[tokenId].price = 0;
        emit HouseSold(tokenId, house.price, msg.sender);
    }

    function calculateFee(uint256 price, uint256 listedTimestamp) public view returns (uint256) {
        uint256 duration = (block.timestamp - listedTimestamp) / 1 hours;
        return (duration * feePct * price) / 100;
    }

    function helloworld() pure external returns(string memory) {
        return "hello world";
    }
}