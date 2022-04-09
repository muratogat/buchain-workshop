// This script sets up the test environment after contracts are deployed

// Shared Config
const config = require("../scripts/config.js");
const { setBalance } = require("../scripts/utilities.js");

// Libraries
const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");
const provider = waffle.provider;

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
      await DAI.connect(signers[i]).approve(brokerAddress, ethers.utils.parseEther("1000000"));
      const allowance = await DAI.allowance(signers[i].address, brokerAddress); 
      expect(allowance).to.not.be.equal(0);
    }
  });

  it("Should have allowance to spend SHARES of signers", async () => {
    const signers = await ethers.getSigners();
    const SHARES = await ethers.getContractAt("Shares", currencyAddress);
    for (let i = 0; i < signers.length ; i++) {
      await SHARES.connect(signers[i]).approve(brokerAddress, ethers.utils.parseEther("1000000"));
      const allowance = await SHARES.allowance(signers[i].address, brokerAddress); 
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
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const amountShares = BigNumber.from("50");

    // Balances before
    const signerBalanceETHBefore = await provider.getBalance(signer1.address);
    const signerBalanceSharesBefore = await shares.balanceOf(signer1.address);
    const brokerBalanceETHBefore = await provider.getBalance(brokerAddress);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    // Execute purchase
    const options = {value: 5}
    await broker.connect(signer1).buyWithETH(amountShares, options);
    
    // Balances after
    const signerBalanceETHAfter = await provider.getBalance(signer1.address);
    const signerBalanceSharesAfter = await shares.balanceOf(signer1.address);
    const brokerBalanceETHAfter = await provider.getBalance(brokerAddress);
    const brokerBalanceSharesAfter = await shares.balanceOf(brokerAddress);
    
    // Check for sanity
    expect(signerBalanceETHBefore.sub(totalETH)).to.be.equal(signerBalanceETHAfter);
    expect(signerBalanceSharesBefore.add(amountShares)).to.be.equal(signerBalanceSharesAfter);
    expect(brokerBalanceETHBefore.add(totalETH)).to.be.equal(brokerBalanceETHAfter);
    expect(brokerBalanceSharesBefore.sub(amountShares)).to.be.equal(brokerBalanceSharesAfter);
  });

  it("Should let users sell Shares against DAI", async () => {
    const [deployer, owner, signer1] = await ethers.getSigners();
    const DAI = await ethers.getContractAt("ERC20", currencyAddress);
    const broker = await ethers.getContractAt("Broker", brokerAddress);
    const shares = await ethers.getContractAt("Shares", shareAddress);
    const amountShares = BigNumber.from("70");
    const totalPrice = (await broker.getPriceInBaseCurrency()).mul(amountShares);

    await DAI.connect(signer1).approve(brokerAddress, ethers.utils.parseEther("1000000"));
    await shares.connect(signer1).approve(brokerAddress, ethers.utils.parseEther("1000000"));

    await broker.connect(signer1).buyWithBaseCurrency(amountShares);

    // Balances before
    const signerBalanceDaiBefore = await DAI.balanceOf(signer1.address);
    const signerBalanceSharesBefore = await shares.balanceOf(signer1.address);
    const brokerBalanceDaiBefore = await DAI.balanceOf(brokerAddress);
    const brokerBalanceSharesBefore = await shares.balanceOf(brokerAddress);

    // Execute purchase and sell
    await broker.connect(signer1).sellForBaseCurrency(amountShares);
    
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

  it("Should let users sell Shares against ETH", async () => {
    
  });

  it("Should let owner withdraw Shares", async () => {
    
  });

  it("Should let owner withdraw DAI", async () => {
    
  });

  it("Should let owner withdraw ETH", async () => {
    
  });

  it("Should let owner withdraw any ERC20 Token", async () => {
    
  });

});