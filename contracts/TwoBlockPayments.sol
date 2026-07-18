// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TwoBlockPayments
/// @notice On-chain routing for TwoBlock's two native-USDC payment flows
///         (post tips and verification-tier purchases). Replaces raw
///         wallet-to-wallet transfers: every payment now goes through this
///         contract so it emits a canonical, indexable event that the
///         backend can verify against instead of trusting client-submitted
///         `to`/`amount` values.
/// @dev Deployed on Arc, where USDC is the chain's native gas currency, so
///      "amount" here is just `msg.value` — no ERC-20 `approve`/`transferFrom`.
contract TwoBlockPayments is Ownable, ReentrancyGuard {
    /// @notice Paid verification tiers. `Free` is intentionally excluded —
    ///         it's never purchased on-chain.
    enum Tier {
        Verified,
        VerifiedPro,
        VerifiedMax
    }

    enum Billing {
        Monthly,
        Yearly
    }

    /// @notice Treasury wallet that verification-purchase funds are forwarded to.
    address payable public treasury;

    /// @notice Funds that couldn't be forwarded automatically (recipient
    ///         rejected the transfer) and are held here for manual withdrawal.
    mapping(address => uint256) public pendingWithdrawals;

    event Tipped(address indexed from, address indexed to, uint256 amount, string postId);
    event VerificationPurchased(address indexed wallet, Tier tier, Billing billing, uint256 amount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event Withdrawn(address indexed account, uint256 amount);

    error ZeroAmount();
    error ZeroAddress();
    error CannotTipSelf();
    error NothingToWithdraw();

    constructor(address payable initialTreasury) Ownable(msg.sender) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        treasury = initialTreasury;
    }

    /// @notice Send a tip to another wallet, optionally tagged to a post.
    /// @param to Recipient wallet (must not be the sender or the zero address).
    /// @param postId Off-chain post UUID this tip is attached to, or "" for a
    ///        standalone profile tip. Stored only in the event log.
    function tip(address payable to, string calldata postId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (to == msg.sender) revert CannotTipSelf();

        emit Tipped(msg.sender, to, msg.value, postId);
        _forwardOrEscrow(to, msg.value);
    }

    /// @notice Pay for a verification tier/billing period. Price validation
    ///         against the current price list happens off-chain (Supabase),
    ///         same as before — this just moves the payment itself on-chain
    ///         and gives the backend a signed event to check the amount against.
    function purchaseVerification(Tier tier, Billing billing) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        emit VerificationPurchased(msg.sender, tier, billing, msg.value);
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

    /// @notice Update the treasury address that verification payments are sent to.
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
