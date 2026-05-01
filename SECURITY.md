# Security Policy

## Current Status

CloakPay AI is a devnet public preview. Mainnet payments are intentionally disabled.

The app is built to demonstrate the safety model before real-money use:

- Analyze invoice/payment context locally before signing.
- Avoid paid or cloud AI services for the core demo.
- Use Solana devnet and faucet SOL only.
- Keep preview history and feedback in the user's browser unless they export or submit it.
- Require explicit wallet approval before any devnet transaction is sent.

## Not Production-Audited Yet

Do not use this preview for mainnet funds. Before mainnet, the project needs:

- External security review.
- Transaction simulation and preflight hardening.
- RPC retry/idempotency handling.
- Abuse and scam-report workflows.
- Support and incident response process.
- Monitoring for failed transaction rates and API errors.
- Clear rollback plan for unsafe releases.

## Reporting Issues

Open an issue at:

https://github.com/jerreenj/CloakPayAI-Solana-Tether/issues/new

For security-sensitive reports, avoid posting private keys, seed phrases, invoices with personal data, or real payment credentials.
