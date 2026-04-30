import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import type { PaymentIntent } from "./types";

type PrepareRequest = {
  intent: PaymentIntent;
  payer: string;
};

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

function toPublicKey(value: string, fallback: string) {
  try {
    return new PublicKey(value);
  } catch {
    return new PublicKey(fallback);
  }
}

export async function prepareDevnetTransfer({ intent, payer }: PrepareRequest) {
  if (intent.token === "USDT") {
    throw new Error("USDT is tracked in the payment intent, but the zero-dollar MVP only sends devnet SOL.");
  }

  const fallbackKey = "11111111111111111111111111111111";
  const fromPubkey = toPublicKey(payer, fallbackKey);
  const toPubkey = toPublicKey(intent.recipientAddress, fallbackKey);
  const lamports = Math.max(1, Math.round(intent.amount * LAMPORTS_PER_SOL));
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: fromPubkey,
    recentBlockhash: blockhash
  }).add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports
    })
  );

  return {
    network: "devnet" as const,
    from: fromPubkey.toBase58(),
    to: toPubkey.toBase58(),
    lamports,
    recentBlockhash: transaction.recentBlockhash ?? blockhash,
    serializedTransaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    explorerUrl: `https://explorer.solana.com/address/${toPubkey.toBase58()}?cluster=devnet`
  };
}
