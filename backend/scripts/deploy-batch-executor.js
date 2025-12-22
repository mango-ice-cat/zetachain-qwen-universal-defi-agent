const { ethers } = require("hardhat");

const DEFAULT_ROUTER = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";
const DEFAULT_GATEWAY = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";

async function main() {
  const router = process.env.ZETASWAP_ROUTER || DEFAULT_ROUTER;
  const gateway = process.env.ZETACHAIN_GATEWAY || DEFAULT_GATEWAY;

  if (!ethers.isAddress(router) || !ethers.isAddress(gateway)) {
    throw new Error("Invalid router or gateway address");
  }

  const Factory = await ethers.getContractFactory("ZetaBatchExecutor");
  const contract = await Factory.deploy(router, gateway);
  await contract.waitForDeployment();

  console.log("ZetaBatchExecutor deployed at:", await contract.getAddress());
  console.log("router:", router);
  console.log("gateway:", gateway);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
