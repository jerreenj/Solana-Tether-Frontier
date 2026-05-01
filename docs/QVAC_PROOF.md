# QVAC Proof Plan

## Goal

Show that CloakPay AI can analyze invoice/payment data locally with QVAC, without paid cloud AI or hosted OCR.

## Local Proof Steps

1. Install dependencies.
2. Start the local app with live QVAC mode:

```bash
QVAC_MOCK=0 npm run dev
```

On Windows PowerShell:

```powershell
$env:QVAC_MOCK="0"; npm run dev
```

3. Open `http://127.0.0.1:5173/`.
4. Upload an invoice screenshot or run a sample.
5. Show the QVAC/local status panel.
6. Show extracted fields, risk verdict, and privacy receipt.

## Hosted Preview Note

The Vercel preview may use browser fallback mode because QVAC is designed for local/on-device execution and hosted serverless environments may not have the right model/runtime setup. This is acceptable for user preview, but the submission video should include the local QVAC proof path.
