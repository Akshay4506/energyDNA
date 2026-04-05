import "@nomicfoundation/hardhat-toolbox";
/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris"
    }
  },
  networks: {
    hardhat: {
      chainId: 1335
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1335
    }
  }
};
