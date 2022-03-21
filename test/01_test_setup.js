// This script sets up the test environment after contracts are deployed

// Shared Config
const config = require("../scripts/config.js");
const { setBalance } = require("../scripts/utilities.js");

// Libraries
const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");
const BN = require("bn.js");

// Deployments
const deployShares = require("../deploy/01_deploy_shares.js");
const deployBroker = require("../deploy/02_deploy_broker.js");

// Constants


describe("Setup", function () {

    let shareName = config.shareName;
    let shareSymbol = config.shareSymbol;
    let shareTerms = config.shareTerms;
    let sharePrice = config.sharePrice;
    let currencyAddress = config.daiAddress;
    let shareAddress;
    let brokerAddress;

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


  /*
describe("Setup", () => {
    
    

    const provider = waffle.provider;
  let accounts;

  // do all set
  before(async function () {
    accounts =  await getUnnamedAccounts();
    await deployShares(ethers, deployments, getNamedAccounts);
   });

  /*
  it("should have some BaseCurrency in first 5 accounts", async () => {
    for (let i = 0; i < 5; i++) {
      const balance = await baseCurrency.balanceOf(accounts[i]);
      assert(!balance.isZero(), "Balance is 0");
    }
  });

  it("should have some Shares in first 5 accounts", async () => {
    for (let i = 0; i < 5; i++) {
      const balance = await shares.balanceOf(accounts[i]);
      assert(!balance.isZero(), "Balance is 0");
    }
  });

  it("should have some DraggableShares in first 5 accounts", async () => {
    for (let i = 0; i < 5; i++) {
      const balance = await draggableShares.balanceOf(accounts[i]);
      assert(!balance.isZero());
    }
  });

  it("should have DraggableShares and BaseCurrency deposited into the Brokerbot", async () => {
    const tokenBalance = await draggableShares.balanceOf(brokerbot.address);
    const baseBalance = await baseCurrency.balanceOf(brokerbot.address);
    assert(!tokenBalance.isZero() && !baseBalance.isZero());
  });
  
});
*/
