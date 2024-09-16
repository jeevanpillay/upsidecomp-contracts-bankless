const hardhat = require("hardhat");
const chalk = require("chalk");
const debug = require("debug")("ptv3:changePrizeStrategyPeriod");

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

  const newPrizePeriodSecond = 259200;

  const prizeStrategy = await hardhat.ethers.getContractAt(
    "BanklessMultipleWinners",
    "0x4C0216192e671e2E767236045067E48762Ec6c96",
    signer
  );

  debug("prizeStrategyAddress: ", prizeStrategy.address);

  let tx = await prizeStrategy.setPrizePeriodSeconds(newPrizePeriodSecond);
  await ethers.provider.waitForTransaction(tx.hash);

  debug("Done!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
