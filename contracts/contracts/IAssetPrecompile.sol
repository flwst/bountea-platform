// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAssetPrecompile
 * @notice Interface for pallet_assets precompile on AssetHub
 *
 * ⚠️ IMPORTANT ADDRESS HANDLING:
 *
 * DO NOT HARDCODE PRECOMPILE ADDRESSES!
 *
 * The precompile address must be queried from the chain using Polkadot.js
 * or passed as a constructor parameter. Each AssetHub asset has an
 * ERC20-compatible precompile interface at a deterministic address.
 *
 * Address Format (typical but NOT guaranteed):
 * 0xFFFFFFFF + assetId (padded to 32 bytes)
 *
 * Always query from chain to be safe.
 */
interface IAssetPrecompile {
    /**
     * @notice Transfer tokens to a recipient
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool success);

    /**
     * @notice Mint new tokens (requires mint permission)
     * @param to Recipient address
     * @param amount Amount to mint
     * @return success True if mint succeeded
     */
    function mint(address to, uint256 amount) external returns (bool success);

    /**
     * @notice Burn tokens from an address (requires burn permission)
     * @param from Address to burn from
     * @param amount Amount to burn
     * @return success True if burn succeeded
     */
    function burn(address from, uint256 amount) external returns (bool success);

    /**
     * @notice Get balance of an account
     * @param account Address to check
     * @return balance Token balance
     */
    function balanceOf(address account) external view returns (uint256 balance);

    /**
     * @notice Get total supply of the asset
     * @return supply Total supply
     */
    function totalSupply() external view returns (uint256 supply);

    /**
     * @notice Approve spender to use tokens
     * @param spender Address to approve
     * @param amount Amount to approve
     * @return success True if approval succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool success);

    /**
     * @notice Check allowance for a spender
     * @param owner Token owner
     * @param spender Approved spender
     * @return remaining Remaining allowance
     */
    function allowance(address owner, address spender) external view returns (uint256 remaining);

    /**
     * @notice Transfer tokens from one address to another
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     * @return success True if transfer succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool success);

    /**
     * @notice Get the name of the asset
     * @return name Asset name
     */
    function name() external view returns (string memory name);

    /**
     * @notice Get the symbol of the asset
     * @return symbol Asset symbol
     */
    function symbol() external view returns (string memory symbol);

    /**
     * @notice Get the decimals of the asset
     * @return decimals Number of decimals
     */
    function decimals() external view returns (uint8 decimals);
}
