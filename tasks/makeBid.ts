import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("makeBid", "Makes a bid on an NFT auction")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID")
  .addParam("tokenId", "The ID of the token to bid on")
  .addParam("bidAmount", "The bid amount")
  .addParam("paymentToken", "The payment token address")
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
      const bidAmount: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.bidAmount.toString()
      );

      taskArgs.paymentToken === hre.ethers.constants.AddressZero
        ? await marketplace.makeBid(collectionId, tokenId, bidAmount, {
            value: bidAmount,
          })
        : await marketplace.makeBid(collectionId, tokenId, bidAmount);

      const filter = marketplace.filters.BidPlaced();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txBidder = events[0].args["bidder"];
      const txBid = events[0].args["bid"];
      const ethBid = hre.ethers.utils.formatEther(txBid);
      console.log(`Made bid of ${ethBid} ETH on item ${txTokenId}`);
      console.log(`Bidder: ${txBidder}`);
    }
  );
