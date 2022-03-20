const { ethers, deployments, getNamedAccounts } = require("hardhat");

module.exports = async function deployShares(shareName, shareSymbol, shareTerms) {
    const { deploy } = deployments;
    const { deployer, owner } = await getNamedAccounts();
    const feeData = await ethers.provider.getFeeData();
  
    const { address } = await deploy("Shares", {
        contract: "Shares",
        from: deployer,
        args: [shareName, shareSymbol, shareTerms, owner],
        log: true,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: feeData.maxFeePerGas
    });

    return address;
};

module.exports.tags = ['Shares'];