// SPDX-License-Identifier: MIT
// Prepared for BUchain Workshop by Murat Ögat

pragma solidity ^0.8.0;

import "../ERC20/IERC20.sol";

interface IBroker {

    /**
     * @dev Returns the share token to be sold by this contract
     */
    function getShares() external view returns (IERC20);

    /**
     * @dev Returns the currency token used when buying or selling shares
     */
    function getBaseCurrency() external view returns (IERC20);

    /**
     * @dev Returns the current price of shares 
     */
    function getPriceInBaseCurrency() external view returns (uint256);

    /**
     * @dev Sets the share price. Only the contract owner should be able to call this method.
     */
    function setPriceInBaseCurrency(uint256 _price) external;

    /**
     * @dev Returns the share price for payments that will be done in ETH.
     */
    function getPriceInETH() external view returns (uint256);

    /**
     * @dev Returns the share price for payments that will be done in any currency that can be converted to the base currency over Uniswap.
     */
    function getPriceInToken(address _tokenAddress) external view returns (uint256);

    /**
     * @dev Executes a trade for Shares <-> BaseCurrency at the current price, 
            - Transferring baseCurrency from buyer to the Broker 
            - Transferring shares from the Broker to the buyer.
            IT IS ASSUMED THAT THE BROKER HAS AN ALLOWANCE TO MOVE BASECURRENCY OF THE BUYER BEFORE THIS METHOD IS CALLED
     */
    function buyWithBaseCurrency(uint256 _amountShares) external;

    /**
     * @dev Executes a trade for Shares <-> ETH at the current price, 
            - Converting ETH to baseCurrency over Uniswap while receiving the payment
            - Transferring shares from the Broker to the buyer.
     */
    function buyWithETH(uint256 _amountShares) external;

    /**
     * @dev Executes a trade for Shares <-> Any Token at the current price, 
            - Converting Any Token to baseCurrency over Uniswap while receiving the payment
            - Transferring shares from the Broker to the buyer.
            IT IS ASSUMED THAT THE BROKER HAS AN ALLOWANCE TO MOVE THE GIVEN TOKEN OF THE BUYER BEFORE THIS METHOD IS CALLED
     */
    function buyWithToken(uint256 _amountShares, address _tokenAddress) external;

    /**
     * @dev Executes a trade for Shares <-> BaseCurrency at the current price, 
            - Transferring shares from the seller to the Broker 
            - Transferring baseCurrency from the Broker to the seller.
            IT IS ASSUMED THAT THE BROKER HAS AN ALLOWANCE TO MOVE SHARES OF THE SELLER BEFORE THIS METHOD IS CALLED
     */
    function sellForBaseCurrency(uint256 _amountShares) external;

    /**
     * @dev Executes a trade for Shares <-> ETH at the current price, 
            - Transferring shares from the seller to the Broker.
            - Converting baseCurrency to WETH over Uniswap while sending the payment
     */
    function sellForWETH(uint256 _amountShares) external;

    /**
     * @dev Allows owner to withdraw shares from the Broker to any address
     */
    function withdrawShares(uint256 _amountShares, address _recipient) external;

    /**
     * @dev Allows owner to withdraw Ether from the Broker to any address
            This scenario would only be possible if some ETH was accidentally sent to the contract.
            The Broker normally does not receive any ETH. It converts incoming ETH to baseCurrency automatically during purchases.
     */
    function withdrawETH(address _recipient) external;

    /**
     * @dev Allows owner to withdraw any token from the Broker to any address
            This scenario would only be possible if some tokens were accidentally sent to the contract.
            The Broker normally does not receive any tokens. It converts incoming tokens to baseCurrency automatically during purchases.
     */
    function withdrawToken(address _token, address _recipient) external;
}