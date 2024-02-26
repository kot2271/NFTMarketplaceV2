import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTMarketplaceV2 } from "../typechain";
import { MyNFTMock } from "../typechain";
import { ERC20Mock } from "../typechain";
import { MaliciousContract } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("NFTMarketplaceV2", () => {
  let nftMarketplace: NFTMarketplaceV2;
  let nftMockContract: MyNFTMock;
  let erc20Contract: ERC20Mock;

  let admin: SignerWithAddress;
  let artist: SignerWithAddress;
  let buyer: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async () => {
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplaceV2");
    nftMarketplace = await NFTMarketplace.deploy();

    const MyNFTMock = await ethers.getContractFactory("MyNFTMock");
    nftMockContract = await MyNFTMock.deploy("TestNFT", "TNFT");

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    erc20Contract = await ERC20Mock.deploy();

    [admin, artist, buyer, user] = await ethers.getSigners();

    await nftMarketplace.connect(admin).grantArtistRole(artist.address);

    await erc20Contract
      .connect(admin)
      .transfer(buyer.address, ethers.utils.parseEther("10"));
    await erc20Contract
      .connect(admin)
      .transfer(user.address, ethers.utils.parseEther("10"));
  });

  describe("grantArtistRole", () => {
    it("should grant the artist role to a buyer", async () => {
      await expect(
        nftMarketplace.connect(admin).grantArtistRole(buyer.address)
      ).to.emit(nftMarketplace, "RoleGranted");

      const ARTIST_ROLE = ethers.utils.id("ARTIST_ROLE");
      // second variant to get ARTIST_ROLE
      // const ARTIST_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ARTIST_ROLE"));

      const hasRole = await nftMarketplace.hasRole(ARTIST_ROLE, buyer.address);
      expect(hasRole).to.equal(true);
    });

    it("should revert if the caller is not the admin", async () => {
      await expect(
        nftMarketplace.connect(artist).grantArtistRole(buyer.address)
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "MustHaveAdminRoleToGrant"
      );
    });
  });

  describe("createItem", () => {
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let tokenURI: string;
    beforeEach(async () => {
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      tokenURI = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${collectionId}.png`;
    });
    it("should create an item correctly", async () => {
      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");
        
      await expect(
        nftMarketplace.connect(artist).createItem(collectionId, tokenURI)
      ).to.emit(nftMarketplace, "ItemCreated")
        .withArgs(tokenId, artist.address);
    });

    it("should revert if role is not artist", async () => {
      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await expect(
        nftMarketplace.connect(buyer).createItem(collectionId, tokenURI)
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "MustHaveArtistRoleToMintToken"
      );
    });

    it("should revert if sender is not collection creator", async () => {
      await nftMarketplace.connect(admin).grantArtistRole(buyer.address);
      await nftMarketplace.connect(buyer).createCollection("collection1", "c1");
      await expect(
        nftMarketplace.connect(artist).createItem(collectionId, tokenURI)
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "MustBeCollectionCreator"
      );
    });

    it.only("should create multiple items in the same collection correctly", async () => {
      await nftMarketplace.connect(artist).createCollection("collection1", "c1");
      await nftMarketplace.connect(artist).createItem(collectionId, tokenURI);
      const tokenURI2 = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=2.png`;
      await nftMarketplace.connect(artist).createItem(collectionId, tokenURI2);
      const tokenURI3 = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=3.png`;
      await expect(
        nftMarketplace.connect(artist).createItem(collectionId, tokenURI3)
      ).to.emit(nftMarketplace, "ItemCreated")
        .withArgs(tokenId.add(2), artist.address);
    });
  });

  describe("listItem", () => {
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let tokenURI: string;
    let price: BigNumber;
    beforeEach(async () => {
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      tokenURI = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${collectionId}.png`;
      price = ethers.utils.parseEther("1");

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenURI);
    });
    it("should list an item correctly with ERC20 tokens", async () => {
      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, erc20Contract.address);

      const listing = await nftMarketplace.listings(tokenId);
      expect(listing.seller).to.equal(artist.address);
      expect(listing.price).to.equal(price);
      expect(listing.paymentToken).to.equal(erc20Contract.address);
    });

    it("should list an item correctly with ETH", async () => {
      const paymentToken = ethers.constants.AddressZero;
      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, paymentToken);

      const listing = await nftMarketplace.listings(tokenId);
      expect(listing.seller).to.equal(artist.address);
      expect(listing.price).to.equal(price);
      expect(listing.paymentToken).to.equal(paymentToken);
    });

    it("should revert if sender does not own the token", async () => {
      await expect(
        nftMarketplace
          .connect(buyer)
          .listItem(collectionId, tokenId, price, erc20Contract.address)
      ).to.be.revertedWithCustomError(nftMarketplace, "MustOwnToken");
    });

    it("should revert if token is already listed", async () => {
      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, erc20Contract.address);

      await expect(
        nftMarketplace
          .connect(artist)
          .listItem(collectionId, tokenId, price, erc20Contract.address)
      ).to.be.revertedWithCustomError(nftMarketplace, "TokenAlreadyListed");
    });
  });

  describe("cancelListing", () => {
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let tokenURI: string;
    let price: BigNumber;
    beforeEach(async () => {
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      tokenURI = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${collectionId}.png`;
      price = ethers.utils.parseEther("1");

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenURI);
      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, erc20Contract.address);
    });
    it("should cancel listing correctly", async () => {
      await expect(
        nftMarketplace.connect(artist).cancelListing(collectionId, tokenId)
      ).to.emit(nftMarketplace, "ListingCanceled")
        .withArgs(collectionId, tokenId);

      expect((await nftMarketplace.listings(tokenId)).seller).to.equal(
        ethers.constants.AddressZero
      );

      expect((await nftMarketplace.listings(tokenId)).tokenId).to.equal(0);
    });

    it("should revert if sender is not token owner", async () => {
      await expect(
        nftMarketplace.connect(buyer).cancelListing(collectionId, tokenId)
      ).to.be.revertedWithCustomError(nftMarketplace, "MustOwnToken");
    });
  });

  describe("listItemOnAuction", () => {
    let bidAmount: BigNumber;
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let price: BigNumber;
    let step: BigNumber;
    beforeEach(async () => {
      bidAmount = ethers.utils.parseEther("2.5");
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      price = ethers.utils.parseEther("2");
      step = ethers.utils.parseEther("0.5");
      const tokenUri: string = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${tokenId}.png`;

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenUri);
    });

    it("should list item on auction correctly", async () => {
      await expect(
        nftMarketplace
          .connect(artist)
          .listItemOnAuction(
            collectionId,
            tokenId,
            price,
            step,
            erc20Contract.address
          )
      ).to.emit(nftMarketplace, "AuctionCreated");

      expect((await nftMarketplace.auctions(tokenId)).paymentToken).to.equal(
        erc20Contract.address
      );

      expect((await nftMarketplace.auctions(tokenId)).minBidIncrement).to.equal(
        step
      );

      expect((await nftMarketplace.auctions(tokenId)).minPrice).to.equal(price);

      expect((await nftMarketplace.auctions(tokenId)).seller).to.equal(
        artist.address
      );
    });

    it("should revert if sender is not token owner", async () => {
      await expect(
        nftMarketplace
          .connect(buyer)
          .listItemOnAuction(
            collectionId,
            tokenId,
            price,
            step,
            erc20Contract.address
          )
      ).to.be.revertedWithCustomError(nftMarketplace, "MustOwnToken");
    });

    it("should revert if auction is already exists", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await expect(
        nftMarketplace
          .connect(artist)
          .listItemOnAuction(
            collectionId,
            tokenId,
            price,
            step,
            erc20Contract.address
          )
      ).to.be.revertedWithCustomError(nftMarketplace, "AuctionAlreadyExists");
    });
  });

  describe("buyItem", () => {
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let tokenURI: string;
    let price: BigNumber;
    beforeEach(async () => {
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      tokenURI = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${collectionId}.png`;
      price = ethers.utils.parseEther("1");

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenURI);
    });
    it("should revert if item not listed", async () => {
      await expect(
        nftMarketplace.connect(buyer).buyItem(2, 2)
      ).to.be.revertedWithCustomError(nftMarketplace, "ItemNotListed");
    });

    it("should buy item correctly with ERC20 tokens", async () => {
      const buyerBalanceBefore: BigNumber = await erc20Contract.balanceOf(
        buyer.address
      );

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;

      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );
      await nftContract.approve(nftMarketplace.address, tokenId);

      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, erc20Contract.address);

      await erc20Contract.connect(buyer).approve(nftMarketplace.address, price);

      await expect(nftMarketplace.connect(buyer).buyItem(collectionId, tokenId))
        .to.emit(nftMarketplace, "ItemBought")
        .withArgs(tokenId, buyer.address, price);

      expect(await erc20Contract.balanceOf(buyer.address)).to.equal(
        buyerBalanceBefore.sub(price)
      );
      expect(await nftContract.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("should buy item correctly with ETH", async () => {
      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);

      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, ethers.constants.AddressZero);

      await expect(
        nftMarketplace
          .connect(buyer)
          .buyItem(collectionId, tokenId, { value: price })
      ).to.emit(nftMarketplace, "ItemBought")
        .withArgs(tokenId, buyer.address, price);

      expect(await nftContract.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("should revert if not enough ETH", async () => {
      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);

      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, ethers.constants.AddressZero);

      await expect(
        nftMarketplace
          .connect(buyer)
          .buyItem(collectionId, tokenId, { value: price.div(2) })
      ).to.be.revertedWithCustomError(nftMarketplace, "InsufficientEthSent");
    });

    it("should prevent reentrancy attacks", async () => {
      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);

      await nftMarketplace
        .connect(artist)
        .listItem(collectionId, tokenId, price, ethers.constants.AddressZero);

      const MaliciousContract = await ethers.getContractFactory(
        "MaliciousContract"
      );
      const maliciousContract: MaliciousContract =
        await MaliciousContract.deploy(
          collectionId,
          tokenId,
          price,
          nftMarketplace.address
        );

      await maliciousContract.deployed();

      await expect(
        maliciousContract.connect(buyer).attack({ value: price.div(5) })
      ).to.be.revertedWithCustomError(nftMarketplace, "InsufficientEthSent");

      const owner = await nftContract.ownerOf(tokenId);
      expect(owner).not.to.equal(buyer.address);
      expect(await maliciousContract.getBalance()).to.be.equal(0);
    });
  });

  describe("createCollection", () => {
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    beforeEach(async () => {
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
    });

    it("should revert if no artist role create collection", async () => {
      await expect(
        nftMarketplace.connect(buyer).createCollection("collection1", "c1")
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "MustHaveArtistRoleToCreateCollection"
      );
    });

    it("should create collection correctly", async () => {
      await expect(
        nftMarketplace.connect(artist).createCollection("collection1", "c1")
      ).to.emit(nftMarketplace, "CollectionCreated")
        .withArgs(
          tokenId,
          artist.address,
          (
            await nftMarketplace.collections(collectionId)
          ).nftContract
        );
    });
  });

  describe("makeBid", () => {
    let bidAmount: BigNumber;
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let price: BigNumber;
    let step: BigNumber;
    beforeEach(async () => {
      bidAmount = ethers.utils.parseEther("2.5");
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      price = ethers.utils.parseEther("2");
      step = ethers.utils.parseEther("0.5");
      const tokenUri: string = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${tokenId}.png`;

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenUri);
    });
    it("should place a bid correctly", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount);

      const auction = await nftMarketplace.auctions(collectionId);
      expect(auction.highestBidder).to.equal(buyer.address);
      expect(auction.highestBid).to.equal(bidAmount);
    });

    it("should revert if tokenId does not exist", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);
      const invalidTokenId: BigNumber = BigNumber.from(9999);

      await expect(
        nftMarketplace
          .connect(buyer)
          .makeBid(collectionId, invalidTokenId, bidAmount)
      ).to.be.revertedWithCustomError(nftMarketplace, "TokenDoesNotExist");
    });

    it("should revert if incorrect bid", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);
      const incorrectBidAmount: BigNumber = ethers.utils.parseEther("2");

      await expect(
        nftMarketplace
          .connect(buyer)
          .makeBid(collectionId, tokenId, incorrectBidAmount)
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "MustSendAtLeastMinimumRequiredBid"
      );
    });

    it("should revert if collection does not exist", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);
      const invalidCollectionId: BigNumber = BigNumber.from(9999);

      await expect(
        nftMarketplace
          .connect(buyer)
          .makeBid(invalidCollectionId, tokenId, bidAmount)
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "TheCollectionDoesNotExist"
      );
    });

    it("should revert if auction time is up", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);
      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;

      await time.increase(endTime.add(60));

      await expect(
        nftMarketplace.connect(buyer).makeBid(collectionId, tokenId, bidAmount)
      ).to.be.revertedWithCustomError(nftMarketplace, "AuctionExpired");
    });

    it("should place a bid correctly with native token", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          ethers.constants.AddressZero
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount, { value: bidAmount });
      
      const auction = await nftMarketplace.auctions(collectionId);
      expect(auction.highestBidder).to.equal(buyer.address);
      expect(auction.highestBid).to.equal(bidAmount);
    });

    it("should revert if sent value does not match the bid", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          ethers.constants.AddressZero
        );

      const incorrectBidAmount: BigNumber = ethers.utils.parseEther("2");
      
      await expect(
        nftMarketplace
          .connect(buyer)
          .makeBid(collectionId, tokenId, bidAmount, {
            value: incorrectBidAmount,
          })
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "SentValueDoesNotMatchTheBid"
      );
    });

    it("should place a higher bid correctly", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      const balanceBuyerBefore = await erc20Contract.balanceOf(buyer.address);

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount);
      const balanceBuyerAfter = await erc20Contract.balanceOf(buyer.address);

      expect(balanceBuyerAfter).to.equal(balanceBuyerBefore.sub(bidAmount));
      const higherBidAmount = bidAmount.add(step);

      await erc20Contract
        .connect(user)
        .approve(nftMarketplace.address, higherBidAmount);

      await expect(
        nftMarketplace
          .connect(user)
          .makeBid(collectionId, tokenId, higherBidAmount)
      ).to.emit(nftMarketplace, "BidPlaced")
        .withArgs(tokenId, user.address, higherBidAmount);
      const balanceBuyerAfterRefundBid = await erc20Contract.balanceOf(
        buyer.address
      );

      expect(balanceBuyerAfterRefundBid).to.equal(balanceBuyerBefore);
    });

    it("should revert if bid is incorrect", async () => {
      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount);

      const higherBidAmount = bidAmount.add(step);

      await expect(
        nftMarketplace
          .connect(user)
          .makeBid(
            collectionId,
            tokenId,
            higherBidAmount.sub(ethers.utils.parseEther("1"))
          )
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "MustSendAtLeastMinimumRequiredBid"
      );
    });
  });

  describe("finishAuction", () => {
    let bidAmount: BigNumber;
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let price: BigNumber;
    let step: BigNumber;
    let highBidAmount: BigNumber;
    let higherBidAmount: BigNumber;
    beforeEach(async () => {
      bidAmount = ethers.utils.parseEther("2.5");
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      price = ethers.utils.parseEther("2");
      step = ethers.utils.parseEther("0.5");
      const tokenUri: string = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${tokenId}.png`;

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenUri);

      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);
      highBidAmount = bidAmount.add(step);
      higherBidAmount = highBidAmount.add(step);

      await erc20Contract
        .connect(user)
        .approve(nftMarketplace.address, highBidAmount);
    });

    it("should finish an auction with a bid correctly", async () => {
      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount);

      await nftMarketplace
        .connect(user)
        .makeBid(collectionId, tokenId, highBidAmount);

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, higherBidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, higherBidAmount);

      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;

      await time.increase(endTime.add(60));

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;

      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);
      await nftMarketplace.connect(artist).finishAuction(collectionId, tokenId);

      const owner = await nftContract.ownerOf(tokenId);
      expect(owner).to.equal(buyer.address);

      const balance = await erc20Contract.balanceOf(artist.address);
      expect(balance).to.equal(higherBidAmount);
    });

    it("should finish an auction without a bid", async () => {
      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;
      await time.increase(endTime.add(60));

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);

      await expect(
        nftMarketplace.connect(artist).finishAuction(collectionId, tokenId)
      ).to.be.revertedWithCustomError(nftMarketplace, "Underbidding");
    });

    it("should revert if the auction has not ended yet", async () => {
      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;

      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);
      await expect(
        nftMarketplace.connect(artist).finishAuction(collectionId, tokenId)
      ).to.be.revertedWithCustomError(nftMarketplace, "AuctionNotYetEnded");
    });

    it("should revert if the caller is not the seller", async () => {
      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount);

      await nftMarketplace
        .connect(user)
        .makeBid(collectionId, tokenId, highBidAmount);

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, higherBidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, higherBidAmount);

      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;
      await time.increase(endTime.add(60));

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);

      await expect(
        nftMarketplace.connect(buyer).finishAuction(collectionId, tokenId)
      ).to.be.revertedWithCustomError(nftMarketplace, "MustOwnToken");
    });

    it("should finish an auction with a bid with native token correctly", async () => {
      const artistBalanceBefore = await ethers.provider.getBalance(
        artist.address
      );
      const bidAmount = ethers.utils.parseEther("2.5");
      const collectionId = BigNumber.from(2);
      const tokenId = BigNumber.from(2);
      const price = ethers.utils.parseEther("2");
      const step = ethers.utils.parseEther("0.5");
      const tokenUri: string = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${tokenId}.png`;

      await nftMarketplace
        .connect(artist)
        .createCollection("collection2", "c2");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenUri);

      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          ethers.constants.AddressZero
        );

      const higherBidAmount = bidAmount.add(step);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount, { value: bidAmount });

      await nftMarketplace
        .connect(user)
        .makeBid(collectionId, tokenId, higherBidAmount, {
          value: higherBidAmount,
        });

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, higherBidAmount.add(step), {
          value: higherBidAmount.add(step),
        });

      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;
      await time.increase(endTime.add(60));

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      await nftContract.approve(nftMarketplace.address, tokenId);

      await nftMarketplace.connect(artist).finishAuction(collectionId, tokenId);

      const owner = await nftContract.ownerOf(tokenId);
      expect(owner).to.equal(buyer.address);
      const artistBalanceAfter = await ethers.provider.getBalance(
        artist.address
      );
      expect(artistBalanceAfter).to.be.greaterThanOrEqual(
        artistBalanceBefore.add(ethers.utils.parseEther("2.99"))
      );
    });
  });

  describe("cancelAuction", () => {
    let bidAmount: BigNumber;
    let collectionId: BigNumber;
    let tokenId: BigNumber;
    let price: BigNumber;
    let step: BigNumber;
    let higherBidAmount: BigNumber;
    beforeEach(async () => {
      bidAmount = ethers.utils.parseEther("2.5");
      collectionId = BigNumber.from(1);
      tokenId = BigNumber.from(1);
      price = ethers.utils.parseEther("2");
      step = ethers.utils.parseEther("0.5");
      const tokenUri: string = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${tokenId}.png`;

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenUri);

      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      await erc20Contract
        .connect(buyer)
        .approve(nftMarketplace.address, bidAmount);

      higherBidAmount = bidAmount.add(step);

      await erc20Contract
        .connect(user)
        .approve(nftMarketplace.address, higherBidAmount);

      await nftMarketplace
        .connect(buyer)
        .makeBid(collectionId, tokenId, bidAmount);

      await nftMarketplace
        .connect(user)
        .makeBid(collectionId, tokenId, higherBidAmount);
    });

    it("should allow the seller to cancel an auction", async () => {
      const userBalanceBefore = await erc20Contract.balanceOf(user.address);
      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;
      await time.increase(endTime.add(60));

      await expect(
        nftMarketplace.connect(artist).cancelAuction(collectionId, tokenId)
      ).to.emit(nftMarketplace, "AuctionCanceled")
        .withArgs(tokenId);

      const userBalanceAfter = await erc20Contract.balanceOf(user.address);
      expect(userBalanceAfter).to.equal(userBalanceBefore.add(higherBidAmount));

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      const owner = await nftContract.ownerOf(tokenId);
      expect(owner).to.equal(artist.address);
    });

    it("should revert if the auction has not yet ended", async () => {
      await expect(
        nftMarketplace.connect(artist).cancelAuction(collectionId, tokenId)
      ).to.be.revertedWithCustomError(nftMarketplace, "AuctionNotYetEnded");
    });

    it("should revert if the caller is not an owner", async () => {
      await expect(
        nftMarketplace.connect(buyer).cancelAuction(collectionId, tokenId)
      ).to.be.revertedWithCustomError(nftMarketplace, "MustOwnToken");
    });

    it("should cancel auction without bid", async () => {
      const collectionId = BigNumber.from(2);
      const tokenId = BigNumber.from(2);
      const price = ethers.utils.parseEther("2");
      const step = ethers.utils.parseEther("0.5");
      const tokenUri: string = `https://ipfs.io/ipfs/QmXWCpuTCHeCKK19vTWUHArzUjDtv3SJss5LRdy8YZ2rSA?filename=${tokenId}.png`;

      await nftMarketplace
        .connect(artist)
        .createCollection("collection1", "c1");

      await nftMarketplace.connect(artist).createItem(collectionId, tokenUri);

      await nftMarketplace
        .connect(artist)
        .listItemOnAuction(
          collectionId,
          tokenId,
          price,
          step,
          erc20Contract.address
        );

      const endTime = (await nftMarketplace.auctions(tokenId)).endTime;
      await time.increase(endTime.add(60));

      await expect(
        nftMarketplace.connect(artist).cancelAuction(collectionId, tokenId)
      ).to.emit(nftMarketplace, "AuctionCanceled")
        .withArgs(tokenId);

      const nftContractAddress = (
        await nftMarketplace.collections(collectionId)
      ).nftContract;
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftMockContract.interface,
        artist
      );

      const owner = await nftContract.ownerOf(tokenId);
      expect(owner).to.equal(artist.address);
      expect((await nftMarketplace.auctions(tokenId)).seller).to.equals(
        ethers.constants.AddressZero
      );
    });
  });
});
