const { ethers, waffle } = require("hardhat");
    
describe("Broker", function () {

    it("Should have correct base currency", async () => {

        const Broker = await ethers.getContractFactory("Broker");
        const broker = await Broker.deployed();
        const base = await broker.getBaseCurrency();
        console.log("Base " + base);        
    });

});