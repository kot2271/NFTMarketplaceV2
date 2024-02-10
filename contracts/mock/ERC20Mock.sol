// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Mock is ERC20, Ownable {

  constructor() ERC20("ERC20Token", "E20T") {
    _mint(msg.sender, 1000 * 10 ** decimals());
  }

  function mint(address to, uint96 amount) public onlyOwner {
    _mint(to, amount);
  }

  function burn(uint96 amount) public onlyOwner {
    _burn(msg.sender, amount);
  }
}