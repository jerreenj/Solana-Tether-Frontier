# CloakPay AI Submission Checklist

## Required Links

- Live preview: https://cloakpay-ai.vercel.app
- Public GitHub repo: https://github.com/jerreenj/CloakPayAI-Solana-Tether
- README: https://github.com/jerreenj/CloakPayAI-Solana-Tether#readme

## Final Demo Flow

1. Open the live preview.
2. Click **Try Without Wallet**.
3. Run the safe invoice sample.
4. Run the risky invoice sample.
5. Show the risk verdict, warnings, and evidence.
6. Create a privacy receipt.
7. Show local history and feedback.
8. For wallet proof, connect a Solana wallet, start on devnet with faucet SOL, then optionally switch to mainnet-beta only after confirming the real-funds warning.

## What To Say

CloakPay AI is a local-first QVAC Tether payment firewall for Solana payments. It checks private invoice context before a wallet signs, then prepares a confirmed SOL payment on devnet or mainnet-beta with a privacy-safe receipt.

## Product Truth

- Devnet and mainnet-beta SOL transfer preparation are enabled.
- Mainnet requires explicit real-funds confirmation before transaction preparation.
- Hosted preview uses the free fallback path for reliability.
- Live QVAC OCR proof should be shown locally with `QVAC_MOCK=0`.
- No paid AI, paid OCR, paid RPC, paid database, or paid assets are required.
- USDT is analyzed in payment intents; on-chain transaction preparation currently supports SOL only.

## Final Checks Before Submit

- `npm run typecheck`
- `npm run build`
- Open https://cloakpay-ai.vercel.app
- Confirm the GitHub repo description points to the live preview
- Confirm the README includes the live preview and submission links
- Record a 2-minute walkthrough
