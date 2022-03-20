// SPDX-License-Identifier: MIT
// Prepared for BUchain Workshop by Murat Ögat

pragma solidity ^0.8.0;

import "./IBroker.sol";
import "../Utils/Ownable.sol";
import "../ERC20/IERC20.sol";

contract Broker is IBroker, Ownable {

    IERC20 public immutable currency;
    IERC20 public immutable shares;
    uint256 private price;

    constructor(IERC20 _shares, uint256 _price, IERC20 _currency, address _owner) Ownable(_owner) {
        shares = _shares;
        price = _price;
        currency = _currency;
    }
    
    function getShares() external view returns (IERC20) {

    }

    function getBaseCurrency() external view returns (IERC20) {

    }

    function getPriceInBaseCurrency() external view returns (uint256) {

    }

    function setPriceInBaseCurrency(uint256 _price) external onlyOwner {

    }

    function getPriceInETH() external view returns (uint256) {

    }

    function getPriceInToken(address _tokenAddress) external view returns (uint256) {

    }

    function buyWithBaseCurrency(uint256 _amountShares) external {

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