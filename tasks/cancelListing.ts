import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("cancelListing", "Cancels a listing")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID")
  .addParam("tokenId", "The ID of the listed token")
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

      const collectionId: BigNumber = taskArgs.collectionId;
      const tokenId: BigNumber = taskArgs.tokenId;

      await marketplace.cancelListing(collectionId, tokenId);

      const filter = marketplace.filters.ListingCanceled();
      const events = await marketplace.queryFilter(filter);
      const txCollectionId = events[0].args["collectionId"];
      const txTokenId = events[0].args["tokenId"];
      console.log(
        `Canceled listing for item ${txTokenId} from collection ${txCollectionId}`
      );
    }
  );
