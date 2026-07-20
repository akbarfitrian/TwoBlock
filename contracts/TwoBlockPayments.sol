// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TwoBlockPayments
/// @notice On-chain routing for TwoBlock's two native-USDC payment flows
///         (post tips and the OG lifetime-membership purchase). Every
///         payment goes through this contract so it emits a canonical,
///         indexable event that the backend can verify against instead of
///         trusting client-submitted `to`/`amount` values.
/// @dev Deployed on Arc, where USDC is the chain's native gas currency, so
///      "amount" here is just `msg.value` — no ERC-20 `approve`/`transferFrom`.
contract TwoBlockPayments is Ownable, ReentrancyGuard {
    /// @notice Fixed lifetime price of OG membership, in wei (native USDC).
    uint256 public constant OG_PRICE = 28 ether;

    /// @notice Denominator for the fee basis-point values below (10000 = 100%).
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Platform fee taken from a tip sent by a non-OG (free) wallet: 5%.
    uint16 public constant FREE_TIP_FEE_BPS = 500;

    /// @notice Platform fee taken from a tip sent by an OG wallet: 2%.
    uint16 public constant OG_TIP_FEE_BPS = 200;

    /// @notice Treasury wallet that OG-purchase funds AND tip fees are forwarded to.
    address payable public treasury;

    /// @notice Tracks which wallets have purchased OG. Used on-chain so
    ///         other contract logic (e.g. future fee tiers) can check
    ///         membership without an off-chain round trip.
    mapping(address => bool) public isOG;

    /// @notice Funds that couldn't be forwarded automatically (recipient
    ///         rejected the transfer) and are held here for manual withdrawal.
    mapping(address => uint256) public pendingWithdrawals;

    event Tipped(address indexed from, address indexed to, uint256 amount, uint256 fee, string postId);
    event OGPurchased(address indexed wallet, uint256 amount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event Withdrawn(address indexed account, uint256 amount);

    error ZeroAmount();
    error ZeroAddress();
    error CannotTipSelf();
    error NothingToWithdraw();
    error AlreadyOG();
    error WrongAmount();

    constructor(address payable initialTreasury) Ownable(msg.sender) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        treasury = initialTreasury;
    }

    /// @notice Send a tip to another wallet, optionally tagged to a post. A
    ///         platform fee is taken off the top and forwarded to `treasury`
    ///         — 5% for free wallets, 2% for OG wallets — and the remainder
    ///         goes to `to`. `amount` in the `Tipped` event is always the
    ///         gross amount the sender paid (what the backend/UI treat as
    ///         "the tip"); `fee` is broken out separately for transparency.
    /// @param to Recipient wallet (must not be the sender or the zero address).
    /// @param postId Off-chain post UUID this tip is attached to, or "" for a
    ///        standalone profile tip. Stored only in the event log.
    function tip(address payable to, string calldata postId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (to == msg.sender) revert CannotTipSelf();

        uint256 feeBps = isOG[msg.sender] ? OG_TIP_FEE_BPS : FREE_TIP_FEE_BPS;
        uint256 fee = (msg.value * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = msg.value - fee;

        emit Tipped(msg.sender, to, msg.value, fee, postId);

        if (fee > 0) {
            _forwardOrEscrow(treasury, fee);
        }
        _forwardOrEscrow(to, netAmount);
    }

    /// @notice Pay for OG membership — a single lifetime purchase at a fixed
    ///         price, no tiers, no billing period. Reverts if the wallet is
    ///         already OG or the amount doesn't match `OG_PRICE`.
    function purchaseOG() external payable nonReentrant {
        if (isOG[msg.sender]) revert AlreadyOG();
        if (msg.value != OG_PRICE) revert WrongAmount();

        isOG[msg.sender] = true;

        emit OGPurchased(msg.sender, msg.value);
        _forwardOrEscrow(treasury, msg.value);
    }

    /// @notice Pull out any balance that couldn't be auto-forwarded to you.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw transfer failed");
    }

    /// @notice Update the treasury address that OG payments are sent to.
    function setTreasury(address payable newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @dev Try a direct push transfer first (cheap, best UX). If the
    ///      recipient can't accept it (e.g. a contract with no payable
    ///      fallback, or one that reverts), fall back to pull-payment
    ///      escrow so the sender's tx still succeeds and funds are never
    ///      stuck in this contract.
    function _forwardOrEscrow(address payable to, uint256 amount) private {
        (bool success, ) = to.call{value: amount, gas: 30_000}("");
        if (!success) {
            pendingWithdrawals[to] += amount;
        }
    }
}
