const {deployMockContract} = require("ethereum-waffle");

const {expect} = require("chai");
const hardhat = require("hardhat");

const now = () => (new Date().getTime() / 1000) | 0;
const toWei = val => ethers.utils.parseEther("" + val);
const debug = require("debug")("ptv3:PeriodicPrizePool.test");

let overrides = {gasLimit: 9500000};
const SENTINEL = "0x0000000000000000000000000000000000000001";

describe("BanklessMultipleWinners", function() {
  let wallet, wallet2, wallet3, wallet4;

  let externalERC20Award, externalERC721Award;

  let comptroller, prizePool, prizeStrategy, token;

  let ticket, sponsorship, rng, rngFeeToken;

  // let poolMaxExitFee = toWei('0.5')

  let prizePeriodStart = now();
  let prizePeriodSeconds = 1000;

  beforeEach(async () => {
    [wallet, wallet2, wallet3, wallet4] = await hardhat.ethers.getSigners();

    debug({
      wallet: wallet.address,
      wallet2: wallet2.address,
      wallet3: wallet3.address,
      wallet4: wallet4.address
    });

    debug("deploying protocol comptroller...");
    const TokenListenerInterface = await hre.artifacts.readArtifact(
      "TokenListenerInterface"
    );
    comptroller = await deployMockContract(
      wallet,
      TokenListenerInterface.abi,
      [],
      overrides
    );

    debug("mocking tokens...");
    const IERC20 = await hre.artifacts.readArtifact("IERC20Upgradeable");
    token = await deployMockContract(wallet, IERC20.abi, overrides);

    const BanklessPrizePool = await hre.artifacts.readArtifact(
      "BanklessPrizePool"
    );
    prizePool = await deployMockContract(
      wallet,
      BanklessPrizePool.abi,
      overrides
    );

    const Ticket = await hre.artifacts.readArtifact("Ticket");
    ticket = await deployMockContract(wallet, Ticket.abi, overrides);

    const ControlledToken = await hre.artifacts.readArtifact("ControlledToken");
    sponsorship = await deployMockContract(
      wallet,
      ControlledToken.abi,
      overrides
    );

    const RNGInterface = await hre.artifacts.readArtifact("RNGInterface");
    rng = await deployMockContract(wallet, RNGInterface.abi, overrides);

    rngFeeToken = await deployMockContract(wallet, IERC20.abi, overrides);
    externalERC20Award = await deployMockContract(
      wallet,
      IERC20.abi,
      overrides
    );

    const IERC721 = await hre.artifacts.readArtifact("IERC721Upgradeable");
    externalERC721Award = await deployMockContract(
      wallet,
      IERC721.abi,
      overrides
    );

    await externalERC721Award.mock.supportsInterface.returns(true);
    await externalERC721Award.mock.supportsInterface
      .withArgs("0xffffffff")
      .returns(false);

    await rng.mock.getRequestFee.returns(rngFeeToken.address, toWei("1"));

    debug("deploying prizeStrategy...");
    const BanklessMultipleWinnersHarness = await hre.ethers.getContractFactory(
      "BanklessMultipleWinnersHarness",
      wallet,
      overrides
    );

    prizeStrategy = await BanklessMultipleWinnersHarness.deploy();

    await prizePool.mock.canAwardExternal
      .withArgs(externalERC20Award.address)
      .returns(true);
    await prizePool.mock.canAwardExternal
      .withArgs(externalERC721Award.address)
      .returns(true);

    // wallet 1 always wins
    await ticket.mock.draw.returns(wallet.address);

    debug("initializing prizeStrategy...");
    await prizeStrategy.initializeMultipleWinners(
      prizePeriodStart,
      prizePeriodSeconds,
      prizePool.address,
      ticket.address,
      sponsorship.address,
      rng.address
    );

    // await prizePool.initializeAll(
    //     prizeStrategy.address,
    //     [ticket.address],
    //     poolMaxExitFee,
    //     yieldSourceStub.address
    //   )
    //
    // await prizePool.setPrizeStrategy(prizeStrategy.address)
    // await prizePool.setCreditPlanOf(ticket.address, toWei('0.01'), toWei('0.1'))

    debug("initialized!");
  });

  describe("initializeMultipleWinners()", () => {
    it("should set the params", async () => {
      expect(await prizeStrategy.prizePool()).to.equal(prizePool.address);
      expect(await prizeStrategy.prizePeriodSeconds()).to.equal(
        prizePeriodSeconds
      );
      expect(await prizeStrategy.ticket()).to.equal(ticket.address);
      expect(await prizeStrategy.sponsorship()).to.equal(sponsorship.address);
      expect(await prizeStrategy.rng()).to.equal(rng.address);
      expect(await prizeStrategy.numberOfWinners()).to.equal(0);
    });
  });

  describe("numberOfWinners()", () => {
    it("should return the number of winners", async () => {
      expect(await prizeStrategy.numberOfWinners()).to.equal(0);
    });

    it("should return value based on ERC721 Prizes added", async () => {
      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(2)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(3)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(4)
        .returns(prizePool.address);

      await prizeStrategy.addPrizes(externalERC721Award.address, [1]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(1);

      await prizeStrategy.addPrizes(externalERC721Award.address, [2]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(2);

      await prizeStrategy.addPrizes(externalERC721Award.address, [3, 4]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(4);

      await prizeStrategy.removePrizeAward(
        externalERC721Award.address,
        SENTINEL
      );
      expect(await prizeStrategy.numberOfWinners()).to.equal(0);

      await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(2);
    });

    it("should return value based on ERC721 Prizes added; more than 1 NFT Collection", async () => {
      const IERC721 = await hre.artifacts.readArtifact("IERC721Upgradeable");
      externalERC721Award2 = await deployMockContract(
        wallet,
        IERC721.abi,
        overrides
      );
      await externalERC721Award2.mock.supportsInterface.returns(true);
      await externalERC721Award2.mock.supportsInterface
        .withArgs("0xffffffff")
        .returns(false);
      await prizePool.mock.canAwardExternal
        .withArgs(externalERC721Award2.address)
        .returns(true);

      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(2)
        .returns(prizePool.address);
      await externalERC721Award2.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award2.mock.ownerOf
        .withArgs(2)
        .returns(prizePool.address);

      await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(2);

      await prizeStrategy.addPrizes(externalERC721Award2.address, [1, 2]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(4);

      await prizeStrategy.removePrizeAward(
        externalERC721Award.address,
        externalERC721Award2.address
      );
      expect(await prizeStrategy.numberOfWinners()).to.equal(2);

      await prizeStrategy.removePrizeAward(
        externalERC721Award2.address,
        SENTINEL
      );
      expect(await prizeStrategy.numberOfWinners()).to.equal(0);

      await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2]);
      expect(await prizeStrategy.numberOfWinners()).to.equal(2);
    });
  });

  describe("distribute()", () => {
    it("should ignore awarding prizes if there are no winners to select", async () => {
      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1]);
      await ticket.mock.draw.withArgs(10).returns(ethers.constants.AddressZero);
      await ticket.mock.totalSupply.returns(0);
      await expect(prizeStrategy.distribute(10)).to.emit(
        prizeStrategy,
        "NoWinners"
      );
    });

    // it("should revert if too many winners", async () => {
    //   await expect(
    //     prizeStrategy.awardPrizes([wallet2.address])
    //   ).to.be.revertedWith("PeriodicPrizeStrategy/invalid-winner-array");
    // });

    // it("should work if correct number of winners", async () => {
    //   await externalERC721Award.mock.ownerOf
    //     .withArgs(1)
    //     .returns(prizePool.address);
    //   await externalERC721Award.mock.balanceOf
    //     .withArgs(prizePool.address)
    //     .returns(1);
    //   await prizePool.mock.awardPrize
    //     .withArgs(wallet3.address, externalERC721Award.address, 1)
    //     .returns();
    //   await prizeStrategy.addPrizes(externalERC721Award.address, [1]);
    //   await prizeStrategy.awardPrizes([wallet3.address]);
    //   expect(await prizeStrategy.numberOfPrizes()).to.equal(0);
    // });

    it("should award a single winner", async () => {
      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.balanceOf
        .withArgs(prizePool.address)
        .returns(1);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1]);

      let randomNumber = 10;
      await ticket.mock.draw.withArgs(randomNumber).returns(wallet2.address);
      await ticket.mock.totalSupply.returns(1000);

      await prizePool.mock.awardPrize
        .withArgs(wallet2.address, externalERC721Award.address, 1)
        .returns(true);

      await prizeStrategy.distribute(randomNumber);
    });

    it("should award to multiple winners", async () => {
      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(2)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(3)
        .returns(prizePool.address);
      await externalERC721Award.mock.balanceOf
        .withArgs(prizePool.address)
        .returns(3);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2, 3]);

      let randomNumber = 10;
      const firstRandomNumber =
        "72738808222950603291881257905121690197285699750151085671219270031250447719891";
      const secondRandomNumber =
        "46857301049943750971263597203836871890035239959840344100593056061141731534013";

      await ticket.mock.draw.withArgs(randomNumber).returns(wallet2.address);
      await ticket.mock.draw
        .withArgs(firstRandomNumber)
        .returns(wallet3.address);
      await ticket.mock.draw
        .withArgs(secondRandomNumber)
        .returns(wallet2.address);
      await ticket.mock.totalSupply.returns(1000);

      await prizePool.mock.awardPrize
        .withArgs(wallet2.address, externalERC721Award.address, 1)
        .returns(true);
      await prizePool.mock.awardPrize
        .withArgs(wallet3.address, externalERC721Award.address, 2)
        .returns(true);
      await prizePool.mock.awardPrize
        .withArgs(wallet2.address, externalERC721Award.address, 3)
        .returns(true);

      await prizeStrategy.distribute(randomNumber);
    });

    it("should distribute to winner if contract is winner", async () => {
      const ERC721NotReceiver = await hre.artifacts.readArtifact(
        "ERC721NotReceiver"
      );
      erc721CantReceive = await deployMockContract(
        wallet,
        ERC721NotReceiver.abi,
        overrides
      );

      const addr = erc721CantReceive.address;

      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.balanceOf
        .withArgs(prizePool.address)
        .returns(1);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1]);

      let randomNumber = 10;
      await ticket.mock.draw.withArgs(randomNumber).returns(addr);
      await ticket.mock.totalSupply.returns(1000);

      await prizePool.mock.awardPrize
        .withArgs(addr, externalERC721Award.address, 1)
        .returns(true);

      await prizeStrategy.distribute(randomNumber);
    });

    it('should blocklist address and reach the max retry count with two winners', async () => {
     await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(2)
        .returns(prizePool.address);
      await externalERC721Award.mock.ownerOf
        .withArgs(3)
        .returns(prizePool.address);
      await externalERC721Award.mock.balanceOf
        .withArgs(prizePool.address)
        .returns(3);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2, 3]);

      await prizeStrategy.setBlocklisted(wallet2.address, true)
      await prizeStrategy.setBlocklistRetryCount(2)
      
      let randomNumber = 10;
      const firstRandomNumber =
        "37064725103404186846061877202634929988330668626056892439536191969138221532167";
      const secondRandomNumber =
        "111075169755475008042669917706477765047943200936858446750481279128459241178463";
      const thirdRandomNumber = 
        "14687395224112754347317881744031674455454498128112254032692560820774778924569";

      await ticket.mock.draw.withArgs(randomNumber).returns(wallet2.address);
      await ticket.mock.draw
        .withArgs(firstRandomNumber)
        .returns(wallet3.address);
      await ticket.mock.draw
        .withArgs(secondRandomNumber)
        .returns(wallet4.address);
      await ticket.mock.draw
        .withArgs(thirdRandomNumber)
        .returns(wallet2.address);
      await ticket.mock.totalSupply.returns(1000);

      await prizePool.mock.awardPrize
        .withArgs(wallet3.address, externalERC721Award.address, 1)
        .returns(true);
      await prizePool.mock.awardPrize
        .withArgs(wallet4.address, externalERC721Award.address, 2)
        .returns(true);
      
      // todo: check addres zero

      expect(await prizeStrategy.distribute(randomNumber))
        .to.emit(prizeStrategy, 'RetryMaxLimitReached')
        .withArgs(2)
      })

      it('should blocklist address and reach second NoWinners event', async () => {
      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.balanceOf
        .withArgs(prizePool.address)
        .returns(1);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1]);

      await prizeStrategy.setBlocklisted(wallet4.address, true)
      await prizeStrategy.setBlocklistRetryCount(1)

      let randomNumber = 10
      await ticket.mock.draw.withArgs(randomNumber).returns(wallet4.address)
      await ticket.mock.totalSupply.returns(1000)

      expect(await prizeStrategy.distribute(randomNumber))
        .to.emit(prizeStrategy, 'NoWinners')
    })

    it('should blocklist address and distribute prize to single winner after selecting blocked user', async () => {
      await externalERC721Award.mock.ownerOf
        .withArgs(1)
        .returns(prizePool.address);
      await externalERC721Award.mock.balanceOf
        .withArgs(prizePool.address)
        .returns(1);
      await prizeStrategy.addPrizes(externalERC721Award.address, [1]);

      await prizeStrategy.setBlocklisted(wallet2.address, true)
      await prizeStrategy.setBlocklistRetryCount(5)

      let randomNumber = 10
      const firstRandomNumber = '37064725103404186846061877202634929988330668626056892439536191969138221532167'
      await ticket.mock.draw.withArgs(randomNumber).returns(wallet2.address)
      await ticket.mock.draw.withArgs(firstRandomNumber).returns(wallet3.address)
      await ticket.mock.totalSupply.returns(1000)

      await prizePool.mock.awardPrize
        .withArgs(wallet3.address, externalERC721Award.address, 1)
        .returns(true);

      await prizeStrategy.distribute(randomNumber)
    })

    describe("with a real ticket contract", async () => {
      let controller, ticket;

      beforeEach(async () => {
        const TokenControllerInterface = await hre.artifacts.readArtifact(
          "TokenControllerInterface"
        );
        controller = await deployMockContract(
          wallet,
          TokenControllerInterface.abi,
          overrides
        );
        await controller.mock.beforeTokenTransfer.returns();

        const Ticket = await hre.ethers.getContractFactory(
          "Ticket",
          wallet,
          overrides
        );

        ticket = await Ticket.deploy();
        await ticket.initialize("NAME", "SYMBOL", 8, controller.address);

        await controller.call(
          ticket,
          "controllerMint",
          wallet.address,
          toWei("100")
        );
        await controller.call(
          ticket,
          "controllerMint",
          wallet2.address,
          toWei("100")
        );

        const BanklessMultipleWinnersHarness = await hre.ethers.getContractFactory(
          "BanklessMultipleWinnersHarness",
          wallet,
          overrides
        );

        prizeStrategy = await BanklessMultipleWinnersHarness.deploy();
        debug("initializing prizeStrategy 2...");
        await prizeStrategy.initializeMultipleWinners(
          prizePeriodStart,
          prizePeriodSeconds,
          prizePool.address,
          ticket.address,
          sponsorship.address,
          rng.address
        );
      });

      it("should fail if no prizes to award", async () => {
        await expect(prizeStrategy.distribute(92)).to.be.revertedWith(
          "BanklessMultipleWinners/no-prizes-to-award"
        );
      });

      it("may distribute to the same winner twice", async () => {
        await externalERC721Award.mock.ownerOf
          .withArgs(1)
          .returns(prizePool.address);
        await externalERC721Award.mock.ownerOf
          .withArgs(2)
          .returns(prizePool.address);
        await externalERC721Award.mock.balanceOf
          .withArgs(prizePool.address)
          .returns(2);
        await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2]);
        expect(await prizeStrategy.numberOfWinners()).to.equal(2);

        await prizePool.mock.awardPrize
          .withArgs(wallet.address, externalERC721Award.address, 1)
          .returns(true);
        await prizePool.mock.awardPrize
          .withArgs(wallet.address, externalERC721Award.address, 2)
          .returns(true);

        await prizeStrategy.distribute(92); // this hashes out to the same winner twice

        expect(await prizeStrategy.numberOfWinners()).to.equal(0);
      });

      it("should distribute to more than one winner", async () => {
        await externalERC721Award.mock.ownerOf
          .withArgs(1)
          .returns(prizePool.address);
        await externalERC721Award.mock.ownerOf
          .withArgs(2)
          .returns(prizePool.address);
        await externalERC721Award.mock.balanceOf
          .withArgs(prizePool.address)
          .returns(2);
        await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2]);
        expect(await prizeStrategy.numberOfWinners()).to.equal(2);

        await prizePool.mock.awardPrize
          .withArgs(wallet.address, externalERC721Award.address, 1)
          .returns(true);
        await prizePool.mock.awardPrize
          .withArgs(wallet2.address, externalERC721Award.address, 2)
          .returns(true);

        await prizeStrategy.distribute(90); // this hashes out to two different winners

        expect(await prizeStrategy.numberOfWinners()).to.equal(0);
      });

      it("should distribute to a single winner twice, and another winner once", async () => {
        await externalERC721Award.mock.ownerOf
          .withArgs(1)
          .returns(prizePool.address);
        await externalERC721Award.mock.ownerOf
          .withArgs(2)
          .returns(prizePool.address);
        await externalERC721Award.mock.ownerOf
          .withArgs(3)
          .returns(prizePool.address);
        await externalERC721Award.mock.balanceOf
          .withArgs(prizePool.address)
          .returns(3);
        await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2, 3]);
        expect(await prizeStrategy.numberOfWinners()).to.equal(3);

        await prizePool.mock.awardPrize
          .withArgs(wallet.address, externalERC721Award.address, 1)
          .returns(true);
        await prizePool.mock.awardPrize
          .withArgs(wallet2.address, externalERC721Award.address, 2)
          .returns(true);
        await prizePool.mock.awardPrize
          .withArgs(wallet2.address, externalERC721Award.address, 3)
          .returns(true);

        await prizeStrategy.distribute(90); // this hashes out to two different winners

        expect(await prizeStrategy.numberOfWinners()).to.equal(0);
      });

      describe("multi-collection giveaway", () => {
        let externalERC721Award2;

        beforeEach(async () => {
          const IERC721 = await hre.artifacts.readArtifact(
            "IERC721Upgradeable"
          );
          externalERC721Award2 = await deployMockContract(
            wallet,
            IERC721.abi,
            overrides
          );
          await externalERC721Award2.mock.supportsInterface.returns(true);
          await externalERC721Award2.mock.supportsInterface
            .withArgs("0xffffffff")
            .returns(false);
          await prizePool.mock.canAwardExternal
            .withArgs(externalERC721Award2.address)
            .returns(true);
        });

        it("may distribute to the same winner", async () => {
          await externalERC721Award.mock.ownerOf
            .withArgs(1)
            .returns(prizePool.address);
          await externalERC721Award.mock.balanceOf
            .withArgs(prizePool.address)
            .returns(1);
          await prizeStrategy.addPrizes(externalERC721Award.address, [1]);

          await externalERC721Award2.mock.ownerOf
            .withArgs(1)
            .returns(prizePool.address);
          await externalERC721Award2.mock.balanceOf
            .withArgs(prizePool.address)
            .returns(1);
          await prizeStrategy.addPrizes(externalERC721Award2.address, [1]);

          expect(await prizeStrategy.numberOfWinners()).to.equal(2);

          await prizePool.mock.awardPrize
            .withArgs(wallet.address, externalERC721Award.address, 1)
            .returns(true);
          await prizePool.mock.awardPrize
            .withArgs(wallet.address, externalERC721Award2.address, 1)
            .returns(true);

          await prizeStrategy.distribute(92); // this hashes out to the same winner twice

          expect(await prizeStrategy.numberOfWinners()).to.equal(0);
        });

        it("may distribute to the multiple winners", async () => {
          await externalERC721Award.mock.ownerOf
            .withArgs(1)
            .returns(prizePool.address);
          await externalERC721Award.mock.balanceOf
            .withArgs(prizePool.address)
            .returns(1);
          await prizeStrategy.addPrizes(externalERC721Award.address, [1]);

          await externalERC721Award2.mock.ownerOf
            .withArgs(1)
            .returns(prizePool.address);
          await externalERC721Award2.mock.balanceOf
            .withArgs(prizePool.address)
            .returns(1);
          await prizeStrategy.addPrizes(externalERC721Award2.address, [1]);

          expect(await prizeStrategy.numberOfWinners()).to.equal(2);

          await prizePool.mock.awardPrize
            .withArgs(wallet.address, externalERC721Award2.address, 1)
            .returns(true);
          await prizePool.mock.awardPrize
            .withArgs(wallet2.address, externalERC721Award.address, 1)
            .returns(true);

          await prizeStrategy.distribute(90); // this hashes out to the same winner twice

          expect(await prizeStrategy.numberOfWinners()).to.equal(0);
        });

        it("may distribute many prizes to the multiple winners", async () => {
          await externalERC721Award.mock.ownerOf
            .withArgs(1)
            .returns(prizePool.address);
          await externalERC721Award.mock.ownerOf
            .withArgs(2)
            .returns(prizePool.address);
          await externalERC721Award.mock.balanceOf
            .withArgs(prizePool.address)
            .returns(1);
          await prizeStrategy.addPrizes(externalERC721Award.address, [1, 2]);

          await externalERC721Award2.mock.ownerOf
            .withArgs(1)
            .returns(prizePool.address);
          await externalERC721Award2.mock.balanceOf
            .withArgs(prizePool.address)
            .returns(1);
          await prizeStrategy.addPrizes(externalERC721Award2.address, [1]);

          expect(await prizeStrategy.numberOfWinners()).to.equal(3);

          await prizePool.mock.awardPrize
            .withArgs(wallet.address, externalERC721Award2.address, 1)
            .returns(true);
          await prizePool.mock.awardPrize
            .withArgs(wallet2.address, externalERC721Award.address, 1)
            .returns(true);
          await prizePool.mock.awardPrize
            .withArgs(wallet2.address, externalERC721Award.address, 2)
            .returns(true);

          await prizeStrategy.distribute(90); // this hashes out to the same winner twice

          expect(await prizeStrategy.numberOfWinners()).to.equal(0);
        });
      });
    });
  });
});
