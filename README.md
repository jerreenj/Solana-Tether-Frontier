<div align="center">
  <br />
  <h1>CloakPay AI</h1>
  <p><strong>A local-first QVAC Tether payment firewall for Solana payments.</strong></p>
  <p>
    Check invoice risk before a wallet signs, send only on Solana devnet for the public preview, and save a privacy-safe receipt without paid services.
  </p>
  <p>
    <a href="https://cloakpay-ai.vercel.app"><strong>Live App</strong></a>
    ·
    <a href="https://github.com/jerreenj/CloakPayAI-Solana-Tether"><strong>GitHub</strong></a>
    ·
    <a href="docs/DEMO_SCRIPT.md"><strong>Demo Script</strong></a>
    ·
    <a href="docs/SUBMISSION_CHECKLIST.md"><strong>Submission Checklist</strong></a>
  </p>
  <p>
    <img alt="Solana" src="https://img.shields.io/badge/Solana-Devnet-14F195?style=flat-square&labelColor=111111" />
    <img alt="QVAC" src="https://img.shields.io/badge/QVAC-Local_AI-E1E0CC?style=flat-square&labelColor=111111" />
    <img alt="Tether" src="https://img.shields.io/badge/Tether-Track-26A17B?style=flat-square&labelColor=111111" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&labelColor=111111" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&labelColor=111111" />
    <img alt="Build Cost" src="https://img.shields.io/badge/Build_Cost-%240-ffffff?style=flat-square&labelColor=111111" />
  </p>
  <br />
</div>

---

CloakPay AI checks a Solana payment before the user signs it. It analyzes an invoice or payment screenshot locally with QVAC OCR, converts extracted text into a payment intent, scores the risk, prepares a real Solana devnet transfer, and generates a privacy-safe receipt.

This is a public-preview hackathon MVP, not a mainnet payment processor. Mainnet is locked until audits, monitoring, support, and production safeguards are real.

---

## Live Demo

**Public app:** https://cloakpay-ai.vercel.app

The fastest judge path is walletless: open the app, choose **Try Without Wallet**, run the safe sample, run the suspicious sample, and compare the firewall verdicts. Wallet testers can switch to the devnet signing flow after funding a wallet with devnet SOL.

| Proof | Status |
| --- | --- |
| Invoice/payment analysis | QVAC/local path with clearly labeled fallback mode |
| Risk verdict | Safe, review, or block based on extracted payment fields |
| Blockchain action | Real Solana devnet transaction preparation and wallet signing |
| Receipt | Local invoice hash, commitment, nullifier preview, redacted summary, and transaction signature |
| Cost | $0 build path: no paid APIs, paid RPC, paid database, paid OCR, or paid assets |

## What It Does

CloakPay AI turns the moment before signing into a safety checkpoint:

- Extracts merchant, recipient, amount, token, memo, and suspicious wording from invoices or payment screenshots.
- Scores payment risk before the wallet signs.
- Blocks unclear or suspicious payment intents from moving forward without review.
- Sends only on Solana devnet for the public preview.
- Saves privacy-safe receipts locally for user proof without sending invoice content to a database.

## Hackathon Fit

CloakPay AI is built for the Tether Frontier QVAC side track: local AI is not decoration here, it is the core payment firewall. The product uses QVAC/local analysis to keep invoice content private until the user chooses what to sign.

| Criterion | CloakPay AI answer |
| --- | --- |
| Technical QVAC depth | OCR/payment extraction sits directly inside the main payment flow |
| Product value | Prevents users from blindly signing suspicious invoices or wrong payment details |
| Innovation | Local-first AI protects payment context before any blockchain action happens |
| Demo quality | Safe sample, risky sample, walletless preview, devnet signing, and receipt proof |

## Submission Links

- Live preview: https://cloakpay-ai.vercel.app
- Public repo: https://github.com/jerreenj/CloakPayAI-Solana-Tether
- Demo script: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
- Submission checklist: [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md)
- QVAC proof plan: [docs/QVAC_PROOF.md](docs/QVAC_PROOF.md)

## Winning Demo

1. Open the live preview at https://cloakpay-ai.vercel.app or run the local app.
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
- Section navigation for Demo, Firewall, Readiness, History, and Feedback.

## Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, Framer Motion, Lucide icons.
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

The app is deployed at https://cloakpay-ai.vercel.app on Vercel's free tier. The deployed version uses the same `/api` paths through serverless functions, and the browser has a local fallback if hosted APIs are unavailable, so the safe/risky sample demo works without a separate paid backend.

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
- Live preview: https://cloakpay-ai.vercel.app

## Readiness Docs

- [Security policy](SECURITY.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Mainnet readiness](docs/MAINNET_READINESS.md)
- [QVAC proof plan](docs/QVAC_PROOF.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Submission checklist](docs/SUBMISSION_CHECKLIST.md)
