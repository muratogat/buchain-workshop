# BUchain Share Broker Contract Workshop

## General Architecture
<img src="https://github.com/muratogat/buchain-workshop/blob/main/readme/BrokerContract.png">

## Roles
- **Owner** : The address that has administrative priviledges over the Broker contract. Note that this is not the same as the deployer address, since the initial owner is specified while deploying the contract.
- **Buyer / Seller** : Public users who can interact with the contract to buy or sell Shares in form of ERC20 tokens

## Contracts
- **Broker.sol** : The contract to be developed in this workshop
- **Shares.sol** : An ERC20 token contract, where each token represents shares of the company who deployed it.
- **DAI contract** : Existing contract that is controlling the DAI stablecoin ownership and transfers
- **Uniswap V3 ETH-DAI Pair** : Contract used to automatically convert payment to DAI.

## Use Cases
- The owner should be able to deposit liquidity in form of Shares and DAI to the Broker
- The owner should be able to withdraw liquidity in form of Shares and DAI from the Broker
- The owner should be able to set the price at which the Shares will be sold through the Broker
- The owner should be able to retrieve ETH or any ERC20 token sent accidentally to the Broker contract
- Users should be able to buy Shares through the Broker by making payments using DAI
- Users should be able to buy Shares through the Broker by making payments using ETH
- (Advanced) Users should be able to buy Shares through the Broker by making payments using any currency that can be converted to DAI using some conversion path on Uniswap.
- Users should be able to sell back Shares to the Broker, receiving DAI in return.
- Users should be able to sell back Shares to the Broker, receiving ETH in return.

## Assumptions

- When buying with DAI (or other ERC20 token), it is assumed that a prior "Allowance" was given to the Broker contract to move DAI of the Buyer address.
- When selling Shares, it is assumed that a prior "Allowance" was given to the Broker to move Shares of the Seller address.

It is possible to check and ensure these conditions in the UI that would be built on top of the Broker contract. For example, the user may be asked to give the necessary allowance before being allowed to call buying methods. Alternative methods also to be discussed in the workshop.

# Setup

1. npm is package manager used in the project setup. Download and install it if it's not already found in your system.
2. Clone the repo to a local folder
3. Run "npm install" in that folder, which should successfully download and install all dependencies in package.json, such as hardhat, ethers, chai, etc.
4. Run "npx hardhat compile" which should be able to successfully compile existing contracts in /contracts folder
5. Running "npx hardhat test" should run tests in the /test folder in alphabetical order. 