const hardhat = require("hardhat");
const chalk = require("chalk");
const debug = require("debug")("ptv3:drawWinner");

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments));
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments));
}

async function main() {
  const { getNamedAccounts, deployments, ethers } = hardhat;
  const { deploy } = deployments;
  const toWei = ethers.utils.parseEther;

  const { deployer, admin } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(admin);

  const BANKLESS_MULTIPLE_WINNERS =
    "0x4C0216192e671e2E767236045067E48762Ec6c96";
  const BANKLESS_PRIZE_POOL = "0x29c4B18a595E5e78C7Bcd2aDcCE881F677FF2Ab7";

  const prizeStrategy = await hardhat.ethers.getContractAt(
    "BanklessMultipleWinners",
    BANKLESS_MULTIPLE_WINNERS,
    signer
  );

  const prizePool = await hardhat.ethers.getContractAt(
    "BanklessPrizePool",
    BANKLESS_PRIZE_POOL,
    signer
  );

  dim("BanklessMultipleWinners Address: ", prizeStrategy.address);
  dim("BanklessPrizePool Address: ", prizePool.address);

  // dim("Start Award Winner");
  // const startAwardTx = await prizeStrategy.startAward();
  // dim("Start Award Tx Hash", startAwardTx.hash);
  // await ethers.provider.waitForTransaction(startAwardTx.hash);
  // const startAwardReceipt = await ethers.provider.getTransactionReceipt(
  //   startAwardTx.hash
  // );

  if (await prizeStrategy.canCompleteAward()) {
    dim("Complete Award Winner");
    const completeAwardTx = await prizeStrategy.completeAward();
    await ethers.provider.waitForTransaction(completeAwardTx.hash);
    const completeAwardReceipt = await ethers.provider.getTransactionReceipt(
      completeAwardTx.hash
    );
    dim(
      `Gas used to completeAward: ${completeAwardReceipt.gasUsed.toString()}`
    );
    const completeAwardEvents = completeAwardReceipt.logs.reduce(
      (array, log) => {
        try {
          array.push(prizePool.interface.parseLog(log));
        } catch (e) {}
        return array;
      },
      []
    );

    const awardedEvents = completeAwardEvents.filter(
      event => event.name === "DistributedAward"
    );

    awardedEvents.forEach(event => {
      console.log(
        `Awarded ${event.args.tokenId} of token ${event.args.externalToken} to ${event.args.to}`
      );
    });
  } else {
    debug("Can't Complete Award");
  }

  debug("Done!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
