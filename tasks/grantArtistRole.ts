import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";

task("grantArtistRole", "Grants the artist role to a user")
  .addParam("marketplace", "The address of the NFTMarketplace contract")
  .addParam("to", "The address of the user to grant the role to")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const marketplace: NFTMarketplaceV2 = <NFTMarketplaceV2>(
        await hre.ethers.getContractAt(
          "NFTMarketplaceV2",
          taskArgs.marketplace as string
        )
      );
      const to: string = taskArgs.to as string;

      await marketplace.grantArtistRole(to);

      console.log(`Artist role granted to ${to}`);
    }
  );
