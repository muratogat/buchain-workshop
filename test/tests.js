// This script sets up the test environment after contracts are deployed

// Shared Config
const config = require("../scripts/config.js");
const { setBalance } = require("../scripts/utilities.js");

// Libraries
const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");

// Deployments
const deployShares = require("../deploy/01_deploy_shares.js");
const deployBroker = require("../deploy/02_deploy_broker.js");
const { BigNumber } = require("ethers");

// Variables
let shareName = config.shareName;
let shareSymbol = config.shareSymbol;
let shareTerms = config.shareTerms;
let sharePrice = config.sharePrice;
let currencyAddress = config.daiAddress;
let uniswapQuoterAddress = config.uniswapQuoterAddress;
let shareAddress;
let brokerAddress;

describe("Setup", function () {

  it("Should have some ETH in test accounts", async () => {
    const accounts = await ethers.getSigners();
    for (let i = 0; i < accounts.length ; i++) {
        const address = await accounts[i].getAddress();
        const balance = await waffle.provider.getBalance(address);
        expect(balance).to.not.be.equal(0);
    }
  });

  it("Should have some DAI in test accounts", async () => {
    const DAI = await ethers.getContractAt("ERC20", config.daiAddress);
    const accountAddresses = (await ethers.getSigners()).map(signer => signer.address);
    await setBalance(DAI, config.daiBalanceSlot, accountAddresses);
    for (let i = 0; i < accountAddresses.length ; i++) {
        const balance = await DAI.balanceOf(accountAddresses[i]);
        expect(balance).to.not.be.equal(0);
    }
  });

  it("Should deploy the Shares contract", async () => {
    shareAddress = await deployShares(shareName, shareSymbol, shareTerms);
    console.log("      Shares contract successfully deployed to:", shareAddress);
    expect(shareAddress).to.not.be.undefined;
  });

  it("Should deploy the Broker contract", async () => {
    brokerAddress = await deployBroker(shareAddress, sharePrice, currencyAddress);
    console.log("      Broker contract successfully deployed to:", brokerAddress);
    expect(brokerAddress).to.not.be.undefined;
  });

});

describe("Shares", function () {
  it("Should have correct owner", async () => {
    const [deployer, owner] = await ethers.getSigners();
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const ownerAddress = await shares.owner();
    expect(ownerAddress).to.be.equal(owner.address);
  });

  it("Should mint 1000 shares to the owner", async () => {
    const [deployer, owner] = await ethers.getSigners();
    const shares = await ethers.getContractAt("Shares", shareAddress);
    await shares.connect(owner).mint(owner.address, 1000);
    const ownerBalance = await shares.balanceOf(owner.address); 
    expect(ownerBalance).to.be.equal(1000);
  });

  it("Should mint 1000 shares to signers", async () => {
    const [deployer, owner] = await ethers.getSigners();
    const signerAddresses = (await ethers.getSigners()).map(signer => signer.address);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    for (let i = 0; i < signerAddresses.length ; i++) {
      await shares.connect(owner).mint(signerAddresses[i], 1000);
      const signerBalance = await shares.balanceOf(signerAddresses[i]); 
      expect(signerBalance).to.not.be.equal(0);
    }
  });
});


