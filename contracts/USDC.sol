// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title USDC
/// @notice A self-deployed ERC-20 on chains where real USDC isn't officially
///         integrated yet (e.g. Giwa Sepolia) — named/symboled the same as
///         Arc's native USDC so the app treats both chains' USDC the same
///         way in the UI. 6 decimals to match real USDC's convention — NOT
///         18, unlike Arc's native-USDC representation.
/// @dev Testnet-only; this specific deployment has no real-world value. It
///      exists purely so TwoBlockPaymentsERC20 has something to move via
///      approve/transferFrom on chains whose native currency isn't USDC.
contract USDC is ERC20, Ownable {
    /// @notice Amount minted to a caller per `faucet()` claim (1000 USDC).
    uint256 public constant FAUCET_AMOUNT = 1000 * 10 ** 6;

    /// @notice Minimum time a wallet must wait between faucet claims.
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /// @notice Last faucet claim timestamp per wallet, used to enforce the
    ///         cooldown and prevent a single address draining the faucet.
    mapping(address => uint256) public lastFaucetClaim;

    error FaucetCooldownActive(uint256 secondsRemaining);

    event FaucetClaimed(address indexed to, uint256 amount);

    constructor() ERC20("USDC", "USDC") Ownable(msg.sender) {}

    /// @notice USDC uses 6 decimals, not the ERC-20 default of 18.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Public faucet — anyone can claim FAUCET_AMOUNT once per
    ///         FAUCET_COOLDOWN. Intended to be called directly from the
    ///         TwoBlock UI's Faucet menu so users never have to touch a
    ///         contract address manually.
    function faucet() external {
        uint256 nextClaimAt = lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucetClaim[msg.sender] != 0 && block.timestamp < nextClaimAt) {
            revert FaucetCooldownActive(nextClaimAt - block.timestamp);
        }

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Seconds remaining before `account` can claim the faucet
    ///         again. Returns 0 if they can claim right now. Lets the UI
    ///         show a countdown/disable the claim button without guessing.
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 nextClaimAt = lastFaucetClaim[account] + FAUCET_COOLDOWN;
        if (lastFaucetClaim[account] == 0 || block.timestamp >= nextClaimAt) {
            return 0;
        }
        return nextClaimAt - block.timestamp;
    }

    /// @notice Owner-only mint, separate from the public faucet — for
    ///         topping up the treasury or other operational needs without
    ///         being subject to the faucet cooldown.
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
