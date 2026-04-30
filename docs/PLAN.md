# CloakPay AI Zero-Dollar Build Plan

## Product

CloakPay AI is a local-first payment firewall for anyone sending crypto payments. The MVP focuses on Solana devnet: it analyzes invoice/payment data locally, flags risk before signing, sends a real devnet transaction, and produces a privacy receipt.

## Core Loop

1. User runs the local web app.
2. User loads the free sample invoice or uploads an invoice image.
3. QVAC OCR extracts text when live mode is enabled; fallback mode keeps demos reliable.
4. Local risk engine scores the payment and explains the verdict.
5. User reviews merchant, recipient, amount, token, and memo.
6. User connects an injected Solana wallet.
7. App prepares a devnet SOL transaction.
8. Wallet signs and sends the transaction.
9. App creates a local receipt with invoice hash, commitment, nullifier preview, and tx signature.

## Zero-Dollar Constraints

- No paid AI, OCR, RPC, hosting, database, or assets.
- No mainnet funds.
- Use public devnet RPC and faucet SOL only.
- Optional hosting must be free tier.

## Interfaces

```ts
type PaymentIntent = {
  recipientAddress: string;
  amount: number;
  token: "SOL" | "USDT" | "UNKNOWN";
  memo: string;
  merchant: string;
  confidence: number;
  sourceFields: SourceField[];
  warnings: string[];
};

type RiskReport = {
  score: number;
  verdict: "safe" | "review" | "block";
  warnings: string[];
  explanation: string;
  evidence: string[];
};

type PrivacyReceipt = {
  invoiceHash: string;
  commitment: string;
  nullifierHash: string;
  redactedSummary: string;
  txSignature?: string;
};
```

## Demo Script

Start with: "CloakPay AI is a local QVAC payment firewall. It checks the private invoice before the wallet signs."

Then show: sample invoice -> local analysis -> risk verdict -> intent review -> wallet connect -> devnet sign/send -> privacy receipt.

End with: "The invoice stayed local. The chain only got the confirmed payment."

## Remaining Stretch Work

- Add live QVAC LLM structured JSON analysis if model setup is stable.
- Add QR-code payment screenshots.
- Add SPL token devnet transfer path for USDT-like demo tokens.
- Add a short recorded walkthrough and screenshots for Superteam submission.
