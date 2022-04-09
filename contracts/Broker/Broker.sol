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
    address public constant quoter = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;

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

        return IQuoter(quoter).quoteExactOutputSingle(
            tokenIn,
            tokenOut,
            fee,
            daiAmount,
            sqrtPriceLimitX96
        );
    }

    function getPriceInToken(uint256 _amountShares, bytes memory path) external returns (uint256) {
        uint256 amountOut = _amountShares * price;
        return IQuoter(quoter).quoteExactOutput(path, amountOut);
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

    function buyWithETH(uint256 _amountShares) external payable {
        require(msg.value > 0, "Must pass non 0 ETH amount");

        address tokenIn = WETH9;
        address tokenOut = DAI;
        uint24 fee = 3000;
        address recipient = msg.sender;
        uint256 deadline = block.timestamp;
        uint256 amountOut = _amountShares * price;
        uint256 amountInMaximum = msg.value;
        uint160 sqrtPriceLimitX96 = 0;

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams(
            tokenIn,
            tokenOut,
            fee,
            recipient,
            deadline,
            amountOut,
            amountInMaximum,
            sqrtPriceLimitX96
        );

        (uint256 success) = ISwapRouter(router).exactOutputSingle{value: msg.value }(params);
        ISwapRouter(router).refundETH();
        require(success >= this.getPriceInETH(_amountShares), "Not enough ethers to buy shares");
        shares.transfer(msg.sender, _amountShares);
    }

    function buyWithToken(uint256 _amountShares, address _tokenAddress) external {
        IERC20 token = IERC20(_tokenAddress);

        uint24 poolFee = 3000;
        bytes memory path = abi.encodePacked(_tokenAddress, poolFee, DAI);
        address recipient = msg.sender;
        uint256 deadline = block.timestamp;
        uint256 amountOut = _amountShares * price;
        uint256 amountInMaximum = _amountShares * price;

        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams(
            path,
            recipient,
            deadline,
            amountOut,
            amountInMaximum
        );

        uint256 amountIn = ISwapRouter(router).exactOutput(params);

        require(amountIn >= this.getPriceInToken(_amountShares, path), "Not enough ethers to buy shares");

        token.transferFrom(msg.sender, address(this), _amountShares);
        shares.transfer(msg.sender, _amountShares);
    }

    function sellForBaseCurrency(uint256 _amountShares) external {
        uint256 daiAmount = price * _amountShares;
        shares.transferFrom(msg.sender, address(this), _amountShares);
        currency.transfer(msg.sender, daiAmount);
        userToSharesCount[msg.sender] -= _amountShares;
    }

    function sellForWETH(uint256 _amountShares) external {
        uint256 daiAmount = price * _amountShares;
        uint256 WETHAmount = this.getPriceInETH(_amountShares);
        IERC20 WETH = IERC20(WETH9);
        shares.transferFrom(msg.sender, address(this), _amountShares);
        WETH.transfer(msg.sender, WETHAmount);
    }

    function withdrawShares(uint256 _amountShares, address _recipient) external onlyOwner {
        shares.transfer(_recipient, _amountShares);
    }
    
    function withdrawETH(address _recipient) external payable onlyOwner {
        (bool sent, bytes memory data) = _recipient.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
    }

    function withdrawToken(address _token, address _recipient) external onlyOwner {
        IERC20 token = IERC20(_token);
        token.transfer(_recipient, address(this).balance);
    }

    receive() payable external {}
}
