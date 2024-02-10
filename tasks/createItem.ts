import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("createItem", "Mints a new NFT item")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID to mint under")
  .addParam("tokenUri", "The NFT metadata URI")
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
      const tokenURI: string = taskArgs.tokenUri;

      await marketplace.createItem(collectionId, tokenURI);
      const filter = marketplace.filters.ItemCreated();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txTokenOwner = events[0].args["owner"];
      const nftContractAddress = (await marketplace.collections(collectionId)).nftContract;
      console.log(`NFT contract address: ${nftContractAddress}`);
      console.log(
        `Minted token for collection ID ${collectionId} with URI ${tokenURI}`
      );
      console.log(`Token ID: ${txTokenId}`);
      console.log(`Token owner: ${txTokenOwner}`);
    }
  );