describe("Broker", function () {

  it("Should have correct base currency", async () => {
    const brokerContract = await ethers.getContractAt("Broker", brokerAddress);
    const baseCurrency = await brokerContract.getBaseCurrency();
    expect(baseCurrency).to.be.equal(currencyAddress);
  });

  it("Should have correct shares to sell", async () => {
    const brokerContract = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await brokerContract.getShares();
    expect(shares).to.be.equal(shareAddress);
  });

  it("Should have correct price", async () => {
    const brokerContract = await ethers.getContractAt("Broker", brokerAddress);
    const price = await brokerContract.getPriceInBaseCurrency();
    expect(price).to.be.equal(sharePrice);
  });

  it("Should receive 1000 shares from owner", async () => {
    const [deployer, owner] = await ethers.getSigners();
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const balanceBefore = await shares.balanceOf(brokerAddress);
    await shares.connect(owner).transfer(brokerAddress, 1000);
    const balanceAfter = await shares.balanceOf(brokerAddress);
    expect(balanceAfter - balanceBefore).to.be.equal(1000);
  });

  it("Should receive some DAI from owner", async () => {
    const [deployer, owner] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    await DAI.connect(owner).transfer(brokerAddress, ethers.utils.parseEther("10000"));
    const daiBalanceBroker = await DAI.balanceOf(brokerAddress);
    expect(daiBalanceBroker).not.to.be.equal(0);
  });

  it("Should have allowance to spend DAI of signers", async () => {
    const signers = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    for (let i = 0; i < signers.length ; i++) {
      await DAI.connect(signers[i]).approve(brokerAddress, ethers.utils.parseEther("10000"));
      const allowance = await DAI.allowance(signers[i].address, brokerAddress); 
      expect(allowance).to.not.be.equal(0);
    }
  });

  it("Should have allowance to spend Shares of signers", async () => {
    const signers = await ethers.getSigners();
    const shares = await ethers.getContractAt("Shares", shareAddress);
    for (let i = 0; i < signers.length ; i++) {
      await shares.connect(signers[i]).approve(brokerAddress, ethers.utils.parseEther("10000"));
      const allowance = await shares.allowance(signers[i].address, brokerAddress); 
      expect(allowance).to.not.be.equal(0);
    }
  });

  it("Should let users buy Shares using DAI", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const amountShares = BigNumber.from("50");
    const totalPrice = (await broker.getPriceInBaseCurrency()).mul(amountShares);

    // Balances before
    const signerBalanceDaiBefore = await DAI.balanceOf(signer1.address);
    const signerBalanceSharesBefore = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiBefore = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    // Execute purchase
    broker.connect(signer1).buyWithBaseCurrency(amountShares);
    
    // Balances after
    const signerBalanceDaiAfter = await DAI.balanceOf(signer1.address);
    const signerBalanceSharesAfter = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiAfter = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesAfter = await shares.balanceOf(brokerAddress);
    
    // Check for sanity
    expect(signerBalanceDaiBefore.sub(totalPrice)).to.be.equal(signerBalanceDaiAfter);
    expect(signerBalanceSharesBefore.add(amountShares)).to.be.equal(signerBalanceSharesAfter);
    expect(brokerBalanceDaiBefore.add(totalPrice)).to.be.equal(brokerBalanceDaiAfter);
    expect(brokerBalanceSharesBefore.sub(amountShares)).to.be.equal(brokerBalanceSharesAfter);
  });

  it("Should let users buy Shares using ETH", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const amountShares = BigNumber.from("50");
    const totalPriceBase = await broker.getPrice(amountShares);
    const totalPriceETH = await broker.connect(signer1).callStatic.getPriceInETH(amountShares);

    // Balances before
    const signerBalanceETHBefore = await waffle.provider.getBalance(signer1.address);
    const signerBalanceSharesBefore = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiBefore = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    // Execute purchase
    const tx = await broker.connect(signer1).buyWithETH(amountShares, { value: totalPriceETH });
    const txReceipt = await tx.wait();
    const gasUsed = ethers.utils.parseUnits(txReceipt.gasUsed.toString(), "gwei")

    // Balances after
    const signerBalanceETHAfter = await waffle.provider.getBalance(signer1.address);
    const signerBalanceSharesAfter = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiAfter = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesAfter = await shares.balanceOf(brokerAddress);
    
    // Check for sanity
    expect(signerBalanceETHBefore.sub(totalPriceETH).sub(gasUsed)).to.be.equal(signerBalanceETHAfter);
    expect(signerBalanceSharesBefore.add(amountShares)).to.be.equal(signerBalanceSharesAfter);
    expect(brokerBalanceDaiBefore.add(totalPriceBase)).to.be.equal(brokerBalanceDaiAfter);
    expect(brokerBalanceSharesBefore.sub(amountShares)).to.be.equal(brokerBalanceSharesAfter);
  });

  it("Should let users sell Shares against DAI", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const amountShares = BigNumber.from("50");
    const totalPrice = (await broker.getPriceInBaseCurrency()).mul(amountShares);

    // Balances before
    const signerBalanceDaiBefore = await DAI.balanceOf(signer1.address);
    const signerBalanceSharesBefore = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiBefore = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    // Execute sale
    broker.connect(signer1).sellForBaseCurrency(amountShares);
    
    // Balances after
    const signerBalanceDaiAfter = await DAI.balanceOf(signer1.address);
    const signerBalanceSharesAfter = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiAfter = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesAfter = await shares.balanceOf(brokerAddress);
    
    // Check for sanity
    expect(signerBalanceDaiBefore.add(totalPrice)).to.be.equal(signerBalanceDaiAfter);
    expect(signerBalanceSharesBefore.sub(amountShares)).to.be.equal(signerBalanceSharesAfter);
    expect(brokerBalanceDaiBefore.sub(totalPrice)).to.be.equal(brokerBalanceDaiAfter);
    expect(brokerBalanceSharesBefore.add(amountShares)).to.be.equal(brokerBalanceSharesAfter);
  });

  it("Should let users sell Shares against WETH", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    const quoter = await ethers.getContractAt("IQuoter", uniswapQuoterAddress);
    const WETHaddress = await quoter.WETH9();
    const WETH = await ethers.getContractAt("ERC20", WETHaddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const amountShares = BigNumber.from("50");
    const totalPriceBase = await broker.getPrice(amountShares);
    const totalPriceWETH = await quoter.connect(signer1).callStatic.quoteExactInputSingle(currencyAddress, WETHaddress, 3000, totalPriceBase, 0);

    // Balances before
    const signerBalanceWETHBefore = await WETH.balanceOf(signer1.address);
    const signerBalanceSharesBefore = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiBefore = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    // Execute purchase
    const tx = await broker.connect(signer1).sellForWETH(amountShares);
    const txReceipt = await tx.wait();
    const gasUsed = ethers.utils.parseUnits(txReceipt.gasUsed.toString(), "gwei")

    // Balances after
    const signerBalanceWETHAfter = await WETH.balanceOf(signer1.address);
    const signerBalanceSharesAfter = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiAfter = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesAfter = await shares.balanceOf(brokerAddress);
    
    // Check for sanity
    expect(signerBalanceWETHBefore.add(totalPriceWETH)).to.be.equal(signerBalanceWETHAfter);
    expect(signerBalanceSharesBefore.sub(amountShares)).to.be.equal(signerBalanceSharesAfter);
    expect(brokerBalanceDaiBefore.sub(totalPriceBase)).to.be.equal(brokerBalanceDaiAfter);
    expect(brokerBalanceSharesBefore.add(amountShares)).to.be.equal(brokerBalanceSharesAfter);
  });

  it("Should let owner withdraw Shares", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const amountShares = BigNumber.from("50");
    
    const ownerBalanceSharesBefore = await shares.balanceOf(owner.address);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    await broker.connect(owner).withdrawShares(owner.address, amountShares);

    const ownerBalanceSharesAfter = await shares.balanceOf(owner.address);
    const brokerBalanceSharesAfter = await shares.balanceOf(brokerAddress);

    expect(ownerBalanceSharesBefore.add(amountShares)).to.be.equal(ownerBalanceSharesAfter);
    expect(brokerBalanceSharesBefore.sub(amountShares)).to.be.equal(brokerBalanceSharesAfter);    
  });

  it("Should let owner withdraw DAI", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const amountCurrency = ethers.utils.parseEther("500")
    
    const ownerBalanceCurrencyBefore = await DAI.balanceOf(owner.address);
    const brokerBalanceCurrencyBefore = await DAI.balanceOf(brokerAddress);

    await broker.connect(owner).withdrawCurrency(owner.address, amountCurrency);

    const ownerBalanceCurrencyAfter = await DAI.balanceOf(owner.address);
    const brokerBalanceCurrencyAfter = await DAI.balanceOf(brokerAddress);

    expect(ownerBalanceCurrencyBefore.add(amountCurrency)).to.be.equal(ownerBalanceCurrencyAfter);
    expect(brokerBalanceCurrencyBefore.sub(amountCurrency)).to.be.equal(brokerBalanceCurrencyAfter);    
  });

  it("Should let owner withdraw ETH", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const amountETH = ethers.utils.parseEther("25")

    // Send some ETH to Broker first
    await signer1.sendTransaction({ to: brokerAddress, value: ethers.utils.parseEther("50") })
    
    const ownerBalanceETHBefore = await waffle.provider.getBalance(owner.address);
    const brokerBalanceETHBefore = await waffle.provider.getBalance(brokerAddress);

    const tx = await broker.connect(owner).withdrawETH(owner.address, amountETH);
    const txReceipt = await tx.wait();
    const gasUsed = ethers.utils.parseUnits(txReceipt.gasUsed.toString(), "gwei")

    const ownerBalanceETHAfter = await waffle.provider.getBalance(owner.address);
    const brokerBalanceETHAfter = await waffle.provider.getBalance(brokerAddress);

    expect(ownerBalanceETHBefore.add(amountETH).sub(gasUsed)).to.be.equal(ownerBalanceETHAfter);
    expect(brokerBalanceETHBefore.sub(amountETH)).to.be.equal(brokerBalanceETHAfter); 
  });
});