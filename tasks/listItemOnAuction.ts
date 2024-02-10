import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("listItemOnAuction", "Lists an NFT on auction")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID")
  .addParam("tokenId", "The ID of the token to list")
  .addParam("price", "The auction start price")
  .addParam("step", "The bid increment step")
  .addParam("tokenAddress", "The auction payment token address")
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
      const price: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.price.toString()
      );
      const step: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.step.toString()
      );
      const tokenAddress: string = taskArgs.tokenAddress;

      await marketplace.listItemOnAuction(
        collectionId,
        tokenId,
        price,
        step,
        tokenAddress
      );

      const filter = marketplace.filters.AuctionCreated();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txMinPrice = events[0].args["minPrice"];
      const txStep = events[0].args["step"];
      const txPaymentToken = events[0].args["paymentToken"];
      const ethMinPrice = hre.ethers.utils.formatEther(txMinPrice);
      const ethStep = hre.ethers.utils.formatEther(txStep);

      console.log(`Listed item ${txTokenId} on auction`);
      console.log(`Initial price: ${ethMinPrice} ETH`);
      console.log(`Bid increment step: ${ethStep} ETH`);
      console.log(`Payment token: ${txPaymentToken}`);
    }
  );
