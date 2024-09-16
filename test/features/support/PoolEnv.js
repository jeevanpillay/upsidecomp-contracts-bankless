// features/support/world.js
const chalk = require("chalk");
const hardhat = require("hardhat");
const ethers = require("ethers");

const {expect} = require("chai");
const {call} = require("../../helpers/call");
const {AddressZero} = hre.ethers.constants;
const {BigNumber} = hre.ethers;
const {deployTestPool} = require("../../../js/deployTestPool");
const {One, Two, Three} = require("../../helpers/bn");
require("../../helpers/chaiMatchers");

const debug = require("debug")("ptv3:PoolEnv");

const toWei = val => ethers.utils.parseEther("" + val);
const fromWei = val => ethers.utils.formatEther("" + val);

function PoolEnv() {
  this.overrides = {gasLimit: 9500000};

  this.createPool = async function({
    prizePeriodStart = 0,
    prizePeriodSeconds,
    creditLimit,
    creditRate,
    maxExitFeeMantissa = toWei("0.5"),
    poolType
  }) {
    this.wallets = await hardhat.ethers.getSigners();

    debug({
      wallet0: this.wallets[0].address,
      wallet1: this.wallets[1].address,
      wallet2: this.wallets[2].address,
      wallet3: this.wallets[3].address,
      wallet4: this.wallets[4].address
    });

    if (!poolType) {
      poolType = "bankless";
    }

    debug(`Fetched ${this.wallets.length} wallets`);
    debug(`Creating pool with prize period ${prizePeriodSeconds}...`);
    this.env = await deployTestPool({
      wallet: this.wallets[0],
      prizePeriodStart,
      prizePeriodSeconds,
      maxExitFeeMantissa,
      creditLimit: toWei(creditLimit),
      creditRate: toWei(creditRate),
      overrides: this.overrides
    });

    this.externalERC721Awards = [];

    debug(`PrizePool created with address ${this.env.prizePool.address}`);
    debug(
      `PeriodicPrizePool created with address ${this.env.prizeStrategy.address}`
    );

    await this.setCurrentTime(prizePeriodStart);

    debug(`Done create Pool`);
  };

  this.useMultipleWinnersPrizeStrategy = async function({winnerCount}) {
    await this.env.prizeStrategy.setNumberOfWinners(winnerCount);
    debug(`Changed number of winners to ${winnerCount}`);
  };

  this.setCurrentTime = async function(time) {
    let wallet = await this.wallet(0);
    let prizeStrategy = await this.prizeStrategy(wallet);
    let prizePool = await this.prizePool(wallet);
    await prizeStrategy.setCurrentTime(time, this.overrides);
    await prizePool.setCurrentTime(time, this.overrides);
  };

  this.setReserveRate = async function({rate}) {
    await this.env.reserve.setRateMantissa(toWei(rate), this.overrides);
  };

  this.prizeStrategy = async function(wallet) {
    let prizeStrategy = await hardhat.ethers.getContractAt(
      "BanklessMultipleWinnersHarness",
      this.env.prizeStrategy.address,
      wallet
    );
    this._prizeStrategy = prizeStrategy;
    return prizeStrategy;
  };

  this.prizePool = async function(wallet) {
    let prizePool = this.env.prizePool.connect(wallet);
    this._prizePool = prizePool;
    return prizePool;
  };

  this.prizePoolAddress = async function() {
    let wallet = await this.wallet(0);
    let prizePool = this.env.prizePool.connect(wallet)
    return prizePool.address
  }

  this.token = async function(wallet) {
    return this.env.token.connect(wallet);
  };

  this.governanceToken = async function(wallet) {
    return this.env.governanceToken.connect(wallet);
  };

  this.ticket = async function(wallet) {
    let prizeStrategy = await this.prizeStrategy(wallet);
    let ticketAddress = await prizeStrategy.ticket();
    return await hardhat.ethers.getContractAt(
      "ControlledToken",
      ticketAddress,
      wallet
    );
  };

  this.sponsorship = async function(wallet) {
    let prizePool = await this.prizeStrategy(wallet);
    let sponsorshipAddress = await prizePool.sponsorship();
    return await hardhat.ethers.getContractAt(
      "ControlledToken",
      sponsorshipAddress,
      wallet
    );
  };

  this.wallet = async function(id) {
    let wallet = this.wallets[id];
    return wallet;
  };

  this.debugBalances = async function() {
    const prizePoolAssetBalance = await this.env.token.balanceOf(
      this._prizePool.address
    );

    debug(`prizePool Asset Balance: ${prizePoolAssetBalance}...`);
    debug("----------------------------");
  };

  // this.accrueExternalAwardAmount = async function ({ externalAward, amount }) {
  //   await this.externalERC20Awards[externalAward].mint(this.env.prizePool.address, toWei(amount))
  // }

  this.buyTickets = async function({user, tickets, referrer, toAddress = AddressZero }) {
    debug(`Buying tickets...`);
    let wallet = await this.wallet(user);

    debug("Wallet is ", wallet.address);

    let token = await this.token(wallet);
    let ticket = await this.ticket(wallet);
    let prizePool = await this.prizePool(wallet);

    let amount = toWei(tickets);
    debug("amount", amount)

    let balance = await token.balanceOf(wallet.address);
    debug("balance", balance)
    if (balance.lt(amount)) {
      let minter = await this.wallet(0);
      let minterToken = await this.token(minter);
      await minterToken.mint(minter.address, amount, this.overrides);
      await minterToken.transfer(wallet.address, amount, this.overrides);
    }

    await token.approve(prizePool.address, amount, this.overrides);

    let referrerAddress = AddressZero;
    if (referrer) {
      referrerAddress = (await this.wallet(referrer)).address;
    }

    const depositToAddress = 
      toAddress == AddressZero ? wallet.address : toAddress

    debug(
      `Depositing... (${depositToAddress}, ${amount}, ${ticket.address}, ${referrerAddress})`
    );

    console.log()

    await prizePool.depositTo(
      depositToAddress,
      amount,
      ticket.address,
      referrerAddress,
      this.overrides
    );

    debug(`Bought tickets`);
  };

  this.transferCompoundTokensToPrizePool = async function({user, tokens}) {
    let wallet = await this.wallet(user);
    let amount = toWei(tokens);
    let doubleAmount = toWei(tokens).mul(2);
    await this.env.token.mint(wallet.address, doubleAmount);

    await this.env.token
      .connect(wallet)
      .approve(this.env.cToken.address, amount);
    await this.env.cToken.connect(wallet).mint(amount);
    let cTokenBalance = await this.env.cToken.balanceOf(wallet.address);
    await this.env.cToken
      .connect(wallet)
      .transfer(this.env.prizePool.address, cTokenBalance);

    await this.env.token
      .connect(wallet)
      .approve(this.env.cTokenYieldSource.address, amount);
    await this.env.cTokenYieldSource
      .connect(wallet)
      .supplyTokenTo(amount, this.env.prizePool.address);
  };

  this.expectUserToHaveTickets = async function({user, tickets}) {
    let wallet = await this.wallet(user);
    let ticket = await this.ticket(wallet);
    let amount = toWei(tickets);

    expect(await ticket.balanceOf(wallet.address)).to.equalish(amount, 3000);
  };

  this.expectUserToHaveTokens = async function({user, tokens}) {
    let wallet = await this.wallet(user);
    let token = await this.token(wallet);
    let amount = toWei(tokens);
    expect(await token.balanceOf(wallet.address)).to.equalish(amount, 300);
  };

  this.expectUserToHaveExactTokens = async function({user, tokens}) {
    let wallet = await this.wallet(user);
    let token = await this.token(wallet);
    let amount = toWei(tokens);
    expect(await token.balanceOf(wallet.address)).to.equal(amount);
  };

  this.expectUserToHaveGovernanceTokens = async function({user, tokens}) {
    let wallet = await this.wallet(user);
    let governanceToken = await this.governanceToken(wallet);
    let amount = toWei(tokens);
    expect(await governanceToken.balanceOf(wallet.address)).to.equalish(
      amount,
      300
    );
  };

  this.expectUserToHaveSponsorship = async function({user, sponsorship}) {
    let wallet = await this.wallet(user);
    let sponsorshipContract = await this.sponsorship(wallet);
    let amount = toWei(sponsorship);
    expect(await sponsorshipContract.balanceOf(wallet.address)).to.equalish(
      amount,
      300
    );
  };

  this.expectPoolToHavePrize = async function({tickets}) {
    let ticketInterest = await call(this._prizePool, "captureAwardBalance");
    await expect(ticketInterest).to.equalish(toWei(tickets), 4000);
  };

  this.expectUserToHaveCredit = async function({user, credit}) {
    let wallet = await this.wallet(user);
    let ticket = await this.ticket(wallet);
    let prizePool = await this.prizePool(wallet);
    let ticketInterest = await call(
      prizePool,
      "balanceOfCredit",
      wallet.address,
      ticket.address
    );
    debug(`expectUserToHaveCredit ticketInterest ${ticketInterest.toString()}`);
    expect(ticketInterest).to.equalish(toWei(credit), 300);
  };

  this.startAward = async function() {
    debug(`startAward`);

    let endTime = await this._prizeStrategy.prizePeriodEndAt();

    await this.setCurrentTime(endTime);

    await this.env.prizeStrategy.startAward(this.overrides);
  };

  this.completeAward = async function({token}) {
    // let randomNumber = ethers.utils.hexlify(ethers.utils.zeroPad(ethers.BigNumber.from('' + token), 32))
    await this.env.rngService.setRandomNumber(token, this.overrides);

    debug(`awardPrizeToToken Completing award...`);
    await this.env.prizeStrategy.completeAward(this.overrides);

    debug("award completed");
  };

  this.expectRevertWith = async function(promise, msg) {
    await expect(promise).to.be.revertedWith(msg);
  };

  this.awardPrize = async function() {
    await this.awardPrizeToToken({token: 0});
  };

  this.awardPrizeToToken = async function({token}) {
    await this.startAward();
    await this.completeAward({token});
  };

  this.transferTickets = async function({user, tickets, to}) {
    let wallet = await this.wallet(user);
    let ticket = await this.ticket(wallet);
    let toWallet = await this.wallet(to);
    await ticket.transfer(toWallet.address, toWei(tickets));
  };

  this.draw = async function({token}) {
    let winner = await this.ticket.draw(token);
    debug(`draw(${token}) = ${winner}`);
  };

  this.withdrawInstantly = async function({user, tickets}) {
    debug(`withdrawInstantly: user ${user}, tickets: ${tickets}`);
    let wallet = await this.wallet(user);
    let ticket = await this.ticket(wallet);
    let withdrawalAmount;
    if (!tickets) {
      withdrawalAmount = await ticket.balanceOf(wallet.address);
    } else {
      withdrawalAmount = toWei(tickets);
    }
    let prizePool = await this.prizePool(wallet);
    await prizePool.withdrawInstantlyFrom(
      wallet.address,
      withdrawalAmount,
      ticket.address,
      toWei("1000")
    );
    debug("done withdraw instantly");
  };

  this.balanceOfTickets = async function({user}) {
    let wallet = await this.wallet(user);
    let ticket = await this.ticket(wallet);
    return fromWei(await ticket.balanceOf(wallet.address));
  };

  this.addExternalAwardERC721 = async function({user, tokenId}) {
    let wallet = await this.wallet(user);
    let prizePool = await this.prizePool(wallet);
    let prizeStrategy = await this.prizeStrategy(wallet);
    await this.externalErc721Award.mint(prizePool.address, tokenId);
    await prizeStrategy.addExternalErc721Award(
      this.externalErc721Award.address,
      [tokenId]
    );
  };

  this.addPrize = async function({user, tokenIds, name, symbol}) {
    let wallet = await this.wallet(user);
    let prizePool = await this.prizePool(wallet);
    let prizeStrategy = await this.prizeStrategy(wallet);

    const ERC721Mintable = await hre.ethers.getContractFactory(
      "ERC721Mintable",
      wallet
    );
    const erc721 = await ERC721Mintable.deploy(name, symbol);
    this.externalERC721Awards.push(erc721);

    for (var i = 0; i < tokenIds.length; i++) {
      await erc721.mint(prizePool.address, tokenIds[i]);
    }

    await prizeStrategy.addPrizes(erc721.address, tokenIds);
  };

  this.currentPrizeTokenIdsOfIndex = async function({user, index, tokenIds}) {
    let wallet = await this.wallet(user);
    let prizeStrategy = await this.prizeStrategy(wallet);
    expect(
      await prizeStrategy.currentPrizeTokenIds(
        this.externalERC721Awards[index].address
      )
    ).to.deep.equal(tokenIds.map(id => BigNumber.from(id)));
  };

  this.expectUserToHaveExternalAwardToken = async function({
    user,
    index,
    tokenIds
  }) {
    let wallet = await this.wallet(user);
    for (var i = 0; i < tokenIds.length; i++) {
      expect(
        await this.externalERC721Awards[index].ownerOf(tokenIds[i])
      ).to.equal(wallet.address);
    }
  };

  this.expectAddressToNotHaveExternalAwardToken = async function({
    address,
    index,
    tokenIds
  }) {
    for (var i = 0; i < tokenIds.length; i++) {
      expect(
        await this.externalERC721Awards[index].ownerOf(tokenIds[i])
      ).to.not.equal(address);
    }
  };

  this.expectAddressToHaveExternalAwardToken = async function({
    address,
    index,
    tokenIds
  }) {
    for (var i = 0; i < tokenIds.length; i++) {
      expect(
        await this.externalERC721Awards[index].ownerOf(tokenIds[i])
      ).to.equal(address);
    }
  };

  this.expectEmptyPrizeList = async function() {
    expect(
      await this.env.prizeStrategy.currentPrizeAddresses(this.overrides)
    ).to.deep.equal([]);
  };

  this.expectMoreThanOneWinner = async function({index, tokenIds}) {
    let hasWon = [];
    for (var i = 0; i < tokenIds.length; i++) {
      let winner = await this.externalERC721Awards[index].ownerOf(tokenIds[i]);
      expect(hasWon.includes(winner)).to.equal(false);
      hasWon.push(winner);
    }
  };

  this.addRandomPrize = async function() {
    const tokenIds = [1, 2, 3, 4, 5];
    await this.addPrize({
      user: 0,
      tokenIds: tokenIds,
      name: "TEST",
      symbol: "TEST"
    });
  };

    this.buyTicketsForContract = async function({type}) {
    const user = 1;
    let wallet = await this.wallet(user);

    let contract;
    switch (type) {
      case "ERC721NotReceiver": {
        const ERC721NotReceiver = await hre.ethers.getContractFactory(
          "ERC721NotReceiver",
          wallet
        );
        contract = await ERC721NotReceiver.deploy();
        break;
      }
      case "ERC721Receiver": {
        const ERC721Receiver = await hre.ethers.getContractFactory(
          "ERC721Receiver",
          wallet
        );
        contract = await ERC721Receiver.deploy();
        break;
      }
    }
      
      await this.buyTickets({user: user, tickets: 100, toAddress: contract.address });
      return contract.address
  };
}

module.exports = {
  PoolEnv
};
