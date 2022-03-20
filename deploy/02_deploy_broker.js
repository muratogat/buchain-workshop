const { ethers, deployments, getNamedAccounts } = require("hardhat");
const config = require("../scripts/config.js");

module.exports = async function deployBroker(sharesAddress, sharePrice, currencyAddress) {
    const { deploy } = deployments;
    const { deployer, owner } = await getNamedAccounts();
    const feeData = await ethers.provider.getFeeData();
  
    const { address } = await deploy("Broker", {
        contract: "Broker",
        from: deployer,
        args: [sharesAddress, sharePrice, currencyAddress, owner],
        log: true,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: feeData.maxFeePerGas
    });

    return address;
};

module.exports.tags = ['Broker'];