import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";

task("createCollection", "Creates a new NFT collection")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("name", "The collection name")
  .addParam("symbol", "The collection symbol")
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
      const name: string = taskArgs.name;
      const symbol: string = taskArgs.symbol;

      await marketplace.createCollection(name, symbol);
      const filter = marketplace.filters.CollectionCreated();
      const events = await marketplace.queryFilter(filter);
      const txCollectionId = events[0].args["collectionId"];
      const txCollectionCreator = events[0].args["creator"];
      const txNewNftContract = events[0].args["nftContract"];

      console.log(`Collection created with name ${name} and symbol ${symbol}`);
      console.log(`Collection ID: ${txCollectionId}`);
      console.log(`Collection creator: ${txCollectionCreator}`);
      console.log(`NFT contract: ${txNewNftContract}`);
    }
  );
