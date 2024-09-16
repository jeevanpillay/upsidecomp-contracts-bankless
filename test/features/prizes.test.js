const {PoolEnv} = require("./support/PoolEnv");

describe("External Awards", () => {
  let env;

  beforeEach(() => {
    env = new PoolEnv();
  });

  describe("single collection", () => {
    it("should award single ERC721 prize", async () => {
      const tokenIds = [1];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: tokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("should award multiple ERC721 prizes", async () => {
      const tokenIds = [1, 2, 3, 4, 5];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: tokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("can award to single winners when multiple ticket owners", async () => {
      const tokenIds = [1];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.buyTickets({user: 2, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: tokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("can award to multiple winners when multiple ticket owners", async () => {
      const tokenIds = [1, 2, 3, 4];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.buyTickets({user: 2, tickets: 100});
      await env.buyTickets({user: 3, tickets: 100});
      await env.buyTickets({user: 4, tickets: 100});
      await env.awardPrize();
      await env.expectMoreThanOneWinner({index: 0, tokenIds: tokenIds});
      await env.expectEmptyPrizeList();
    });

    it("can award to a winner more than once", async () => {
      const tokenIds = [1, 2, 3, 4];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.buyTickets({user: 2, tickets: 100});
      await env.buyTickets({user: 4, tickets: 100});
      await env.buyTickets({user: 3, tickets: 10000});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 3,
        index: 0,
        tokenIds: tokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("can award large prizes amount", async () => {
      const tokenIds = [...Array(100).keys()];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: tokenIds
      });
      await env.expectEmptyPrizeList();
    });
  });

  describe("mulitple collection", () => {
    it("should award two ERC721 collections as prize to single winner", async () => {
      const collectionATokenIds = [1];
      const collectionBTokenIds = [1];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionATokenIds,
        name: "TESTA",
        symbol: "TEST"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionBTokenIds,
        name: "TESTB",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("should award two ERC721 collections with more than 1 tokenId as prize to single winner", async () => {
      const collectionATokenIds = [1, 2];
      const collectionBTokenIds = [1, 2, 3];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionATokenIds,
        name: "TESTA",
        symbol: "TEST"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionBTokenIds,
        name: "TESTB",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("can award to single winners when multiple ticket owners", async () => {
      const collectionATokenIds = [1];
      const collectionBTokenIds = [1];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionATokenIds,
        name: "TESTA",
        symbol: "TEST"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionBTokenIds,
        name: "TESTB",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.buyTickets({user: 1, tickets: 500});
      await env.buyTickets({user: 2, tickets: 100});
      await env.awardPrize();
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.expectEmptyPrizeList();
    });

    it("can award to multiple winners when multiple ticket owners", async () => {
      const collectionATokenIds = [1, 2];
      const collectionBTokenIds = [1, 2, 3];

      await env.createPool({
        prizePeriodSeconds: 10,
        creditLimit: "0.1",
        creditRate: "0.01"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionATokenIds,
        name: "TESTA",
        symbol: "TEST"
      });
      await env.addPrize({
        user: 0,
        tokenIds: collectionBTokenIds,
        name: "TESTB",
        symbol: "TEST"
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.buyTickets({user: 1, tickets: 100});
      await env.buyTickets({user: 2, tickets: 100});
      await env.buyTickets({user: 3, tickets: 100});
      await env.buyTickets({user: 4, tickets: 100});
      await env.awardPrizeToToken({token: 90}); // just happens to more winners
      await env.expectMoreThanOneWinner({
        index: 0,
        tokenIds: collectionATokenIds
      });
      await env.expectMoreThanOneWinner({
        index: 1,
        tokenIds: collectionBTokenIds
      });
      await env.expectEmptyPrizeList();
    });
  });

    it("should fail if winner is an NOT an ERC721Receiver contract", async () => {
      const tokenIds = [1];

      await env.createPool({
        prizePeriodSeconds: 100,
        creditLimit: "0",
        creditRate: "0"
      });

      await env.addPrize({
        user: 0,
        tokenIds: tokenIds,
        name: "TEST",
        symbol: "TEST"
      });

      await env.currentPrizeTokenIdsOfIndex({
        user: 0,
        index: 0,
        tokenIds: tokenIds
      });
      
      const contractAddress = await env.buyTicketsForContract({ type: "ERC721NotReceiver" });
      await env.awardPrize();
      await env.expectAddressToNotHaveExternalAwardToken({
        address: contractAddress,
        index: 0,
        tokenIds: tokenIds
      });
      await env.expectEmptyPrizeList();
  });

  it("should pass if winner is an ERC721Receiver contract", async () => {
    const tokenIds = [1];

    await env.createPool({
      prizePeriodSeconds: 100,
      creditLimit: "0",
      creditRate: "0"
    });

    await env.addPrize({
      user: 0,
      tokenIds: tokenIds,
      name: "TEST",
      symbol: "TEST"
    });

    await env.currentPrizeTokenIdsOfIndex({
      user: 0,
      index: 0,
      tokenIds: tokenIds
    });
    
    const contractAddress = await env.buyTicketsForContract({ type: "ERC721Receiver" });
    await env.awardPrize();
    await env.expectAddressToHaveExternalAwardToken({
      address: contractAddress,
      index: 0,
      tokenIds: tokenIds
    });
    await env.expectEmptyPrizeList();
  });

    it("should be able to giveaway prizes even if some winners are NOT an ERC721Receiver", async () => {
    const tokenIds = [0, 1];

    await env.createPool({
      prizePeriodSeconds: 100,
      creditLimit: "0",
      creditRate: "0"
    });

    await env.addPrize({
      user: 0,
      tokenIds: tokenIds,
      name: "TEST",
      symbol: "TEST"
    });

    await env.currentPrizeTokenIdsOfIndex({
      user: 0,
      index: 0,
      tokenIds: tokenIds
    });
    
    await env.buyTickets({user: 1, tickets: 100});
    const contractAddress = await env.buyTicketsForContract({ type: "ERC721Receiver" });
    await env.awardPrizeToToken({token: 1});
    await env.expectUserToHaveExternalAwardToken({
        user: 1,
        index: 0,
        tokenIds: [0]
    });

    await env.expectAddressToHaveExternalAwardToken({
      address: contractAddress,
      index: 0,
      tokenIds: [1]
    });
    await env.expectEmptyPrizeList();
  });


    it("should be able to giveaway prizes even if some winners are NOT an ERC721Receiver", async () => {
        const tokenIds = [0, 1];

        await env.createPool({
          prizePeriodSeconds: 100,
          creditLimit: "0",
          creditRate: "0"
        });

        await env.addPrize({
          user: 0,
          tokenIds: tokenIds,
          name: "TEST",
          symbol: "TEST"
        });

        await env.currentPrizeTokenIdsOfIndex({
          user: 0,
          index: 0,
          tokenIds: tokenIds
        });
        
        await env.buyTickets({user: 1, tickets: 100});
        const contractAddress = await env.buyTicketsForContract({ type: "ERC721NotReceiver" });
        await env.awardPrizeToToken({token: 1});
        await env.expectUserToHaveExternalAwardToken({
            user: 1,
            index: 0,
            tokenIds: [0]
        });
        await env.expectAddressToNotHaveExternalAwardToken({
          address: contractAddress,
          index: 0,
          tokenIds: tokenIds
        });
        await env.expectAddressToHaveExternalAwardToken({
          address: await env.prizePoolAddress(),
          index: 0,
          tokenIds: [1]
        });
        await env.expectEmptyPrizeList();
      });

  it("should run more than 1 competition", async () => {
    const collectionATokenIds = [1, 2];
    const collectionBTokenIds = [1, 2, 3];

    await env.createPool({
      prizePeriodSeconds: 10,
      creditLimit: "0",
      creditRate: "0"
    });
    await env.addPrize({
      user: 0,
      tokenIds: collectionATokenIds,
      name: "TESTA",
      symbol: "TEST"
    });
    await env.currentPrizeTokenIdsOfIndex({
      user: 0,
      index: 0,
      tokenIds: collectionATokenIds
    });
    await env.buyTickets({user: 2, tickets: 100});
    await env.awardPrizeToToken({token: 0});
    await env.expectUserToHaveExternalAwardToken({
      user: 2,
      index: 0,
      tokenIds: collectionATokenIds
    });
    await env.expectEmptyPrizeList();

    await env.addPrize({
      user: 0,
      tokenIds: collectionBTokenIds,
      name: "TESTB",
      symbol: "TEST"
    });
    await env.currentPrizeTokenIdsOfIndex({
      user: 0,
      index: 1,
      tokenIds: collectionBTokenIds
    });
    await env.awardPrizeToToken({token: 1});
    await env.expectUserToHaveExternalAwardToken({
      user: 2,
      index: 1,
      tokenIds: collectionBTokenIds
    });
    await env.expectEmptyPrizeList();
  });
});
