# Mainnet Readiness Plan

Mainnet is the direction for CloakPay AI, but it is not enabled in this preview.

## Why Mainnet Is Locked

The product touches payments. A wrong recipient, wrong amount, spoofed invoice, or broken transaction flow can cost real money. Mainnet should wait until the payment firewall is tested, monitored, and reviewed.

## Required Mainnet Work

- Add explicit network selection with devnet as the default.
- Add irreversible-payment warnings before every mainnet signature.
- Add simulation and decoded transaction review before signing.
- Add transaction limits for early users.
- Add retry-safe transaction state and idempotency keys.
- Add production monitoring for API failures, wallet errors, and transaction failures.
- Add support workflow for payment disputes, scams, and failed sends.
- Complete external security review.
- Document supported wallets, devices, and QVAC model requirements.

## Acceptable Hackathon Positioning

CloakPay AI is submission-ready as a devnet payment firewall MVP:

- The core product behavior is real.
- The Solana transaction is real on devnet.
- The privacy receipt is generated locally.
- The QVAC/local analysis path is central to the product.
- Mainnet is correctly treated as a future production milestone.
