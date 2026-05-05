# CloakPay AI Production Readiness

## Enabled In The Product

- Try Without Wallet mode for first-time users.
- Safe and risky invoice samples.
- QVAC/local analysis path with browser fallback for hosted reliability.
- Devnet and mainnet-beta SOL transfer preparation.
- Explicit mainnet real-funds confirmation gate.
- Wallet-linked local user profile.
- Local history, receipt proof, and account export.
- Local feedback inbox with JSON export, GitHub issue handoff, and support email.
- Local production monitor event log with export.
- Free `/api/health` endpoint for uptime checks.

## Real-World Responsibilities

These are not code switches; they are operating responsibilities before pushing hard to real users:

- External security audit and issue remediation.
- Compliance review and public privacy policy.
- Support response process for failed sends, scam reports, and wallet confusion.
- Transaction limits and risk escalation policy.
- Mainnet RPC redundancy if public RPC becomes unstable.
- Formal incident playbook and rollback plan.

## Zero-Dollar Operating Path

- AI: QVAC local runtime or deterministic browser fallback.
- RPC: public Solana devnet and mainnet-beta RPC.
- Hosting: local demo or Vercel free tier.
- Storage: browser localStorage and optional JSON export.
- Support: email, GitHub issues, exported tester feedback.
- Assets: CSS and generated sample invoice text.
- Funds: devnet faucet SOL for public tests; mainnet SOL only when the operator chooses to test real funds.

## 200-User Rollout Plan

1. Send the Vercel link to 20 users first.
2. Ask most testers to use Try Without Wallet.
3. Ask wallet testers to start on devnet.
4. Use mainnet-beta only with explicit real-funds confirmation.
5. Export local feedback and monitor events after test sessions.
6. Fix confusing UI, failed wallet paths, and false-positive risk scoring.
7. Share with 200 users after the first 20 complete the core flow.
