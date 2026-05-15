// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HMallToken
 * @dev ERC20 token for HMall virtual currency system
 * This token represents virtual coins in the HMall platform
 */
contract HMallToken is ERC20, Ownable {
    // Mapping to track if an address is authorized to mint/burn tokens
    mapping(address => bool) public authorizedMinters;

    // Event emitted when a minter is authorized/revoked
    event MinterAuthorized(address indexed minter, bool authorized);

    /**
     * @dev Constructor - mints initial supply to the contract deployer
     * @param initialSupply Initial amount of tokens to mint
     */
    constructor(uint256 initialSupply) ERC20("HMall Virtual Coin", "HMALL") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Authorize or revoke minter privileges
     * @param minter Address to authorize/revoke
     * @param authorized True to authorize, false to revoke
     */
    function setMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }

    /**
     * @dev Mint new tokens (only authorized minters)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(authorizedMinters[msg.sender], "HMallToken: not authorized to mint");
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens (only authorized minters)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external {
        require(authorizedMinters[msg.sender], "HMallToken: not authorized to burn");
        _burn(from, amount);
    }

    /**
     * @dev Transfer tokens with additional validation
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        return super.transfer(to, amount);
    }
}





