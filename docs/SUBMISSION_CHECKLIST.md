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
8. For wallet proof, connect a Solana devnet wallet with faucet SOL and sign/send a devnet transfer.

## What To Say

CloakPay AI is a local-first QVAC Tether payment firewall for Solana payments. It checks private invoice context before a wallet signs, then only sends the confirmed devnet payment to Solana.

## Product Truth

- Public preview is devnet only.
- Mainnet is intentionally locked.
- Hosted preview uses the free fallback path for reliability.
- Live QVAC OCR proof should be shown locally with `QVAC_MOCK=0`.
- No paid AI, paid OCR, paid RPC, paid database, paid assets, or mainnet funds are required.

## Final Checks Before Submit

- `npm run typecheck`
- `npm run build`
- Open https://cloakpay-ai.vercel.app
- Confirm the GitHub repo description points to the live preview
- Confirm the README includes the live preview and submission links
- Record a 2-minute walkthrough
