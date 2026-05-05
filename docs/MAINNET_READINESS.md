# Mainnet Readiness

CloakPay AI now supports SOL transfer preparation on both Solana devnet and mainnet-beta.

## What Is Enabled

- Network selection inside the wallet panel.
- Devnet as the safer default path for public testing.
- Mainnet-beta SOL transaction preparation through `@solana/web3.js`.
- Explicit real-funds confirmation before mainnet transaction preparation is allowed.
- Wallet-side signing only; CloakPay never has custody of keys or funds.
- Mainnet explorer links after signing.
- Local account, local history, local receipt, local monitor events, and support exports.

## What Is Still Operator Responsibility

- External security audit before broad real-money rollout.
- Compliance, privacy policy, and support process for real users.
- Transaction limits and incident playbook.
- Mainnet RPC reliability strategy if free public RPC becomes unstable.
- Full USDT token transfer execution. Current transaction preparation supports SOL only; USDT is analyzed in payment intents but not faked as an on-chain token transfer.

## Mainnet User Warning

The app intentionally requires users to confirm that mainnet uses real funds. This confirmation is not a replacement for an audit; it is a final product guard before wallet signing.
