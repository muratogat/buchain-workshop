const { network, ethers } = require("hardhat");

/*

// Mints any ERC20 token to given accounts by impersonating its minter address
async function mintERC20(forceSend, erc20Contract, minterAddress, accounts){
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [minterAddress],
  });
  const signer = await ethers.provider.getSigner(minterAddress);
  await forceSend.send(minterAddress, {value: ethers.utils.parseEther("2")});
  for (let i = 0; i < 5; i++) {
    await erc20Contract.connect(signer).mint(accounts[i], ethers.utils.parseEther("10000000"));
    //console.log("account %s chf %s", accounts[i], await baseCurrency.balanceOf(accounts[i]));
  }
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [minterAddress],
  });
}
*/

// Sets balance of an address in an ERC20 contract by modifying the balance storage on a byte level
// Only possible on testnet. For more information : https://kndrck.co/posts/local_erc20_bal_mani_w_hh/
async function setBalance(erc20Contract, slot, accounts) {
  const locallyManipulatedBalance = ethers.utils.parseEther("100000000");
  const newFormattedBalance = toBytes32(locallyManipulatedBalance).toString();

  for (let i = 0; i < accounts.length ; i++) {
    // Get storage slot index. Note that index starting with 0 must be stripped.
    const index = ethers.utils.hexStripZeros(
      ethers.utils.solidityKeccak256(
        ["uint256", "uint256"],
        [accounts[i], slot] // key, slot
      )
    );

    // Manipulate local balance (needs to be bytes32 string)
    await setStorageAt(
      erc20Contract.address,
      index.toString(),
      newFormattedBalance
    );
  }
};

// Utility function for setBalance
const setStorageAt = async (address, index, value) => {
  await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await ethers.provider.send("evm_mine", []); // Just mines to the next block
};

// Utility function for setBalance
const toBytes32 = (bn) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

/*
// Sends "amount" ether from the signer to the given address
async function sendEther(signer, to, amount) {
  const tx = await signer.sendTransaction({
    to: to,
    value: ethers.utils.parseEther(amount)
  });
  await tx.wait();
}
*/

module.exports = { setBalance };
