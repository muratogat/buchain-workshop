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

    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant router = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

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
        uint256 daiAmount = _amountShares * price;
        address tokenIn = DAI;
        address tokenOut = WETH9;
        uint24 fee = 3000;
        uint160 sqrtPriceLimitX96 = 0;

        return IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6).quoteExactOutputSingle(
            tokenIn,
            tokenOut,
            fee,
            daiAmount,
            sqrtPriceLimitX96
        );
    }

    function getPriceInToken(uint256 _amountShares, bytes memory path) external returns (uint256) {
        uint256 amountOut = _amountShares * price;
        return IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6).quoteExactOutput(path, amountOut);
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
