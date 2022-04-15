// SPDX-License-Identifier: MIT
// Prepared for BUchain Workshop by Murat Ögat

pragma solidity ^0.8.0;

import "./IBroker.sol";
import "../Utils/Ownable.sol";
import "../ERC20/IERC20.sol";
import "../Utils/IUniswapV3.sol";

contract Broker is IBroker, Ownable {

    IERC20 private immutable currency;
    IERC20 private immutable shares;
    uint256 private price;
    
    IQuoter private immutable uniswapQuoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
    ISwapRouter private immutable uniswapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    uint24 private constant UNISWAP_POOL_FEE_TIER = 3000;

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

    function getPrice(uint256 _amountShares) public view returns (uint256) {
        return price * _amountShares;
    }

    function getPriceInETH(uint256 _amountShares) public returns (uint256) {
        uint256 amountInBase = getPrice(_amountShares);
        return uniswapQuoter.quoteExactOutputSingle(uniswapQuoter.WETH9(), address(currency), UNISWAP_POOL_FEE_TIER, amountInBase, 0);
    }

    function getPriceInToken(uint256 _amountShares, bytes memory path) external returns (uint256) {
        uint256 amountInBase = getPrice(_amountShares);
        return uniswapQuoter.quoteExactOutput(path, amountInBase);
    }

    function buyWithBaseCurrency(uint256 _amountShares) external {
        uint256 totalPrice = getPrice(_amountShares);
        currency.transferFrom(msg.sender, address(this), totalPrice);
        shares.transfer(msg.sender, _amountShares);
    }

    function buyWithETH(uint256 _amountShares) external payable {
        uint256 totalPriceBase = getPrice(_amountShares);

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams(
            uniswapQuoter.WETH9(), 
            address(currency), 
            UNISWAP_POOL_FEE_TIER, 
            address(this), 
            block.timestamp,
            totalPriceBase, 
            msg.value, 
            0
        );

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        uint256 amountIn = uniswapRouter.exactOutputSingle{value: msg.value}(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender
        if (amountIn < msg.value) {
            uniswapRouter.refundETH();
            payable(msg.sender).transfer(msg.value - amountIn);
        }

        shares.transfer(msg.sender, _amountShares);
    }

    function buyWithToken(uint256 _amountShares, address _tokenAddress, uint256 _amountInMaximum) external {
        uint256 totalPriceBase = getPrice(_amountShares);
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amountInMaximum);
        IERC20(_tokenAddress).approve(address(uniswapRouter), _amountInMaximum);

        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams({
            path: abi.encodePacked(currency, UNISWAP_POOL_FEE_TIER, uniswapQuoter.WETH9(), UNISWAP_POOL_FEE_TIER, _tokenAddress),
            recipient: msg.sender,
            deadline: block.timestamp,
            amountOut: totalPriceBase,
            amountInMaximum: _amountInMaximum
        });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        uint256 amountIn = uniswapRouter.exactOutput(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender
        if (amountIn < _amountInMaximum) {
            IERC20(_tokenAddress).transfer(msg.sender, _amountInMaximum - amountIn);
        }

        shares.transfer(msg.sender, _amountShares);
    }

    function buyWithTokenPath(uint256 _amountShares, address _tokenAddress, bytes calldata path, uint256 _amountInMaximum) external {
        uint256 totalPriceBase = getPrice(_amountShares);
        uint256 balanceBefore = IERC20(currency).balanceOf(address(this));
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amountInMaximum);
        IERC20(_tokenAddress).approve(address(uniswapRouter), _amountInMaximum);

        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams({
            path: path,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountOut: totalPriceBase,
            amountInMaximum: _amountInMaximum
        });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        uint256 amountIn = uniswapRouter.exactOutput(params);
        uint256 balanceAfter = IERC20(currency).balanceOf(address(this));

        require(totalPriceBase == (balanceAfter - balanceBefore), "Failed to receive base");

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender
        if (amountIn < _amountInMaximum) {
            IERC20(_tokenAddress).transfer(msg.sender, _amountInMaximum - amountIn);
        }

        shares.transfer(msg.sender, _amountShares);
    }

    function sellForBaseCurrency(uint256 _amountShares) external {
        uint256 totalPrice = getPrice(_amountShares);
        shares.transferFrom(msg.sender, address(this), _amountShares);
        currency.transfer(msg.sender, totalPrice);
    }

    function sellForWETH(uint256 _amountShares) external {
        shares.transferFrom(msg.sender, address(this), _amountShares);

        uint256 totalPriceBase = getPrice(_amountShares);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            address(currency), 
            uniswapQuoter.WETH9(), 
            UNISWAP_POOL_FEE_TIER, 
            msg.sender, 
            block.timestamp,
            totalPriceBase, 
            0, 
            0
        );
        
        currency.approve(address(uniswapRouter), totalPriceBase);
        uniswapRouter.exactInputSingle(params);
    }

    function withdrawShares(address _recipient, uint256 _amount) external onlyOwner {
        withdrawToken(address(shares), _recipient, _amount);
    }

    function withdrawCurrency(address _recipient, uint256 _amount) external onlyOwner {
        withdrawToken(address(currency), _recipient, _amount);
    }

    function withdrawToken(address _token, address _recipient, uint256 _amount) public onlyOwner {
        IERC20(_token).transfer(_recipient, _amount);
    }
    
    function withdrawETH(address _recipient, uint256 _amount) external onlyOwner {
        payable(_recipient).transfer(_amount);
    }

    receive() external payable {}
}