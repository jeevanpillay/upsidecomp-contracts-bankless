const hardhat = require("hardhat");
const chalk = require("chalk");

const debug = require("debug")("ptv3:addTestnetPrizeWrapper");
const { addTestnetPrizes } = require("../helpers/addTestnetPrizes");

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments));
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments));
}

async function main() {
  const { getNamedAccounts, ethers } = hardhat;
  let {
    deployer,
    admin,
  } = await getNamedAccounts();

  const signer = await ethers.provider.getSigner(admin);
  debug(`Using deployer address: ${deployer}\n`);
  debug(`Using admin address: ${admin}\n`);

  const config = {
    numberOfPrizes: 1,
    prizePoolAddress: "0x29c4B18a595E5e78C7Bcd2aDcCE881F677FF2Ab7",
    prizeStrategyAddress: "0x4C0216192e671e2E767236045067E48762Ec6c96"
  };

  const prizeStrategy = await hardhat.ethers.getContractAt(
    "BanklessMultipleWinners",
    config.prizeStrategyAddress,
    signer
  );

  const res = await addTestnetPrizes(
    config.prizePoolAddress,
    config.numberOfPrizes
  );

  debug(`Add prizes w tokenIds ${res.tokenIds} to prizes strategy`);

  // add prizes
  let tx2 = await prizeStrategy.addPrizes(res.erc721Address, res.tokenIds);
  await ethers.provider.waitForTransaction(tx2.hash);
  let prizes = await prizeStrategy.currentPrizeAddresses();
  let tokenIds = await prizeStrategy.currentPrizeTokenIds(prizes[0]);

  debug("Prizes: ", {
    prizeAddress: prizes[0],
    tokenIds: tokenIds
  });

  debug(`Done!`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
