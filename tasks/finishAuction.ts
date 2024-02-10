import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("finishAuction", "Finishes an auction")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID")
  .addParam("tokenId", "The ID of the token")
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

      await marketplace.finishAuction(collectionId, tokenId);

      const filter = marketplace.filters.AuctionEnded();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txWinner = events[0].args["winner"];
      const txWinningBid = events[0].args["winningBid"];
      const ethWinningBid = hre.ethers.utils.formatEther(txWinningBid);
      console.log(`Finished auction for item ${txTokenId}`);
      console.log(`Winner: ${txWinner}`);
      console.log(`Winning bid: ${ethWinningBid} ETH`);
    }
  );
