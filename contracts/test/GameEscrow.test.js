import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("GameEscrow", function () {
  // Fixture for deploying contracts
  async function deployGameEscrowFixture() {
    const [admin, oracle, player1, player2, player3, player4, creator, other] = await ethers.getSigners();

    // Deploy mock ERC20 token (simulating USDC with 6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy GameEscrow
    const maxTVL = ethers.parseUnits("1000000", 6); // 1M USDC
    const GameEscrow = await ethers.getContractFactory("GameEscrow");
    const gameEscrow = await GameEscrow.deploy(admin.address, oracle.address, maxTVL);
    await gameEscrow.waitForDeployment();

    // Add USDC as allowed token
    const maxTokenLimit = ethers.parseUnits("500000", 6); // 500K USDC per token
    await gameEscrow.connect(admin).addAllowedToken(await usdc.getAddress(), maxTokenLimit);

    // Mint tokens to players
    const mintAmount = ethers.parseUnits("10000", 6); // 10K USDC each
    await usdc.mint(player1.address, mintAmount);
    await usdc.mint(player2.address, mintAmount);
    await usdc.mint(player3.address, mintAmount);
    await usdc.mint(player4.address, mintAmount);
    await usdc.mint(creator.address, mintAmount);

    // Approve escrow contract
    await usdc.connect(player1).approve(await gameEscrow.getAddress(), ethers.MaxUint256);
    await usdc.connect(player2).approve(await gameEscrow.getAddress(), ethers.MaxUint256);
    await usdc.connect(player3).approve(await gameEscrow.getAddress(), ethers.MaxUint256);
    await usdc.connect(player4).approve(await gameEscrow.getAddress(), ethers.MaxUint256);
    await usdc.connect(creator).approve(await gameEscrow.getAddress(), ethers.MaxUint256);

    return { gameEscrow, usdc, admin, oracle, player1, player2, player3, player4, creator, other };
  }

  describe("Deployment", function () {
    it("Should set the correct roles", async function () {
      const { gameEscrow, admin, oracle } = await loadFixture(deployGameEscrowFixture);

      const ADMIN_ROLE = await gameEscrow.ADMIN_ROLE();
      const ORACLE_ROLE = await gameEscrow.ORACLE_ROLE();
      const EMERGENCY_ROLE = await gameEscrow.EMERGENCY_ROLE();

      expect(await gameEscrow.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await gameEscrow.hasRole(ORACLE_ROLE, oracle.address)).to.be.true;
      expect(await gameEscrow.hasRole(EMERGENCY_ROLE, admin.address)).to.be.true;
    });

    it("Should set correct default game limits", async function () {
      const { gameEscrow } = await loadFixture(deployGameEscrowFixture);
      const limits = await gameEscrow.gameLimits();

      expect(limits.minEntryFee).to.equal(ethers.parseUnits("1", 6)); // 1 USDC
      expect(limits.maxEntryFee).to.equal(ethers.parseUnits("10000", 6)); // 10K USDC
      expect(limits.minPlayers).to.equal(2);
      expect(limits.maxPlayers).to.equal(16);
      expect(limits.maxTimeLimit).to.equal(3600); // 1 hour
      expect(limits.maxCreatorCommission).to.equal(5000); // 50%
      expect(limits.maxPlatformCommission).to.equal(2000); // 20%
    });

    it("Should have USDC added as allowed token", async function () {
      const { gameEscrow, usdc } = await loadFixture(deployGameEscrowFixture);
      expect(await gameEscrow.allowedTokens(await usdc.getAddress())).to.be.true;
    });
  });

  describe("Token Management", function () {
    it("Should allow admin to add new tokens", async function () {
      const { gameEscrow, admin } = await loadFixture(deployGameEscrowFixture);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const dai = await MockERC20.deploy("DAI", "DAI", 18);
      await dai.waitForDeployment();

      const maxLimit = ethers.parseEther("100000");
      await expect(gameEscrow.connect(admin).addAllowedToken(await dai.getAddress(), maxLimit))
        .to.emit(gameEscrow, "TokenAdded")
        .withArgs(await dai.getAddress());

      expect(await gameEscrow.allowedTokens(await dai.getAddress())).to.be.true;
    });

    it("Should allow admin to remove tokens", async function () {
      const { gameEscrow, usdc, admin } = await loadFixture(deployGameEscrowFixture);

      await expect(gameEscrow.connect(admin).removeAllowedToken(await usdc.getAddress()))
        .to.emit(gameEscrow, "TokenRemoved")
        .withArgs(await usdc.getAddress());

      expect(await gameEscrow.allowedTokens(await usdc.getAddress())).to.be.false;
    });

    it("Should not allow non-admin to add tokens", async function () {
      const { gameEscrow, other } = await loadFixture(deployGameEscrowFixture);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const dai = await MockERC20.deploy("DAI", "DAI", 18);
      await dai.waitForDeployment();

      await expect(
        gameEscrow.connect(other).addAllowedToken(await dai.getAddress(), ethers.parseEther("100000"))
      ).to.be.reverted;
    });
  });

  describe("Game Creation", function () {
    it("Should create a game successfully", async function () {
      const { gameEscrow, usdc, creator } = await loadFixture(deployGameEscrowFixture);

      const entryFee = ethers.parseUnits("10", 6); // 10 USDC
      const maxPlayers = 4;
      const numTeams = 0;
      const timeLimit = 3600; // 1 hour
      const creatorCommission = 500; // 5%
      const platformCommission = 200; // 2%

      await expect(
        gameEscrow.connect(creator).createGame(
          await usdc.getAddress(),
          0, // WinnerTakesAll
          entryFee,
          maxPlayers,
          numTeams,
          timeLimit,
          creatorCommission,
          platformCommission
        )
      ).to.emit(gameEscrow, "GameCreated")
        .withArgs(0, creator.address, await usdc.getAddress(), 0, entryFee, maxPlayers, creatorCommission);

      const game = await gameEscrow.getGame(0);
      expect(game.creator).to.equal(creator.address);
      expect(game.entryFee).to.equal(entryFee);
      expect(game.maxPlayers).to.equal(maxPlayers);
      expect(game.status).to.equal(0); // Waiting
    });

    it("Should reject game with invalid entry fee", async function () {
      const { gameEscrow, usdc, creator } = await loadFixture(deployGameEscrowFixture);

      const tooLowFee = ethers.parseUnits("0.5", 6); // 0.5 USDC (below minimum)

      await expect(
        gameEscrow.connect(creator).createGame(
          await usdc.getAddress(),
          0,
          tooLowFee,
          4,
          0,
          3600,
          500,
          200
        )
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidGameParameters");
    });

    it("Should reject game with invalid commission", async function () {
      const { gameEscrow, usdc, creator } = await loadFixture(deployGameEscrowFixture);

      const entryFee = ethers.parseUnits("10", 6);

      // Total commission >= 100%
      await expect(
        gameEscrow.connect(creator).createGame(
          await usdc.getAddress(),
          0,
          entryFee,
          4,
          0,
          3600,
          6000, // 60%
          5000  // 50% = 110% total
        )
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidCommission");
    });

    it("Should create team battle game with valid team configuration", async function () {
      const { gameEscrow, usdc, creator } = await loadFixture(deployGameEscrowFixture);

      const entryFee = ethers.parseUnits("10", 6);

      await expect(
        gameEscrow.connect(creator).createGame(
          await usdc.getAddress(),
          1, // TeamBattle
          entryFee,
          4,
          2, // 2 teams
          3600,
          500,
          200
        )
      ).to.emit(gameEscrow, "GameCreated");

      const game = await gameEscrow.getGame(0);
      expect(game.numTeams).to.equal(2);
    });

    it("Should reject team battle with invalid team configuration", async function () {
      const { gameEscrow, usdc, creator } = await loadFixture(deployGameEscrowFixture);

      // 4 players but 3 teams (not divisible)
      await expect(
        gameEscrow.connect(creator).createGame(
          await usdc.getAddress(),
          1, // TeamBattle
          ethers.parseUnits("10", 6),
          4,
          3,
          3600,
          500,
          200
        )
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidGameParameters");
    });
  });

  describe("Joining Games", function () {
    async function createTestGame() {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator } = fixture;

      const entryFee = ethers.parseUnits("10", 6);
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0, // WinnerTakesAll
        entryFee,
        4,
        0,
        3600,
        500,
        200
      );

      return { ...fixture, entryFee };
    }

    it("Should allow player to join game", async function () {
      const { gameEscrow, player1, entryFee } = await createTestGame();

      await expect(gameEscrow.connect(player1).joinGame(0, 0))
        .to.emit(gameEscrow, "PlayerJoined")
        .withArgs(0, player1.address, 0);

      const game = await gameEscrow.getGame(0);
      expect(game.players).to.include(player1.address);
      expect(game.prizePool).to.equal(entryFee);
    });

    it("Should update TVL when player joins", async function () {
      const { gameEscrow, player1, entryFee } = await createTestGame();

      const tvlBefore = await gameEscrow.totalValueLocked();
      await gameEscrow.connect(player1).joinGame(0, 0);
      const tvlAfter = await gameEscrow.totalValueLocked();

      expect(tvlAfter - tvlBefore).to.equal(entryFee);
    });

    it("Should update player reputation when joining", async function () {
      const { gameEscrow, player1 } = await createTestGame();

      const repBefore = await gameEscrow.playerReputationScore(player1.address);
      await gameEscrow.connect(player1).joinGame(0, 0);
      const repAfter = await gameEscrow.playerReputationScore(player1.address);

      expect(repAfter - repBefore).to.equal(1);
    });

    it("Should not allow player to join twice", async function () {
      const { gameEscrow, player1 } = await createTestGame();

      await gameEscrow.connect(player1).joinGame(0, 0);

      // Wait for cooldown to pass
      await time.increase(6);

      await expect(
        gameEscrow.connect(player1).joinGame(0, 0)
      ).to.be.revertedWithCustomError(gameEscrow, "PlayerAlreadyJoined");
    });

    it("Should not allow joining when game is full", async function () {
      const { gameEscrow, player1, player2, player3, creator } = await createTestGame();

      // Fill the game partially (3 players out of 4 max)
      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);

      // Last join fills the game and auto-starts it
      await gameEscrow.connect(creator).joinGame(0, 0);

      // Game should now be Active (status 1), not Waiting (status 0)
      const game = await gameEscrow.getGame(0);
      expect(game.status).to.equal(1); // Active
      expect(game.players.length).to.equal(4); // Full
    });

    it("Should auto-start game when full", async function () {
      const { gameEscrow, player1, player2, player3, player4 } = await createTestGame();

      await gameEscrow.connect(player1).joinGame(0, 0);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await gameEscrow.connect(player3).joinGame(0, 0);

      // Last player triggers auto-start
      await expect(gameEscrow.connect(player4).joinGame(0, 0))
        .to.emit(gameEscrow, "GameStarted")
        .withArgs(0, await time.latest() + 1);

      const game = await gameEscrow.getGame(0);
      expect(game.status).to.equal(1); // Active
    });

    it("Should respect join cooldown", async function () {
      const { gameEscrow, usdc, creator, player1 } = await loadFixture(deployGameEscrowFixture);

      // Create first game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      // Join first game
      await gameEscrow.connect(player1).joinGame(0, 0);

      // Create second game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      // Try to join immediately (should fail due to cooldown)
      await expect(
        gameEscrow.connect(player1).joinGame(1, 0)
      ).to.be.revertedWithCustomError(gameEscrow, "CooldownActive");

      // Wait for cooldown to pass
      await time.increase(6); // 6 seconds > 5 second cooldown

      // Now should succeed
      await expect(gameEscrow.connect(player1).joinGame(1, 0))
        .to.emit(gameEscrow, "PlayerJoined");
    });
  });

  describe("Team Battle Games", function () {
    async function createTeamBattleGame() {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator } = fixture;

      const entryFee = ethers.parseUnits("10", 6);
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        1, // TeamBattle
        entryFee,
        4,
        2, // 2 teams
        3600,
        500,
        200
      );

      return { ...fixture, entryFee };
    }

    it("Should allow players to join specific teams", async function () {
      const { gameEscrow, player1, player2 } = await createTeamBattleGame();

      await expect(gameEscrow.connect(player1).joinGame(0, 0))
        .to.emit(gameEscrow, "PlayerJoined")
        .withArgs(0, player1.address, 0);

      await expect(gameEscrow.connect(player2).joinGame(0, 1))
        .to.emit(gameEscrow, "PlayerJoined")
        .withArgs(0, player2.address, 1);
    });

    it("Should reject invalid team ID", async function () {
      const { gameEscrow, player1 } = await createTeamBattleGame();

      await expect(
        gameEscrow.connect(player1).joinGame(0, 5) // Team 5 doesn't exist
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidTeam");
    });
  });

  describe("Game Results & Payouts", function () {
    async function createAndFillGame() {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator, player1, player2, player3, player4 } = fixture;

      const entryFee = ethers.parseUnits("100", 6); // 100 USDC
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        entryFee,
        4,
        0,
        3600,
        1000, // 10% creator
        200   // 2% platform
      );

      // Join with all 4 players (auto-starts)
      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player4).joinGame(0, 0);

      return { ...fixture, entryFee };
    }

    it("Should distribute payouts correctly to winner", async function () {
      const { gameEscrow, oracle, player1, entryFee } = await createAndFillGame();

      const totalPrize = entryFee * BigInt(4); // 400 USDC
      const creatorCut = (totalPrize * BigInt(1000)) / BigInt(10000); // 10% = 40 USDC
      const platformCut = (totalPrize * BigInt(200)) / BigInt(10000);  // 2% = 8 USDC
      const winnerAmount = totalPrize - creatorCut - platformCut; // 352 USDC

      await expect(gameEscrow.connect(oracle).reportGameResult(0, [player1.address]))
        .to.emit(gameEscrow, "GameFinished")
        .withArgs(0, [player1.address], winnerAmount);

      const player1Balance = await gameEscrow.playerBalances(player1.address, await gameEscrow.getSupportedTokens().then(tokens => tokens[0]));
      expect(player1Balance).to.equal(winnerAmount);
    });

    it("Should distribute payouts correctly to multiple winners", async function () {
      const { gameEscrow, oracle, player1, player2, entryFee } = await createAndFillGame();

      const totalPrize = entryFee * BigInt(4);
      const creatorCut = (totalPrize * BigInt(1000)) / BigInt(10000);
      const platformCut = (totalPrize * BigInt(200)) / BigInt(10000);
      const winnerAmount = totalPrize - creatorCut - platformCut;
      const perWinner = winnerAmount / BigInt(2); // Split between 2 winners

      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address, player2.address]);

      const tokens = await gameEscrow.getSupportedTokens();
      const player1Balance = await gameEscrow.playerBalances(player1.address, tokens[0]);
      const player2Balance = await gameEscrow.playerBalances(player2.address, tokens[0]);

      expect(player1Balance).to.equal(perWinner);
      expect(player2Balance).to.equal(perWinner);
    });

    it("Should credit creator earnings", async function () {
      const { gameEscrow, oracle, creator, player1, entryFee, usdc } = await createAndFillGame();

      const totalPrize = entryFee * BigInt(4);
      const creatorCut = (totalPrize * BigInt(1000)) / BigInt(10000);

      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address]);

      const creatorEarnings = await gameEscrow.creatorEarnings(creator.address, await usdc.getAddress());
      expect(creatorEarnings).to.equal(creatorCut);
    });

    it("Should credit platform revenue", async function () {
      const { gameEscrow, oracle, player1, entryFee, usdc } = await createAndFillGame();

      const totalPrize = entryFee * BigInt(4);
      const platformCut = (totalPrize * BigInt(200)) / BigInt(10000);

      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address]);

      const platformRevenue = await gameEscrow.platformRevenue(await usdc.getAddress());
      expect(platformRevenue).to.equal(platformCut);
    });

    it("Should update TVL after payout", async function () {
      const { gameEscrow, oracle, player1, entryFee } = await createAndFillGame();

      const tvlBefore = await gameEscrow.totalValueLocked();
      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address]);
      const tvlAfter = await gameEscrow.totalValueLocked();

      const totalPrize = entryFee * BigInt(4);
      expect(tvlBefore - tvlAfter).to.equal(totalPrize);
    });

    it("Should increase winner's reputation", async function () {
      const { gameEscrow, oracle, player1 } = await createAndFillGame();

      const repBefore = await gameEscrow.playerReputationScore(player1.address);
      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address]);
      const repAfter = await gameEscrow.playerReputationScore(player1.address);

      expect(repAfter - repBefore).to.equal(2); // +2 for winning
    });

    it("Should not allow non-oracle to report results", async function () {
      const { gameEscrow, player1, player2 } = await createAndFillGame();

      await expect(
        gameEscrow.connect(player1).reportGameResult(0, [player2.address])
      ).to.be.reverted;
    });

    it("Should not allow reporting results for non-active game", async function () {
      const { gameEscrow, oracle, player1 } = await loadFixture(deployGameEscrowFixture);

      await expect(
        gameEscrow.connect(oracle).reportGameResult(0, [player1.address])
      ).to.be.revertedWithCustomError(gameEscrow, "GameNotFound");
    });

    it("Should not allow invalid winners", async function () {
      const { gameEscrow, oracle, other } = await createAndFillGame();

      // Try to declare someone who didn't join as winner
      await expect(
        gameEscrow.connect(oracle).reportGameResult(0, [other.address])
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidGameParameters");
    });

    it("Should not allow empty winners array", async function () {
      const { gameEscrow, oracle } = await createAndFillGame();

      await expect(
        gameEscrow.connect(oracle).reportGameResult(0, [])
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidGameParameters");
    });
  });

  describe("Game Cancellation & Refunds", function () {
    async function createGameWithPlayers() {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator, player1, player2 } = fixture;

      const entryFee = ethers.parseUnits("10", 6);
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        entryFee,
        4,
        0,
        3600,
        500,
        200
      );

      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);

      return { ...fixture, entryFee };
    }

    it("Should allow creator to cancel their own game", async function () {
      const { gameEscrow, creator } = await createGameWithPlayers();

      await expect(gameEscrow.connect(creator).cancelGame(0, "Changed my mind"))
        .to.emit(gameEscrow, "GameCancelled")
        .withArgs(0, "Changed my mind");

      const game = await gameEscrow.getGame(0);
      expect(game.status).to.equal(3); // Cancelled
    });

    it("Should refund all players when game is cancelled", async function () {
      const { gameEscrow, creator, player1, player2, entryFee, usdc } = await createGameWithPlayers();

      await gameEscrow.connect(creator).cancelGame(0, "Test");

      const player1Balance = await gameEscrow.playerBalances(player1.address, await usdc.getAddress());
      const player2Balance = await gameEscrow.playerBalances(player2.address, await usdc.getAddress());

      expect(player1Balance).to.equal(entryFee);
      expect(player2Balance).to.equal(entryFee);
    });

    it("Should update TVL after refund", async function () {
      const { gameEscrow, creator, entryFee } = await createGameWithPlayers();

      const tvlBefore = await gameEscrow.totalValueLocked();
      await gameEscrow.connect(creator).cancelGame(0, "Test");
      const tvlAfter = await gameEscrow.totalValueLocked();

      const refundedAmount = entryFee * BigInt(2); // 2 players
      expect(tvlBefore - tvlAfter).to.equal(refundedAmount);
    });

    it("Should not allow non-creator to cancel", async function () {
      const { gameEscrow, player1 } = await createGameWithPlayers();

      await expect(
        gameEscrow.connect(player1).cancelGame(0, "Not my game")
      ).to.be.revertedWithCustomError(gameEscrow, "NotGameCreator");
    });

    it("Should allow emergency role to refund", async function () {
      const { gameEscrow, admin } = await createGameWithPlayers();

      await expect(gameEscrow.connect(admin).emergencyRefund(0))
        .to.emit(gameEscrow, "EmergencyAction")
        .withArgs(0, "Refund", admin.address);

      const game = await gameEscrow.getGame(0);
      expect(game.status).to.equal(3); // Cancelled
    });

    it("Should allow oracle to timeout games", async function () {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator, player1, player2, player3, player4, oracle } = fixture;

      // Create game with 1 second timeout for testing
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        1, // 1 second timeout
        500,
        200
      );

      // Fill game to start it
      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player4).joinGame(0, 0);

      // Wait for timeout
      await time.increase(2);

      // Oracle reports timeout
      await expect(gameEscrow.connect(oracle).reportGameTimeout(0))
        .to.emit(gameEscrow, "GameCancelled")
        .withArgs(0, "Timeout");
    });

    it("Should not allow timeout before time limit", async function () {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator, player1, player2, player3, player4, oracle } = fixture;

      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      // Fill game
      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player4).joinGame(0, 0);

      // Try to timeout immediately
      await expect(
        gameEscrow.connect(oracle).reportGameTimeout(0)
      ).to.be.revertedWithCustomError(gameEscrow, "InvalidGameParameters");
    });
  });

  describe("Withdrawals", function () {
    async function setupForWithdrawals() {
      const fixture = await loadFixture(deployGameEscrowFixture);
      const { gameEscrow, usdc, creator, player1, player2, player3, player4, oracle } = fixture;

      const entryFee = ethers.parseUnits("100", 6);
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        entryFee,
        4,
        0,
        3600,
        1000, // 10%
        200   // 2%
      );

      // Fill and complete game
      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player4).joinGame(0, 0);

      // Declare player1 as winner
      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address]);

      return { ...fixture, entryFee };
    }

    it("Should allow winner to withdraw balance", async function () {
      const { gameEscrow, usdc, player1 } = await setupForWithdrawals();

      const balanceBefore = await usdc.balanceOf(player1.address);
      const escrowBalance = await gameEscrow.playerBalances(player1.address, await usdc.getAddress());

      await gameEscrow.connect(player1).withdrawPlayerBalance(await usdc.getAddress());

      const balanceAfter = await usdc.balanceOf(player1.address);
      expect(balanceAfter - balanceBefore).to.equal(escrowBalance);

      // Balance should be zero after withdrawal
      const remainingBalance = await gameEscrow.playerBalances(player1.address, await usdc.getAddress());
      expect(remainingBalance).to.equal(0);
    });

    it("Should allow creator to withdraw earnings", async function () {
      const { gameEscrow, usdc, creator } = await setupForWithdrawals();

      const balanceBefore = await usdc.balanceOf(creator.address);
      const earnings = await gameEscrow.creatorEarnings(creator.address, await usdc.getAddress());

      await gameEscrow.connect(creator).withdrawCreatorEarnings(await usdc.getAddress());

      const balanceAfter = await usdc.balanceOf(creator.address);
      expect(balanceAfter - balanceBefore).to.equal(earnings);

      // Earnings should be zero after withdrawal
      const remainingEarnings = await gameEscrow.creatorEarnings(creator.address, await usdc.getAddress());
      expect(remainingEarnings).to.equal(0);
    });

    it("Should allow admin to withdraw platform revenue", async function () {
      const { gameEscrow, usdc, admin } = await setupForWithdrawals();

      const balanceBefore = await usdc.balanceOf(admin.address);
      const revenue = await gameEscrow.platformRevenue(await usdc.getAddress());

      await gameEscrow.connect(admin).withdrawPlatformRevenue(await usdc.getAddress());

      const balanceAfter = await usdc.balanceOf(admin.address);
      expect(balanceAfter - balanceBefore).to.equal(revenue);
    });

    it("Should not allow non-admin to withdraw platform revenue", async function () {
      const { gameEscrow, usdc, player1 } = await setupForWithdrawals();

      await expect(
        gameEscrow.connect(player1).withdrawPlatformRevenue(await usdc.getAddress())
      ).to.be.reverted;
    });

    it("Should revert when withdrawing zero balance", async function () {
      const { gameEscrow, usdc, player2 } = await setupForWithdrawals();

      // player2 didn't win, so has no balance
      await expect(
        gameEscrow.connect(player2).withdrawPlayerBalance(await usdc.getAddress())
      ).to.be.revertedWithCustomError(gameEscrow, "InsufficientBalance");
    });

    it("Should allow withdrawing all balances at once", async function () {
      const { gameEscrow, usdc, player1 } = await setupForWithdrawals();

      const balanceBefore = await usdc.balanceOf(player1.address);
      const escrowBalance = await gameEscrow.playerBalances(player1.address, await usdc.getAddress());

      await gameEscrow.connect(player1).withdrawAllBalances();

      const balanceAfter = await usdc.balanceOf(player1.address);
      expect(balanceAfter - balanceBefore).to.equal(escrowBalance);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency role to pause contract", async function () {
      const { gameEscrow, admin } = await loadFixture(deployGameEscrowFixture);

      await gameEscrow.connect(admin).pause();
      expect(await gameEscrow.paused()).to.be.true;
    });

    it("Should prevent actions when paused", async function () {
      const { gameEscrow, usdc, creator, admin } = await loadFixture(deployGameEscrowFixture);

      await gameEscrow.connect(admin).pause();

      // OpenZeppelin v5 uses custom errors for Pausable
      await expect(
        gameEscrow.connect(creator).createGame(
          await usdc.getAddress(),
          0,
          ethers.parseUnits("10", 6),
          4,
          0,
          3600,
          500,
          200
        )
      ).to.be.revertedWithCustomError(gameEscrow, "EnforcedPause");
    });

    it("Should allow admin to unpause", async function () {
      const { gameEscrow, admin } = await loadFixture(deployGameEscrowFixture);

      await gameEscrow.connect(admin).pause();
      await gameEscrow.connect(admin).unpause();
      expect(await gameEscrow.paused()).to.be.false;
    });

    it("Should allow emergency token recovery", async function () {
      const { gameEscrow, usdc, admin, other } = await loadFixture(deployGameEscrowFixture);

      // Send some tokens to contract accidentally
      const amount = ethers.parseUnits("100", 6);
      await usdc.mint(await gameEscrow.getAddress(), amount);

      const balanceBefore = await usdc.balanceOf(other.address);
      await gameEscrow.connect(admin).emergencyTokenRecovery(
        await usdc.getAddress(),
        other.address,
        amount
      );
      const balanceAfter = await usdc.balanceOf(other.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update game limits", async function () {
      const { gameEscrow, admin } = await loadFixture(deployGameEscrowFixture);

      const newLimits = {
        minEntryFee: ethers.parseUnits("2", 6),
        maxEntryFee: ethers.parseUnits("20000", 6),
        minPlayers: 3,
        maxPlayers: 20,
        maxTimeLimit: 7200,
        maxCreatorCommission: 6000,
        maxPlatformCommission: 3000
      };

      await expect(gameEscrow.connect(admin).updateGameLimits(newLimits))
        .to.emit(gameEscrow, "LimitsUpdated");

      const limits = await gameEscrow.gameLimits();
      expect(limits.minEntryFee).to.equal(newLimits.minEntryFee);
      expect(limits.maxPlayers).to.equal(newLimits.maxPlayers);
    });

    it("Should allow admin to update TVL limits", async function () {
      const { gameEscrow, admin } = await loadFixture(deployGameEscrowFixture);

      const newLimit = ethers.parseUnits("2000000", 6);
      await gameEscrow.connect(admin).updateTVLLimits(newLimit);

      expect(await gameEscrow.maxTVLLimit()).to.equal(newLimit);
    });

    it("Should not allow non-admin to update limits", async function () {
      const { gameEscrow, player1 } = await loadFixture(deployGameEscrowFixture);

      const newLimits = {
        minEntryFee: ethers.parseUnits("2", 6),
        maxEntryFee: ethers.parseUnits("20000", 6),
        minPlayers: 3,
        maxPlayers: 20,
        maxTimeLimit: 7200,
        maxCreatorCommission: 6000,
        maxPlatformCommission: 3000
      };

      await expect(
        gameEscrow.connect(player1).updateGameLimits(newLimits)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return waiting games", async function () {
      const { gameEscrow, usdc, creator, player1 } = await loadFixture(deployGameEscrowFixture);

      // Create a game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      const waitingGames = await gameEscrow.getWaitingGames();
      expect(waitingGames.length).to.equal(1);
      expect(waitingGames[0]).to.equal(0);
    });

    it("Should return active games", async function () {
      const { gameEscrow, usdc, creator, player1, player2, player3, player4 } = await loadFixture(deployGameEscrowFixture);

      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      // Fill game to make it active
      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player4).joinGame(0, 0);

      const activeGames = await gameEscrow.getActiveGames();
      expect(activeGames.length).to.equal(1);
      expect(activeGames[0]).to.equal(0);
    });

    it("Should return supported tokens", async function () {
      const { gameEscrow, usdc } = await loadFixture(deployGameEscrowFixture);

      const tokens = await gameEscrow.getSupportedTokens();
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(await usdc.getAddress());
    });

    it("Should return creator games", async function () {
      const { gameEscrow, usdc, creator } = await loadFixture(deployGameEscrowFixture);

      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("20", 6),
        4,
        0,
        3600,
        500,
        200
      );

      const creatorGames = await gameEscrow.getCreatorGames(creator.address);
      expect(creatorGames.length).to.equal(2);
      expect(creatorGames[0]).to.equal(0);
      expect(creatorGames[1]).to.equal(1);
    });

    it("Should return player balances", async function () {
      const { gameEscrow, usdc, creator, player1, player2, player3, player4, oracle } = await loadFixture(deployGameEscrowFixture);

      // Create and complete a game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("100", 6),
        4,
        0,
        3600,
        1000,
        200
      );

      await gameEscrow.connect(player1).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player2).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player3).joinGame(0, 0);
      await time.increase(6);
      await gameEscrow.connect(player4).joinGame(0, 0);

      await gameEscrow.connect(oracle).reportGameResult(0, [player1.address]);

      const [tokens, amounts] = await gameEscrow.getPlayerBalances(player1.address);
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(await usdc.getAddress());
      expect(amounts[0]).to.be.gt(0);
    });
  });

  describe("TVL Circuit Breakers", function () {
    it("Should prevent joining when TVL limit exceeded", async function () {
      const { gameEscrow, usdc, admin, creator, player1 } = await loadFixture(deployGameEscrowFixture);

      // Set very low TVL limit
      await gameEscrow.connect(admin).updateTVLLimits(ethers.parseUnits("50", 6));

      // Create game with high entry fee
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("100", 6), // 100 USDC exceeds 50 USDC limit
        4,
        0,
        3600,
        500,
        200
      );

      // Try to join (should fail due to TVL limit)
      await expect(
        gameEscrow.connect(player1).joinGame(0, 0)
      ).to.be.revertedWithCustomError(gameEscrow, "ExceedsLimit");
    });

    it("Should prevent joining when token limit exceeded", async function () {
      const { gameEscrow, usdc, admin, creator, player1 } = await loadFixture(deployGameEscrowFixture);

      // Set very low token limit
      await gameEscrow.connect(admin).updateTokenLimit(await usdc.getAddress(), ethers.parseUnits("50", 6));

      // Create game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("100", 6),
        4,
        0,
        3600,
        500,
        200
      );

      // Try to join (should fail)
      await expect(
        gameEscrow.connect(player1).joinGame(0, 0)
      ).to.be.revertedWithCustomError(gameEscrow, "ExceedsLimit");
    });
  });

  describe("Rate Limiting", function () {
    it("Should track games played per day", async function () {
      const { gameEscrow, usdc, creator, player1 } = await loadFixture(deployGameEscrowFixture);

      // Create first game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );

      // Join game
      await gameEscrow.connect(player1).joinGame(0, 0);

      // Check counter
      expect(await gameEscrow.gamesPlayedToday(player1.address)).to.equal(1);
    });

    it("Should reset daily counter after 24 hours", async function () {
      const { gameEscrow, usdc, creator, player1 } = await loadFixture(deployGameEscrowFixture);

      // Join first game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );
      await gameEscrow.connect(player1).joinGame(0, 0);

      expect(await gameEscrow.gamesPlayedToday(player1.address)).to.equal(1);

      // Advance time by 1 day + 1 second
      await time.increase(86401);

      // Create and join second game
      await gameEscrow.connect(creator).createGame(
        await usdc.getAddress(),
        0,
        ethers.parseUnits("10", 6),
        4,
        0,
        3600,
        500,
        200
      );
      await gameEscrow.connect(player1).joinGame(1, 0);

      // Counter should be reset to 1
      expect(await gameEscrow.gamesPlayedToday(player1.address)).to.equal(1);
    });
  });
});
