import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { ERC20Mock } from "../typechain";

task("approveERC20", "Approve spending of tokens")
  .addParam("token", "Token address")
  .addParam("spender", "Spender address")
  .addParam("amount", "Amount to approve")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const erc20Token: ERC20Mock = <ERC20Mock>(
        await hre.ethers.getContractAt("ERC20Mock", taskArgs.token as string)
      );
      const spender = taskArgs.spender;
      const amount = hre.ethers.utils.parseEther(taskArgs.amount);
      await erc20Token.approve(spender, amount);

      const owner = await erc20Token.owner();

      const ethValue = hre.ethers.utils.formatEther(amount);

      console.log(
        `The owner ${owner} approved the spender ${spender} to spend ${ethValue} ERC20Token's`
      );
    }
  );
