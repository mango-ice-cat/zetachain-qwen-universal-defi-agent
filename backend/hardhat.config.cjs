require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const { ZETACHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    zetachain_testnet: {
      url: ZETACHAIN_RPC_URL || "",
      chainId: 7001,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};
