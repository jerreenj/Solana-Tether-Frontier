import { createHash, randomBytes } from "node:crypto";
import type { PaymentIntent, RiskReport } from "./types";

type ReceiptRequest = {
  intent: PaymentIntent;
  riskReport?: RiskReport;
  invoiceText?: string;
  txSignature?: string;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createPrivacyReceipt({ intent, riskReport, invoiceText, txSignature }: ReceiptRequest) {
  const salt = randomBytes(16).toString("hex");
  const invoiceHash = hash(invoiceText || JSON.stringify(intent.sourceFields));
  const payload = JSON.stringify({
    recipientAddress: intent.recipientAddress,
    amount: intent.amount,
    token: intent.token,
    memo: intent.memo,
    merchant: intent.merchant,
    invoiceHash,
    riskVerdict: riskReport?.verdict,
    salt
  });

  const commitment = hash(payload);
  const nullifierHash = hash(`${commitment}:${salt}`).slice(0, 32);

  return {
    invoiceHash,
    commitment,
    nullifierHash,
    stealthLabel: `cloak_${commitment.slice(0, 10)}`,
    redactedSummary: `${intent.merchant} payment for ${intent.amount} ${intent.token === "UNKNOWN" ? "SOL" : intent.token}; private invoice text retained locally.`,
    createdAt: new Date().toISOString(),
    txSignature
  };
}
