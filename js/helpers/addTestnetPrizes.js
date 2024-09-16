const hardhat = require("hardhat");
const chalk = require("chalk");
const debug = require("debug")("ptv3:addTestnetPrizes");

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments));
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments));
}

async function addTestnetPrizes(prizePoolContractAddress, numberOfPrizes) {
  const { getNamedAccounts, deployments, ethers } = hardhat;
  const { deploy } = deployments;
  const toWei = ethers.utils.parseEther;

  const { deployer, admin } = await getNamedAccounts();
  const signer = await ethers.provider.getSigner(admin);

  // deploy erc721
  const prizeResult = await deploy("ERC721Mintable", {
    args: ["Upside Testnet Prize", "UP-TP"],
    contract: "ERC721Mintable",
    from: deployer,
    skipIfAlreadyDeployed: false
  });

  const prizeContract = await hardhat.ethers.getContractAt(
    "ERC721Mintable",
    prizeResult.address,
    signer
  );

  let tx = await prizeContract.mintFastMany(
    prizePoolContractAddress,
    numberOfPrizes
  );

  await ethers.provider.waitForTransaction(tx.hash);
  const ERC721Mintable = await hardhat.artifacts.readArtifact("ERC721Mintable");
  const erc721 = new ethers.utils.Interface(ERC721Mintable.abi);
  const createResultReceipt = await ethers.provider.getTransactionReceipt(
    tx.hash
  );
  const tokenIds = createResultReceipt.logs
    .map(log => {
      try {
        l = erc721.parseLog(log);
        if (l.name == "Minted") return l.args.tokenId.toNumber();
      } catch (e) {
        return nulls;
      }
    })
    .filter(x => x !== undefined);

  debug(`TokenIds minted: ${tokenIds}`);

  return {
    erc721Address: prizeResult.address,
    tokenIds: tokenIds
  };
}

module.exports = {
  addTestnetPrizes
};
