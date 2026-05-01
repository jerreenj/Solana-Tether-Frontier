# CloakPay AI Demo Script

## Opening

CloakPay AI is a local-first QVAC payment firewall for Solana payments. It checks private invoices before a wallet signs, so sensitive payment context stays local and the chain only receives the confirmed transaction.

## Walkthrough

1. Open the app and point out the $0 build path: local QVAC/fallback analysis, public Solana devnet RPC, browser/local storage, and no paid services.
2. Click **Try Without Wallet** to show that first-time users can test without setup.
3. Run the safe sample invoice and show the extracted merchant, recipient, amount, token, and memo.
4. Show the safe/review/block risk verdict and the evidence behind it.
5. Run the risky sample and show how missing fields, urgency, unknown token, or wallet-verification language changes the verdict.
6. For wallet testers, open the devnet SOL faucet, connect a wallet on devnet, prepare the transaction, and sign/send with faucet SOL.
7. Open the devnet explorer link.
8. Create the privacy receipt and show the invoice hash, commitment, nullifier preview, redacted summary, and transaction signature.
9. Show local history so testers can see their recent preview activity without an account or database.
10. Save a feedback note, export feedback JSON, and open the prefilled GitHub issue link.
11. Point to the production readiness panel and say mainnet is locked until audit, monitoring, support, and safer transaction controls are complete.

## Closing

The invoice stayed local. QVAC/local analysis checked the payment before signing. Solana only received the final devnet payment.

## Vercel Note

The public Vercel page is the preview. The live QVAC OCR story is strongest in the local demo because QVAC is meant to run locally/on-device; the deployed fallback path proves the product flow without paid infrastructure.

## $0 Checklist

- No paid AI API.
- No paid OCR.
- No paid RPC.
- No paid database.
- No paid hosting required.
- No paid assets.
- No mainnet funds.

## Mainnet Positioning

Mainnet is the production direction, but it is not enabled in this public preview. Real-money payments need audits, monitoring, fraud handling, support, and safer UX before users can trust it.

## Tester Ask

For the first 20 users, ask:

- Did Try Without Wallet work in under two minutes?
- Did the risky invoice warning make sense?
- Did wallet connection and devnet signing work if they tested it?
- What invoice format should CloakPay support next?
- What would make them trust this on mainnet later?
