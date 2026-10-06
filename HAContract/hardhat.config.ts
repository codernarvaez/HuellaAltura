import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

// Nunca se escriben claves en el repo: todo se lee del entorno (.env local o secretos de CI).
const accounts = [
  process.env.DEPLOYER_PRIVATE_KEY,
  process.env.FARMER_PRIVATE_KEY,
  process.env.PROCESSOR_PRIVATE_KEY,
  process.env.GRADER_PRIVATE_KEY,
  process.env.EXPORTER_PRIVATE_KEY,
].filter((k): k is string => Boolean(k));

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://polygon-amoy-bor-rpc.publicnode.com",
      chainId: 80002,
      accounts,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com",
      chainId: 137,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // Etherscan API v2: una sola clave sirve para Amoy (80002) y Polygon (137).
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
  sourcify: { enabled: false },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    token: "POL",
  },
  typechain: { outDir: "typechain-types", target: "ethers-v6" },
};

export default config;
