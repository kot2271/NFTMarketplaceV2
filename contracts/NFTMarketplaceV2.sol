// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./mock/MyNFTMock.sol";

contract NFTMarketplaceV2 is ReentrancyGuard, AccessControl {
    bytes32 public constant ARTIST_ROLE = keccak256("ARTIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint24 public immutable AUCTION_DURATION = 3 days;

    struct Collection {
        address creator;
        MyNFTMock nftContract;
    }

    struct Listing {
        uint96 tokenId;
        address seller;
        uint96 price;
        address paymentToken;
    }

    struct Auction {
        uint96 tokenId;
        address seller;
        uint96 minPrice;
        address paymentToken;
        uint96 highestBid;
        address highestBidder;
        uint16 bitCounter;
        uint96 minBidIncrement;
        uint64 endTime;
    }

    mapping(uint32 => Collection) public collections;
    mapping(uint96 => Listing) public listings;
    mapping(uint96 => Auction) public auctions;

    uint32 private _collectId = 0;
    uint96 private _itemIds = 0;

    event CollectionCreated(
        uint32 indexed collectionId,
        address indexed creator,
        address indexed nftContract
    );

    event ItemListed(
        uint96 indexed tokenId,
        uint96 price,
        address indexed paymentToken
    );

    event ItemBought(
        uint96 indexed tokenId,
        address indexed buyer,
        uint96 price
    );

    event ListingCanceled(uint32 indexed collectionId, uint96 indexed tokenId);

    event AuctionCreated(
        uint96 indexed tokenId,
        address indexed paymentToken,
        uint96 minPrice,
        uint96 step
    );

    event BidPlaced(uint96 indexed tokenId, address indexed bidder, uint96 bid);

    event AuctionEnded(
        uint96 indexed tokenId,
        address indexed winner,
        uint96 winningBid
    );

    event AuctionCanceled(uint96 indexed tokenId);

    event ItemCreated(uint96 indexed tokenId, address indexed owner);

    error MustOwnToken();
    error ItemNotListed();
    error InsufficientEthSent();
    error BuyItemFailed();
    error TheCollectionDoesNotExist();
    error TokenDoesNotExist();
    error AuctionExpired();
    error MustSendAtLeastMinimumRequiredBid();
    error SentValueDoesNotMatchTheBid();
    error FailedToMakeBid();
    error MustHaveArtistRoleToCreateCollection();
    error MustHaveArtistRoleToMintToken();
    error MustBeCollectionCreator();
    error MintTokenFailed();
    error TokenAlreadyListed();
    error AuctionAlreadyExists();
    error AuctionNotYetEnded();
    error Underbidding();
    error FinishAuctionFailed();
    error AuctionAlreadyEnded();
    error MustHaveAdminRoleToGrant();
    error RefundFailed();

    modifier onlyTokenOwner(uint32 _collectionId, uint96 _tokenId) {
        if (
            collections[_collectionId].nftContract.ownerOf(_tokenId) !=
            msg.sender
        ) revert MustOwnToken();
        _;
    }

    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    receive() external payable {}

    function buyItem(
        uint32 _collectionId,
        uint96 _tokenId
    ) external payable nonReentrant {
        if (listings[_tokenId].price <= 0) revert ItemNotListed();
        if (listings[_tokenId].paymentToken == address(0)) {
            if (msg.value != listings[_tokenId].price)
                revert InsufficientEthSent();
            (bool buySuccess, ) = listings[_tokenId].seller.call{
                value: msg.value
            }("");
            if (!buySuccess) revert BuyItemFailed();
        } else {
            bool buyErc20Success = IERC20(listings[_tokenId].paymentToken)
                .transferFrom(
                    msg.sender,
                    listings[_tokenId].seller,
                    listings[_tokenId].price
                );
            if (!buyErc20Success) revert BuyItemFailed();
        }
        collections[_collectionId].nftContract.safeTransferFrom(
            listings[_tokenId].seller,
            msg.sender,
            _tokenId
        );
        uint96 price = listings[_tokenId].price;
        delete listings[_tokenId];
        emit ItemBought(_tokenId, msg.sender, price);
    }

    function makeBid(
        uint32 _collectionId,
        uint96 _tokenId,
        uint96 _bid
    ) external payable nonReentrant {
        if (address(collections[_collectionId].nftContract) == address(0))
            revert TheCollectionDoesNotExist();
        if (auctions[_tokenId].tokenId == 0) revert TokenDoesNotExist();
        if (block.timestamp >= auctions[_tokenId].endTime)
            revert AuctionExpired();

        uint96 minRequiredBid = auctions[_tokenId].highestBid == 0
            ? auctions[_tokenId].minPrice + auctions[_tokenId].minBidIncrement
            : auctions[_tokenId].highestBid +
                auctions[_tokenId].minBidIncrement;

        if (_bid < minRequiredBid) revert MustSendAtLeastMinimumRequiredBid();
        if (auctions[_tokenId].paymentToken == address(0)) {
            if (msg.value != _bid) revert SentValueDoesNotMatchTheBid();

            (bool makeBidSuccess, ) = address(this).call{value: msg.value}("");
            if (!makeBidSuccess) revert FailedToMakeBid();
        } else {
            bool makeBidErc20Success = IERC20(auctions[_tokenId].paymentToken)
                .transferFrom(msg.sender, address(this), _bid);
            if (!makeBidErc20Success) revert FailedToMakeBid();
        }

        if (auctions[_tokenId].highestBidder != address(0)) {
            _stakeRefunds(_tokenId, auctions[_tokenId].highestBidder);
        }

        auctions[_tokenId].highestBidder = msg.sender;
        auctions[_tokenId].highestBid = _bid;
        auctions[_tokenId].bitCounter += 1;

        emit BidPlaced(_tokenId, msg.sender, _bid);
    }

    function createCollection(
        string calldata _name,
        string calldata _symbol
    ) external {
        if (!hasRole(ARTIST_ROLE, msg.sender))
            revert MustHaveArtistRoleToCreateCollection();
        MyNFTMock nftContract = new MyNFTMock(_name, _symbol);
        _collectId += 1;
        collections[_collectId] = Collection({
            creator: msg.sender,
            nftContract: nftContract
        });
        emit CollectionCreated(_collectId, msg.sender, address(nftContract));
    }

    function createItem(
        uint32 _collectionId,
        string calldata _tokenURI
    ) external {
        if (!hasRole(ARTIST_ROLE, msg.sender))
            revert MustHaveArtistRoleToMintToken();
        if (collections[_collectionId].creator != msg.sender)
            revert MustBeCollectionCreator();
        _itemIds += 1;
        (bool mintSuccess, ) = address(collections[_collectionId].nftContract)
            .call(
                abi.encodeWithSelector(
                    bytes4(keccak256("mint(uint96,address,string)")),
                    _itemIds,
                    msg.sender,
                    _tokenURI
                )
            );
        if (!mintSuccess) revert MintTokenFailed();
        emit ItemCreated(_itemIds, msg.sender);
    }

    function listItem(
        uint32 _collectionId,
        uint96 _tokenId,
        uint96 _price,
        address _tokenAddress
    ) external onlyTokenOwner(_collectionId, _tokenId) {
        if (listings[_tokenId].price != 0) revert TokenAlreadyListed();
        listings[_tokenId] = Listing({
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            paymentToken: _tokenAddress
        });
        emit ItemListed(_tokenId, _price, _tokenAddress);
    }

    function cancelListing(
        uint32 _collectionId,
        uint96 _tokenId
    ) external onlyTokenOwner(_collectionId, _tokenId) {
        delete listings[_tokenId];
        emit ListingCanceled(_collectionId, _tokenId);
    }

    function listItemOnAuction(
        uint32 _collectionId,
        uint96 _tokenId,
        uint96 _price,
        uint96 _step,
        address _tokenAddress
    ) external onlyTokenOwner(_collectionId, _tokenId) {
        if (auctions[_tokenId].endTime != 0) revert AuctionAlreadyExists();
        auctions[_tokenId] = Auction({
            tokenId: _tokenId,
            seller: msg.sender,
            minPrice: _price,
            paymentToken: _tokenAddress,
            highestBid: 0,
            highestBidder: address(0),
            bitCounter: 0,
            minBidIncrement: _step,
            endTime: uint64(block.timestamp + AUCTION_DURATION)
        });
        emit AuctionCreated(_tokenId, _tokenAddress, _price, _step);
    }

    function finishAuction(
        uint32 _collectionId,
        uint96 _tokenId
    ) external onlyTokenOwner(_collectionId, _tokenId) nonReentrant {
        if (block.timestamp < auctions[_tokenId].endTime)
            revert AuctionNotYetEnded();
        if (auctions[_tokenId].bitCounter <= 2) revert Underbidding();
        collections[_collectionId].nftContract.safeTransferFrom(
            auctions[_tokenId].seller,
            auctions[_tokenId].highestBidder,
            _tokenId
        );

        _stakeRefunds(_tokenId, auctions[_tokenId].seller);

        address highestBidder = auctions[_tokenId].highestBidder;
        uint96 highestBid = auctions[_tokenId].highestBid;
        delete auctions[_tokenId];
        emit AuctionEnded(_tokenId, highestBidder, highestBid);
        delete highestBidder;
        delete highestBid;
    }

    function cancelAuction(
        uint32 _collectionId,
        uint96 _tokenId
    ) external onlyTokenOwner(_collectionId, _tokenId) {
        if (block.timestamp < auctions[_tokenId].endTime)
            revert AuctionNotYetEnded();
        if (auctions[_tokenId].highestBidder != address(0)) {
            _stakeRefunds(_tokenId, auctions[_tokenId].highestBidder);
        }

        delete auctions[_tokenId];
        emit AuctionCanceled(_tokenId);
    }

    function grantArtistRole(address user) external {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert MustHaveAdminRoleToGrant();
        _grantRole(ARTIST_ROLE, user);
    }

    function _stakeRefunds(uint96 _tokenId, address _contributor) private {
        if (auctions[_tokenId].paymentToken == address(0)) {
            (bool refundSuccess, ) = _contributor.call{
                value: auctions[_tokenId].highestBid
            }("");
            if (!refundSuccess) revert RefundFailed();
        } else {
            bool refundErc20Success = IERC20(auctions[_tokenId].paymentToken)
                .transfer(_contributor, auctions[_tokenId].highestBid);
            if (!refundErc20Success) revert RefundFailed();
        }
    }
}
