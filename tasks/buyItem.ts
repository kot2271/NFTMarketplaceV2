import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { NFTMarketplaceV2 } from "../typechain";
import { BigNumber } from "ethers";

task("buyItem", "Purchases a listed NFT")
  .addParam("marketplace", "The NFT marketplace contract address")
  .addParam("collectionId", "The collection ID")
  .addParam("tokenId", "The ID of the token to purchase")
  .addParam("paymentToken", "The payment token address")
  .addParam("value", "The value of the payment token")
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

      taskArgs.paymentToken === hre.ethers.constants.AddressZero
        ? await marketplace.buyItem(collectionId, tokenId, {
            value: hre.ethers.utils.parseEther(taskArgs.value.toString()),
          })
        : await marketplace.buyItem(collectionId, tokenId);

      const filter = marketplace.filters.ItemBought();
      const events = await marketplace.queryFilter(filter);
      const txTokenId = events[0].args["tokenId"];
      const txBuyer = events[0].args["buyer"];
      const txPrice = events[0].args["price"];
      const ethPrice = hre.ethers.utils.formatEther(txPrice);
      console.log(`Bought item ${txTokenId} from collection ${collectionId}`);
      console.log(`Buyer: ${txBuyer}`);
      console.log(`Price: ${ethPrice}`);
    }
  );
