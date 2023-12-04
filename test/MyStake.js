const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("MyStake", function () {

    let myStake;
    let stakeToken;
    let rewardToken;
    let owner, signer1, signer2, signer3;
    let timeStampBefore;
  
    before(async function() {
        [owner, signer1, signer2, signer3] = await ethers.getSigners();

        const StakeToken = await ethers.getContractFactory("StakeToken");
        stakeToken = await StakeToken.deploy(owner.address);
        stakeToken.mint(signer1.address, ethers.parseEther("1000"));
        stakeToken.mint(signer2.address, ethers.parseEther("20000"));
        stakeToken.mint(signer3.address, ethers.parseEther("20000"));

        const RewardToken = await ethers.getContractFactory("RewardToken");
        rewardToken = await RewardToken.deploy(owner.address);
        
        const MyStake = await ethers.getContractFactory("MyStake");
        myStake = await MyStake.deploy(await stakeToken.getAddress(), await rewardToken.getAddress(), owner.address);
        
        rewardToken.mint(await myStake.getAddress(), ethers.parseEther("1000000"));
    })

    describe("constructor", function() {
        it("should be set stake token and reward token", async function() {
            expect(await myStake.stakeToken()).to.equal(await stakeToken.getAddress());
            expect(await myStake.rewardToken()).to.equal(await rewardToken.getAddress());
        })
    })

    describe("setTotalReward", function() {
        it("should be set totalReward", async function() {
            await myStake.connect(owner).setTotalReward(ethers.parseEther("2000000"));
            expect(await myStake.totalReward()).to.equal(ethers.parseEther("2000000"));
        })
    })

    describe("setDuration", function() {
        it("should be set duration", async function() {
            await myStake.connect(owner).setDuration(2000000);
            expect(await myStake.duration()).to.equal(2000000);
        })
    })

    describe("deposit", function() {
        it("should be revert if amount is zero", async function() {
           await expect(myStake.connect(signer1).deposit(ethers.parseEther("0")))
            .to.be.revertedWithCustomError(myStake, "InvalidAmount");
        })

        it("successful deposit transaction for first deposit", async function() {
            stakeToken.connect(signer1).approve(await myStake.getAddress(), ethers.parseEther("1000"));
            timeStampBefore = await helpers.time.increase(1000);
            await expect(myStake.connect(signer1).deposit(ethers.parseEther("1000")))
                .to.emit(myStake, "Deposit").withArgs(signer1.address, ethers.parseEther("1000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("1000"));
            expect(await myStake.deposits(signer1.address)).to.equal(ethers.parseEther("1000"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("1000"));
        })

        it("successful reward transaction for first deposit", async function() {
            expect(await myStake.rewardPerToken()).to.equal(0);
            expect(await myStake.rewards(signer1.address)).to.equal(ethers.parseEther("0"));
            expect(await myStake.userRewardPerTokenPaid(signer1.address)).to.equal(0);
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })

        it("successful deposit transaction for second deposit", async function() {
            stakeToken.connect(signer2).approve(await myStake.getAddress(), ethers.parseEther("20000"));
            timeStampBefore = await helpers.time.increase(49000);
            await expect(myStake.connect(signer2).deposit(ethers.parseEther("20000")))
                .to.emit(myStake, "Deposit").withArgs(signer2.address, ethers.parseEther("20000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("21000"));
            expect(await myStake.deposits(signer2.address)).to.equal(ethers.parseEther("20000"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("21000"));            
        })

        it("successful reward transaction for second deposit", async function() {
            expect(await myStake.rewardPerToken()).to.equal(49);
            expect(await myStake.rewards(signer2.address)).to.equal(ethers.parseEther("0"));
            expect(await myStake.userRewardPerTokenPaid(signer2.address)).to.equal(49);
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })

        it("successful deposit transaction for third deposit", async function() {
            stakeToken.connect(signer3).approve(await myStake.getAddress(), ethers.parseEther("20000"));
            timeStampBefore = await helpers.time.increase(20000);
            await expect(myStake.connect(signer3).deposit(ethers.parseEther("10000")))
                .to.emit(myStake, "Deposit").withArgs(signer3.address, ethers.parseEther("10000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("31000"));
            expect(await myStake.deposits(signer3.address)).to.equal(ethers.parseEther("10000"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("31000"));            
        })

        it("successful reward transaction for third deposit", async function() {
            expect(await myStake.rewardPerToken()).to.equal(49);
            expect(await myStake.rewards(signer3.address)).to.equal(ethers.parseEther("0"));
            expect(await myStake.userRewardPerTokenPaid(signer3.address)).to.equal(49);
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })
    })

    describe("withdraw", function() {
        it("should be revert if amount is more than deposit amount", async function() {
            await expect(myStake.connect(signer1).withdraw(ethers.parseEther("2000")))
             .to.be.revertedWithCustomError(myStake, "InvalidAmount");
        })

        it("successful withdraw transaction for first withdraw", async function() {
            timeStampBefore = await helpers.time.increase(30000);
            await expect(myStake.connect(signer1).withdraw(ethers.parseEther("1000")))
                .to.emit(myStake, "Withdraw").withArgs(signer1.address, ethers.parseEther("1000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("30000"));
            expect(await stakeToken.balanceOf(signer1.address)).to.equal(ethers.parseEther("1000"));
            expect(await myStake.deposits(signer1.address)).to.equal(ethers.parseEther("0"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("30000"));
            expect(await myStake.userRewardPerTokenPaid(signer1.address)).to.equal(0);
        })

        it("successful reward transaction for first withdraw", async function() {
            expect(await myStake.rewardPerToken()).to.equal(49);
            expect(await myStake.rewards(signer1.address)).to.equal(ethers.parseEther("49000"));
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })

        it("successful deposit transaction for fourth deposit", async function() {
            stakeToken.connect(signer3).approve(await myStake.getAddress(), ethers.parseEther("10000"));
            timeStampBefore = await helpers.time.increase(400000);
            await expect(myStake.connect(signer3).deposit(ethers.parseEther("10000")))
                .to.emit(myStake, "Deposit").withArgs(signer3.address, ethers.parseEther("10000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("40000"));
            expect(await myStake.deposits(signer3.address)).to.equal(ethers.parseEther("20000"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("40000"));            
        })

        it("successful reward transaction for fourth deposit", async function() {
            expect(await myStake.rewardPerToken()).to.equal(62);
            expect(await myStake.rewards(signer3.address)).to.equal(ethers.parseEther("130000"));
            expect(await myStake.userRewardPerTokenPaid(signer3.address)).to.equal(62);
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })

        it("successful withdraw transaction for second withdraw", async function() {
            timeStampBefore = await helpers.time.increase(500000);
            await expect(myStake.connect(signer2).withdraw(ethers.parseEther("20000")))
                .to.emit(myStake, "Withdraw").withArgs(signer2.address, ethers.parseEther("20000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("20000"));
            expect(await stakeToken.balanceOf(signer2.address)).to.equal(ethers.parseEther("20000"));
            expect(await myStake.deposits(signer2.address)).to.equal(ethers.parseEther("0"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("20000")); 
            expect(await myStake.userRewardPerTokenPaid(signer2.address)).to.equal(0);           
        })

        it("successful reward transaction for second withdraw", async function() {
            expect(await myStake.rewardPerToken()).to.equal(74);
            expect(await myStake.rewards(signer2.address)).to.equal(ethers.parseEther("500000"));
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })

        it("successful withdraw transaction for third withdraw", async function() {
            timeStampBefore = await helpers.time.increase(500000);
            await expect(myStake.connect(signer3).withdraw(ethers.parseEther("20000")))
                .to.emit(myStake, "Withdraw").withArgs(signer3.address, ethers.parseEther("20000"), timeStampBefore + 1);

            expect(await stakeToken.balanceOf(myStake.getAddress())).to.equal(ethers.parseEther("0"));
            expect(await stakeToken.balanceOf(signer3.address)).to.equal(ethers.parseEther("20000"));
            expect(await myStake.deposits(signer3.address)).to.equal(ethers.parseEther("0"));
            expect(await myStake.totalSupply()).to.equal(ethers.parseEther("0")); 
            expect(await myStake.userRewardPerTokenPaid(signer2.address)).to.equal(0);           
        })

        it("successful reward transaction for third withdraw", async function() {
            expect(await myStake.rewardPerToken()).to.equal(99);
            expect(await myStake.rewards(signer3.address)).to.equal(ethers.parseEther("870000"));
            expect(await myStake.lastUpdateTime()).to.equal(timeStampBefore + 1);
        })
    })

    describe("claim", function() {
        it("successful claim transaction", async function() {
            rewardToken.connect(await myStake.getAddress()).approve(signer1.address, ethers.parseEther("49000"));
            await expect(myStake.connect(signer1).claim())
                .to.emit(myStake, "Claim").withArgs(signer1.address, ethers.parseEther("49000"));

            expect(await rewardToken.balanceOf(signer1.address)).to.equal(ethers.parseEther("49000"));
            expect(await myStake.rewards(signer1.address)).to.equal(ethers.parseEther("0"));
        })
    })
});
