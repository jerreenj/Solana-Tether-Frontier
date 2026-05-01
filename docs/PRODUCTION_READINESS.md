# CloakPay AI Production Readiness

## What Is Ready For The Hackathon Preview

- Public devnet preview flow.
- Try Without Wallet mode for first-time users.
- Safe and risky invoice samples.
- Browser fallback analysis when hosted API access is unavailable.
- Local history stored in the user's browser.
- Local feedback inbox with JSON export and GitHub issue handoff.
- Free `/api/health` endpoint for manual/Vercel uptime checks.
- Devnet SOL wallet signing path.
- Privacy receipt with invoice hash, commitment, nullifier preview, redacted summary, and optional devnet transaction signature.
- Clear labels for devnet-only, no mainnet, no paid services.

## What Is Not Mainnet-Ready Yet

- Real-money mainnet transfers.
- External audit.
- Production monitoring dashboard.
- Support SLA.
- User accounts backed by a secure database.
- Transaction recovery/retry/idempotency.
- Fraud and scam escalation process.
- Formal privacy policy and data retention policy.

## Zero-Dollar Operating Path

- AI: QVAC local runtime or deterministic browser fallback.
- RPC: public Solana devnet RPC.
- Hosting: local demo or Vercel free tier.
- Storage: browser localStorage and optional JSON export.
- Support: GitHub issues and exported tester feedback.
- Assets: CSS and generated sample invoice text.
- Funds: faucet SOL only.

## 200-User Preview Plan

1. Send the Vercel link to 20 users first.
2. Ask most testers to use Try Without Wallet.
3. Ask wallet testers to use devnet SOL only.
4. Export local feedback after test sessions.
5. Fix confusing UI, failed wallet paths, and false-positive risk scoring.
6. Share with 200 users only after the first 20 complete the core flow.

## Production Gate

Mainnet can be considered only when every item below is complete:

- External audit completed and issues resolved.
- Mainnet transaction simulation and human confirmation tested.
- Monitoring and alerting installed.
- Support contact and incident playbook published.
- User data policy finalized.
- Real QVAC local integration tested on supported desktop environments.
- Clear risk disclaimers and transaction limits enforced.
