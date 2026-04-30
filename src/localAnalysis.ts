import type { AnalysisResponse, OCRBlock, PaymentIntent, PrivacyReceipt, QvacStats, RiskReport, SourceField } from "./types";

const demoRecipient = "AKYq5mW4TTsz7xyzcoaNiD2VkCfg3eQmQcZkQrzkfVee";

function textToBlocks(text: string): OCRBlock[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line, confidence: 0.94 }));
}

function mockBlocks(fileName: string): OCRBlock[] {
  return [
    { text: "Merchant: Public Preview", confidence: 0.9 },
    { text: "Amount: 0.25 SOL", confidence: 0.88 },
    { text: `Recipient: ${demoRecipient}`, confidence: 0.86 },
    { text: `Memo: ${fileName.replace(/\.[^.]+$/, "")}`, confidence: 0.82 }
  ];
}

function averageConfidence(blocks: OCRBlock[]) {
  const values = blocks.map((block) => block.confidence).filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.7;
}

function source(field: SourceField["field"], value: string, evidence: string, confidence = 0.78): SourceField {
  return { field, value, evidence, confidence };
}

function findEvidence(lines: string[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line)) ?? "";
}

function extractField(evidence: string, labels: string[]) {
  if (!evidence) return undefined;
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = evidence.match(new RegExp(`\\b(?:${escaped})\\b\\s*:?\\s*(.+)$`, "i"));
  return match?.[1]?.trim();
}

