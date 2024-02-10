import { getNamedAccounts, deployments } from "hardhat";
import { verify } from "../helpers/verify";

const CONTRACT_NAME = "NFTMarketplaceV2";

async function deployFunction() {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const contract = await deploy(CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: [],
    waitConfirmations: 6,
  });
  console.log(`${CONTRACT_NAME} deployed at: ${contract.address}`);
  await verify(contract.address, []);
}

deployFunction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
