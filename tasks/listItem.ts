import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("listItem", "Lists an NFT for sale")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID of the token to list")
  .addParam("tokenId", "The ID of the token to list")
  .addParam("price", "The listing price")
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
      const price: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.price.toString()
      );
      const paymentToken: string = taskArgs.paymentToken;

      await marketplace.listItem(collectionId, tokenId, price, paymentToken);

      const filter = marketplace.filters.ItemListed();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txPrice = events[0].args["price"];
      const txPaymentToken = events[0].args["paymentToken"];
      const ethPrice = hre.ethers.utils.formatEther(txPrice);
      console.log(`Listed NFT ${txTokenId} for sale at ${ethPrice} ETH`);
      console.log(`Payment token: ${txPaymentToken}`);
    }
  );
