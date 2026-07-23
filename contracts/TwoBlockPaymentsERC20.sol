// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TwoBlockPaymentsERC20
/// @notice ERC-20 counterpart to TwoBlockPayments.sol, for chains where
///         USDC is NOT the native gas currency (e.g. Giwa Sepolia, whose
///         native token is ETH). Same fee structure and event shapes as the
///         native-value contract, but moves funds via `approve` +
///         `transferFrom` on a configured ERC-20 token instead of
///         `msg.value`.
/// @dev The native-value contract (TwoBlockPayments.sol) is unchanged and
///      still used as-is on Arc. This contract is deployed separately per
///      ERC-20-based chain, pointed at that chain's USDC token address.
contract TwoBlockPaymentsERC20 is Ownable, ReentrancyGuard {
    /// @notice Fixed lifetime price of OG membership, in the token's base
    ///         units (6-decimal USDC => 28_000000).
    uint256 public immutable OG_PRICE;

    /// @notice Denominator for the fee basis-point values below (10000 = 100%).
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Platform fee taken from a tip sent by a non-OG (free) wallet: 5%.
    uint16 public constant FREE_TIP_FEE_BPS = 500;

    /// @notice Platform fee taken from a tip sent by an OG wallet: 2%.
    uint16 public constant OG_TIP_FEE_BPS = 200;

    /// @notice The ERC-20 token this contract moves (this chain's USDC,
    ///         e.g. USDC on Giwa Sepolia).
    IERC20 public immutable usdcToken;

    /// @notice Treasury wallet that OG-purchase funds AND tip fees are forwarded to.
    address public treasury;

    /// @notice Tracks which wallets have purchased OG *through this
    ///         contract*. NOTE: TwoBlock treats OG membership as global
    ///         across chains at the application layer (Supabase is the
    ///         source of truth) — this mapping is kept for on-chain
    ///         parity/inspection only and is NOT read by the backend to
    ///         decide OG status.
    mapping(address => bool) public isOG;

    /// @notice Funds that couldn't be forwarded automatically and are held
    ///         here for manual withdrawal (mirrors the native contract's
    ///         pending-withdrawal fallback, but as an ERC-20 balance owed).
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
    error TransferFailed();

    constructor(address initialTreasury, address usdcTokenAddress, uint256 ogPrice) Ownable(msg.sender) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        if (usdcTokenAddress == address(0)) revert ZeroAddress();
        treasury = initialTreasury;
        usdcToken = IERC20(usdcTokenAddress);
        OG_PRICE = ogPrice;
    }

    /// @notice Send a tip to another wallet, optionally tagged to a post.
    ///         Caller must have `approve()`d this contract for at least
    ///         `amount` beforehand. A platform fee is taken off the top —
    ///         5% for free wallets, 2% for OG wallets — and forwarded to
    ///         `treasury`; the remainder goes to `to`.
    /// @param to Recipient wallet (must not be the sender or the zero address).
    /// @param amount Gross tip amount, in the token's base units.
    /// @param postId Off-chain post UUID this tip is attached to, or "" for a
    ///        standalone profile tip. Stored only in the event log.
    function tip(address to, uint256 amount, string calldata postId) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (to == msg.sender) revert CannotTipSelf();

        bool pulled = usdcToken.transferFrom(msg.sender, address(this), amount);
        if (!pulled) revert TransferFailed();

        uint256 feeBps = isOG[msg.sender] ? OG_TIP_FEE_BPS : FREE_TIP_FEE_BPS;
        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        emit Tipped(msg.sender, to, amount, fee, postId);

        if (fee > 0) {
            _forwardOrEscrow(treasury, fee);
        }
        _forwardOrEscrow(to, netAmount);
    }

    /// @notice Pay for OG membership — a single lifetime purchase at a fixed
    ///         price. Caller must have `approve()`d this contract for at
    ///         least `OG_PRICE` beforehand. Reverts if the wallet is already
    ///         OG *on this contract* (see the `isOG` note above — the
    ///         backend, not this mapping, is what makes OG global).
    function purchaseOG() external nonReentrant {
        if (isOG[msg.sender]) revert AlreadyOG();

        bool pulled = usdcToken.transferFrom(msg.sender, address(this), OG_PRICE);
        if (!pulled) revert TransferFailed();

        isOG[msg.sender] = true;

        emit OGPurchased(msg.sender, OG_PRICE);
        _forwardOrEscrow(treasury, OG_PRICE);
    }

    /// @notice Pull out any token balance that couldn't be auto-forwarded to you.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);

        bool sent = usdcToken.transfer(msg.sender, amount);
        if (!sent) revert TransferFailed();
    }

    /// @notice Update the treasury address that OG payments/fees are sent to.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @dev Try a direct token transfer first. If it fails (e.g. `to` is a
    ///      contract that reverts on receiving tokens), fall back to
    ///      pull-payment escrow so the sender's tx still succeeds and funds
    ///      are never stuck in this contract.
    function _forwardOrEscrow(address to, uint256 amount) private {
        try usdcToken.transfer(to, amount) returns (bool success) {
            if (!success) {
                pendingWithdrawals[to] += amount;
            }
        } catch {
            pendingWithdrawals[to] += amount;
        }
    }
}
