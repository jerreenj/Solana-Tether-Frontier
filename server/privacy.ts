import { createHash, randomBytes } from "node:crypto";
import type { PaymentIntent } from "./types";

type ReceiptRequest = {
  intent: PaymentIntent;
  txSignature?: string;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createPrivacyReceipt({ intent, txSignature }: ReceiptRequest) {
  const salt = randomBytes(16).toString("hex");
  const payload = JSON.stringify({
    recipientAddress: intent.recipientAddress,
    amount: intent.amount,
    token: intent.token,
    memo: intent.memo,
    salt
  });

  const commitment = hash(payload);
  const nullifierHash = hash(`${commitment}:${salt}`).slice(0, 32);

  return {
    commitment,
    nullifierHash,
    stealthLabel: `cloak_${commitment.slice(0, 10)}`,
    createdAt: new Date().toISOString(),
    txSignature
  };
}
