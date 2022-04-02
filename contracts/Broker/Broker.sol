// SPDX-License-Identifier: MIT
// Prepared for BUchain Workshop by Murat Ögat

pragma solidity ^0.8.0;

import "./IBroker.sol";
import "../Utils/Ownable.sol";
import "../ERC20/IERC20.sol";
import "../Utils/IUniswapV3.sol";


contract Broker is IBroker, Ownable {

    IERC20 public immutable currency;
    IERC20 public immutable shares;
    mapping (address => uint256) private userToPaid;
    mapping (address=>uint256) private userToDeposit;
    mapping (address=>uint256) private userToSharesCount;

    uint256 private price;


    constructor(IERC20 _shares, uint256 _price, IERC20 _currency, address _owner) Ownable(_owner) {
        shares = _shares;
        price = _price;
        currency = _currency;
    }
    
    function getShares() external view returns (IERC20) {
        return shares;
    }

    function getBaseCurrency() external view returns (IERC20) {
        return currency;
    }

    function getPriceInBaseCurrency() external view returns (uint256) {
        return price;
    }

    function setPriceInBaseCurrency(uint256 _price) external onlyOwner {
        price = _price;
    }

    function getPriceInETH(uint256 _amountShares) external returns (uint256) {
        
    }

    function getPriceInToken(uint256 _amountShares, bytes memory path) external returns (uint256) {

    }

    function buyWithBaseCurrency(uint256 _amountShares) external {
        uint256 amountCurrency;
        amountCurrency = _amountShares * price;

        currency.transferFrom(msg.sender, address(this), amountCurrency);
        userToPaid[msg.sender] += amountCurrency;
        userToDeposit[msg.sender] += amountCurrency;
 
        require(userToPaid[msg.sender] == amountCurrency, "not equal deposit DAI");
        shares.transfer(msg.sender, _amountShares);
        userToPaid[msg.sender] -= amountCurrency;
        userToSharesCount[msg.sender] += _amountShares;
    }

    function buyWithETH(uint256 _amountShares) external {

    }

    function buyWithToken(uint256 _amountShares, address _tokenAddress) external {

    }

    function sellForBaseCurrency(uint256 _amountShares) external {

    }

    function sellForWETH(uint256 _amountShares) external {

    }

    function withdrawShares(uint256 _amountShares, address _recipient) external onlyOwner {

    }
    
    function withdrawETH(address _recipient) external onlyOwner {

    }

    function withdrawToken(address _token, address _recipient) external onlyOwner {

    }
}
