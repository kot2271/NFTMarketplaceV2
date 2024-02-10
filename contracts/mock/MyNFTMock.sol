// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MyNFTMock is ERC721, AccessControl, ERC721URIStorage {
    // Constant for minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Constant for burner role
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    // Grant minter role to contract
    function grantMinterRole(
        address _contract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, _contract);
    }

    // Grant burner role to contract
    function grantBurnerRole(
        address _contract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(BURNER_ROLE, _contract);
    }

    function mint(uint96 _tokenId, address _to, string calldata _tokenURI) external {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        
        _safeMint(_to, _tokenId);
        _setTokenURI(_tokenId, _tokenURI);
    }

    function burn(uint96 _tokenId) external {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");
        
        _burn(_tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal override {
        super._setTokenURI(tokenId, _tokenURI);
    }

    function _burn(uint256 _tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(_tokenId);
    }

    function tokenURI(uint256 _tokenId) public view virtual  override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(_tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual  override(ERC721, AccessControl, ERC721URIStorage) returns (bool) {
       return super.supportsInterface(interfaceId);
   }
}