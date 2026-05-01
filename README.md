# CloakPay AI

CloakPay AI, a local-first QVAC payment firewall for Solana payments.

CloakPay AI checks a Solana payment before the user signs it. It analyzes an invoice or payment screenshot locally with QVAC OCR, converts the extracted text into a payment intent, scores the risk, prepares a real Solana devnet transfer, and generates a privacy-safe receipt.

The build path is intentionally $0: no paid APIs, paid hosting, paid RPC, paid databases, paid assets, or mainnet funds.

## Winning Demo

1. Open the local app.
2. Click **Try Without Wallet** for the fastest public preview.
3. Run the safe sample, then the risky sample, or upload a payment screenshot.
4. Show QVAC/local analysis extracting merchant, recipient, amount, token, and memo.
5. Show the payment firewall verdict: safe, review, or block.
6. Wallet testers can get devnet SOL, connect a wallet, prepare/sign/send devnet SOL, and show the explorer link.
7. Show the local privacy receipt, local history, and feedback loop.

The story: private invoice data is analyzed locally before signing; Solana only receives the confirmed payment.

## $0 Build Rules

- No paid AI: use QVAC SDK locally.
- No paid OCR: use QVAC OCR or local deterministic fallback.
- No paid RPC: use public Solana devnet RPC.
- No paid database: use browser state and local runtime only.
- No paid assets: use CSS and generated sample invoices.
- No mainnet funds: use devnet SOL from faucet only.
- Mainnet payments are intentionally disabled for public preview until audits, monitoring, support, and user safeguards are ready.

## Public Preview Rollout

1. Send the Vercel link to 20 users first.
2. Ask most users to click **Try Without Wallet**.
3. Ask wallet testers to use devnet SOL only.
4. Collect feedback through the GitHub issue link inside the app.
5. Use the in-app feedback form and JSON export for live tester sessions.
6. Fix confusing screens or failed wallet paths before sharing with 200 users.

## Preview Product Controls

- First-time guide inside the app.
- Try Without Wallet mode for users who do not have a Solana wallet.
- Devnet SOL instructions for wallet testers.
- Local browser history for analysis, receipt, and transaction proof.
- Local feedback inbox with JSON export and GitHub issue handoff.
- Production readiness panel that keeps mainnet locked until the required controls are real.

## Tech Stack

- Frontend: Vite, React, TypeScript.
- Local API: Node.js, Express, TypeScript.
- AI: `@qvac/sdk` OCR, with fallback mode for demo reliability.
- Blockchain: `@solana/web3.js` on public devnet.

## Commands

```bash
npm install
npm run dev
```

Open:

```bash
http://127.0.0.1:5173/
```

For live local QVAC OCR, start the API with:

```bash
QVAC_MOCK=0 npm run dev
```

Default mode keeps a clearly labeled local fallback so the demo can be rehearsed without waiting on model setup.

## Vercel

The app can run on Vercel's free tier. The deployed version uses the same `/api` paths through serverless functions, and the browser has a local fallback if hosted APIs are unavailable, so the safe/risky sample demo works without a separate paid backend.

Live QVAC OCR should still be demoed locally with `QVAC_MOCK=0` when model setup is ready. The Vercel deploy is for the public product preview and fallback demo path.

## API

- `GET /api/health`
- `GET /api/qvac/status`
- `POST /api/qvac/analyze-payment`
- `POST /api/solana/prepare`
- `POST /api/privacy/receipt`

## Submission Notes

- Track: Tether Frontier Hackathon Track on Superteam Earn.
- Deadline from listing: May 11, 2026.
- Public repo: https://github.com/jerreenj/CloakPayAI-Solana-Tether

## Readiness Docs

- [Security policy](SECURITY.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Mainnet readiness](docs/MAINNET_READINESS.md)
- [QVAC proof plan](docs/QVAC_PROOF.md)
- [Demo script](docs/DEMO_SCRIPT.md)