function parseIntent(blocks: OCRBlock[]): PaymentIntent {
  const lines = blocks.map((block) => block.text);
  const text = lines.join("\n");
  const sourceFields: SourceField[] = [];
  const addressEvidence = findEvidence(lines, /(?:recipient|wallet|address|pay to)/i);
  const addressMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  const amountEvidence = findEvidence(lines, /\b(?:amount|total|pay|due)\b/i);
  const amountMatch = amountEvidence.match(/\b(?:amount|total|pay|due)\b\s*:?\s*(?:\$|usdt|sol)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const tokenEvidence = findEvidence(lines, /\b(USDT|SOL)\b/i);
  const tokenMatch = text.match(/\b(USDT|SOL)\b/i);
  const memoEvidence = findEvidence(lines, /\b(?:memo|ref|reference)\b/i) || findEvidence(lines, /\binvoice\b/i);
  const memoValue = extractField(memoEvidence, ["memo", "ref", "reference", "invoice"]);
  const merchantEvidence = findEvidence(lines, /\b(?:merchant|vendor|from|payee)\b/i);
  const merchantValue = extractField(merchantEvidence, ["merchant", "vendor", "from", "payee"]);

  const recipientAddress = addressMatch?.[0] ?? demoRecipient;
  const amount = amountMatch ? Number(amountMatch[1]) : 0.25;
  const token = (tokenMatch?.[1]?.toUpperCase() as "SOL" | "USDT" | undefined) ?? "UNKNOWN";
  const memo = memoValue ?? "CloakPay browser fallback";
  const merchant = merchantValue ?? "Unknown merchant";
  const warnings: string[] = [];

  sourceFields.push(source("recipient", recipientAddress, addressEvidence || "Generated demo recipient", addressMatch ? 0.86 : 0.35));
  sourceFields.push(source("amount", String(amount), amountEvidence || "Generated demo amount", amountMatch ? 0.88 : 0.4));
  sourceFields.push(source("token", token, tokenEvidence || "No token found", tokenMatch ? 0.9 : 0.35));
  sourceFields.push(source("memo", memo, memoEvidence || "Generated memo", memoValue ? 0.82 : 0.45));
  sourceFields.push(source("merchant", merchant, merchantEvidence || "No merchant found", merchantValue ? 0.78 : 0.35));

  if (!addressMatch) warnings.push("Recipient address needs manual confirmation.");
  if (!amountMatch) warnings.push("Amount needs manual confirmation.");
  if (!tokenMatch) warnings.push("Token was not found; devnet transfer defaults to SOL.");
  if (!memoValue) warnings.push("Memo was not found; using a safe demo memo.");

  return {
    recipientAddress,
    amount,
    token,
    memo,
    merchant,
    confidence: Math.min(0.99, averageConfidence(blocks)),
    sourceFields,
    warnings
  };
}

function buildRiskReport(intent: PaymentIntent, blocks: OCRBlock[], browserFallback: boolean): RiskReport {
  const text = blocks.map((block) => block.text).join(" ").toLowerCase();
  const warnings = [...intent.warnings];
  const evidence: string[] = browserFallback ? ["Browser fallback ran locally because the hosted API was unavailable."] : [];
  let score = browserFallback ? 10 : 8;

  if (intent.confidence < 0.75) {
    score += 15;
    warnings.push("Low extraction confidence; verify the invoice manually before signing.");
    evidence.push(`Average extraction confidence: ${Math.round(intent.confidence * 100)}%`);
  }

  if ((intent.sourceFields.find((field) => field.field === "recipient")?.confidence ?? 0) < 0.5) {
    score += 30;
    evidence.push("Recipient was not confidently extracted from the payment text.");
  }

  if ((intent.sourceFields.find((field) => field.field === "amount")?.confidence ?? 0) < 0.5) {
    score += 25;
    evidence.push("Amount was not confidently extracted from the payment text.");
  }

  if (intent.token === "UNKNOWN") {
    score += 12;
    warnings.push("Payment token is unknown; verify token before signing.");
    evidence.push("Token symbol missing; app will use SOL for the devnet demo only.");
  }

  if (intent.amount >= 2) {
    score += 14;
    warnings.push("Large devnet amount detected; confirm this is intentional.");
    evidence.push(`Amount parsed as ${intent.amount} ${intent.token === "UNKNOWN" ? "SOL" : intent.token}.`);
  }

  if (/(urgent|immediately|avoid fee|seed phrase|private key|verify wallet|wallet verification|airdrop claim|bonus expires|claim now)/i.test(text)) {
    score += 32;
    warnings.push("Suspicious payment language found.");
    evidence.push("Payment text contains urgency, wallet-verification, or credential-risk wording.");
  }

  if (/unknown merchant|merchant:\s*unknown|unknown airdrop/i.test(text) || intent.merchant.toLowerCase().includes("unknown")) {
    score += 10;
    warnings.push("Merchant identity looks weak or unknown.");
    evidence.push("Merchant field does not identify a trusted counterparty.");
  }

  score = Math.min(100, score);
  const verdict: RiskReport["verdict"] = score >= 70 ? "block" : score >= 32 ? "review" : "safe";

  return {
    score,
    verdict,
    warnings: [...new Set(warnings)],
    explanation:
      verdict === "safe"
        ? "Local analysis found a complete payment intent with no high-risk language."
        : verdict === "review"
          ? "Local analysis found fields or language that should be reviewed before signing."
          : "Local analysis found enough risk to block signing until the invoice is corrected.",
    evidence: evidence.length ? evidence : ["No cloud AI or paid service was used for this analysis."]
  };
}

function buildStats(startedAt: number): QvacStats {
  return {
    localOnly: true,
    engine: "deterministic-fallback",
    ocrModel: "browser-text-fallback",
    llmModel: "browser-risk-engine",
    processingMs: Date.now() - startedAt
  };
}

export function analyzeLocally(input: { text?: string; fileName: string; browserFallback?: boolean }): AnalysisResponse {
  const startedAt = Date.now();
  const blocks = input.text?.trim() ? textToBlocks(input.text) : mockBlocks(input.fileName);
  const intent = parseIntent(blocks);

  return {
    mode: "mock",
    blocks,
    intent,
    riskReport: buildRiskReport(intent, blocks, Boolean(input.browserFallback)),
    qvacStats: buildStats(startedAt)
  };
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createLocalReceipt(input: {
  intent: PaymentIntent;
  riskReport?: RiskReport;
  invoiceText?: string;
  txSignature?: string;
}): Promise<PrivacyReceipt> {
  const webCrypto = globalThis.crypto;
  const salt =
    typeof webCrypto.randomUUID === "function"
      ? webCrypto.randomUUID()
      : Array.from(webCrypto.getRandomValues(new Uint8Array(16)))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
  const invoiceHash = await sha256(input.invoiceText || JSON.stringify(input.intent.sourceFields));
  const commitment = await sha256(
    JSON.stringify({
      recipientAddress: input.intent.recipientAddress,
      amount: input.intent.amount,
      token: input.intent.token,
      memo: input.intent.memo,
      merchant: input.intent.merchant,
      invoiceHash,
      riskVerdict: input.riskReport?.verdict,
      salt
    })
  );
  const nullifierHash = (await sha256(`${commitment}:${salt}`)).slice(0, 32);

  return {
    invoiceHash,
    commitment,
    nullifierHash,
    stealthLabel: `cloak_${commitment.slice(0, 10)}`,
    redactedSummary: `${input.intent.merchant} payment for ${input.intent.amount} ${
      input.intent.token === "UNKNOWN" ? "SOL" : input.intent.token
    }; private invoice text retained locally.`,
    createdAt: new Date().toISOString(),
    txSignature: input.txSignature
  };
}
