# CloakPay AI

Zero-dollar, local-first payment firewall for the Tether QVAC Frontier track.

CloakPay AI checks a Solana payment before the user signs it. It analyzes an invoice or payment screenshot locally with QVAC OCR, converts the extracted text into a payment intent, scores the risk, prepares a real Solana devnet transfer, and generates a privacy-safe receipt without using paid APIs, paid hosting, paid RPC, paid databases, or mainnet funds.

## Winning Demo

1. Open the local app.
2. Run the built-in sample invoice or upload a payment screenshot.
3. Show QVAC/local analysis extracting merchant, recipient, amount, token, and memo.
4. Show the payment firewall verdict: safe, review, or block.
5. Connect a Solana wallet on devnet.
6. Prepare, sign, and send devnet SOL.
7. Show the explorer link and local privacy receipt.

The story: private invoice data is analyzed locally before signing; Solana only receives the confirmed payment.

## Zero-Dollar Rules

- No paid AI: QVAC SDK locally only.
- No paid OCR: QVAC OCR or local deterministic fallback.
- No paid RPC: public Solana devnet RPC only.
- No paid database: browser state and local runtime only.
- No paid assets: CSS and generated sample invoice only.
- No mainnet funds: devnet SOL from faucet only.

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

## API

- `GET /api/qvac/status`
- `POST /api/qvac/analyze-payment`
- `POST /api/solana/prepare`
- `POST /api/privacy/receipt`

## Submission Notes

- Track: Tether Frontier Hackathon Track on Superteam Earn.
- Deadline from listing: May 11, 2026.
- Public repo: https://github.com/jerreenj/Solana-Tether-Frontier
