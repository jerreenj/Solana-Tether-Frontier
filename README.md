# CloakPay AI

Local-first payment intelligence for the Tether QVAC Frontier track.

CloakPay AI turns an invoice, receipt, or payment screenshot into a reviewed Solana devnet payment flow. The core product uses QVAC OCR locally to extract payment details, normalizes them into a payment intent, asks the user to confirm risky fields, and then prepares a Solana transaction plus a privacy receipt for the demo.

## Why This Fits The Track

- Meaningful QVAC integration: OCR is the first product action, not a side demo.
- Local-first privacy: invoice text is processed on-device before any transaction is prepared.
- Solana-ready flow: the MVP targets devnet transfers first, then private-payment primitives later.
- Demo-friendly: upload image, review extracted intent, prepare transaction, show receipt.

## Product Flow

1. Upload a payment image or invoice screenshot.
2. QVAC OCR extracts text blocks locally.
3. The backend converts those blocks into a `PaymentIntent`.
4. The user confirms amount, recipient, token, and memo.
5. The app prepares a Solana devnet transfer payload.
6. The app generates a local privacy receipt with a commitment and nullifier preview.

## Tech Stack

- Frontend: Vite, React, TypeScript.
- Local API: Node.js, Express, TypeScript.
- AI: `@qvac/sdk` OCR, with a mock fallback for development before model cache setup.
- Blockchain: `@solana/web3.js` on devnet.

## Commands

```bash
npm install
npm run dev
```

For live QVAC OCR, set:

```bash
QVAC_MOCK=0
```

When `QVAC_MOCK` is unset, the backend currently stays in mock mode so the UI can be developed and recorded before the model download is complete.

## Submission Notes

- Track: Tether Frontier Hackathon Track on Superteam Earn.
- Deadline from listing: May 11, 2026.
- Winner announcement from listing: May 13, 2026 for this side track.
- Public repo requirement: this repository is intended to be public.

## Roadmap

- Add wallet adapter UI for signing prepared devnet transactions.
- Add QVAC LLM normalization after OCR for better ambiguous invoice handling.
- Add a sample invoice generator for the demo.
- Replace simulated privacy receipt with a concrete private-payment protocol integration.
