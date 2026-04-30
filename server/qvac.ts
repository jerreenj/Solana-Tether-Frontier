import type { AnalysisResponse, OCRBlock, PaymentIntent, QvacStats, RiskReport, SourceField } from "./types";

type AnalyzeInput = {
  image?: string;
  text?: string;
  fileName: string;
};

const demoRecipient = "AKYq5mW4TTsz7xyzcoaNiD2VkCfg3eQmQcZkQrzkfVee";
const ocrModelName = "OCR_LATIN_RECOGNIZER_1";
const llmModelName = "deterministic-local-risk-engine";

let ocrModelId: string | undefined;
let qvacLoadError: string | undefined;

function stripDataUrl(image: string) {
  const comma = image.indexOf(",");
  return comma >= 0 ? image.slice(comma + 1) : image;
}

function textToBlocks(text: string): OCRBlock[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line, confidence: 0.96 }));
}

function averageConfidence(blocks: OCRBlock[]) {
  const values = blocks.map((block) => block.confidence).filter((value): value is number => typeof value === "number");
  if (!values.length) return 0.7;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
  const memo = memoValue ?? "CloakPay demo payment";
  const merchant = merchantValue ?? "Unknown merchant";

  sourceFields.push(source("recipient", recipientAddress, addressEvidence || "Generated demo recipient", addressMatch ? 0.86 : 0.35));
  sourceFields.push(source("amount", String(amount), amountEvidence || "Generated demo amount", amountMatch ? 0.88 : 0.4));
  sourceFields.push(source("token", token, tokenEvidence || "No token found", tokenMatch ? 0.9 : 0.35));
  sourceFields.push(source("memo", memo, memoEvidence || "Generated memo", memoValue ? 0.82 : 0.45));
  sourceFields.push(source("merchant", merchant, merchantEvidence || "No merchant found", merchantValue ? 0.78 : 0.35));

  const warnings: string[] = [];
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

function buildRiskReport(intent: PaymentIntent, blocks: OCRBlock[]): RiskReport {
  const text = blocks.map((block) => block.text).join(" ").toLowerCase();
  const warnings = [...intent.warnings];
  const evidence: string[] = [];
  let score = 8;

  if (intent.confidence < 0.75) {
    score += 15;
    warnings.push("Low OCR confidence; verify the invoice manually before signing.");
    evidence.push(`Average OCR confidence: ${Math.round(intent.confidence * 100)}%`);
  }

  if ((intent.sourceFields.find((field) => field.field === "recipient")?.confidence ?? 0) < 0.5) {
    score += 30;
    evidence.push("Recipient was not confidently extracted from the document.");
  }

  if ((intent.sourceFields.find((field) => field.field === "amount")?.confidence ?? 0) < 0.5) {
    score += 25;
    evidence.push("Amount was not confidently extracted from the document.");
  }

  if (intent.token === "UNKNOWN") {
    score += 12;
    evidence.push("Token symbol missing; app will use SOL for the devnet demo only.");
  }

  if (intent.amount >= 2) {
    score += 14;
    warnings.push("Large devnet amount detected; confirm this is intentional.");
    evidence.push(`Amount parsed as ${intent.amount} ${intent.token === "UNKNOWN" ? "SOL" : intent.token}.`);
  }

  if (/(urgent|immediately|avoid fee|seed phrase|private key|verify wallet|airdrop claim|bonus expires)/i.test(text)) {
    score += 32;
    warnings.push("Suspicious payment language found.");
    evidence.push("Invoice text contains urgency, wallet-verification, or credential-risk wording.");
  }

  if (/(usdt|tether)/i.test(text) && intent.token === "SOL") {
    score += 10;
    warnings.push("Invoice mentions stablecoins but extracted token is SOL.");
    evidence.push("Token wording conflicts with parsed payment token.");
  }

  score = Math.min(100, score);
  const verdict: RiskReport["verdict"] = score >= 70 ? "block" : score >= 32 ? "review" : "safe";
  const explanation =
    verdict === "safe"
      ? "Local analysis found a complete payment intent with no high-risk language."
      : verdict === "review"
        ? "Local analysis found fields or language that should be reviewed before signing."
        : "Local analysis found enough risk to block signing until the invoice is corrected.";

  return {
    score,
    verdict,
    warnings: [...new Set(warnings)],
    explanation,
    evidence: evidence.length ? evidence : ["No cloud AI or paid service was used for this analysis."]
  };
}

function buildStats(startedAt: number, engine: QvacStats["engine"]): QvacStats {
  return {
    localOnly: true,
    engine,
    ocrModel: engine === "qvac-ocr" ? ocrModelName : "not-loaded",
    llmModel: llmModelName,
    processingMs: Date.now() - startedAt
  };
}

function mockBlocks(fileName: string): OCRBlock[] {
  return [
    { text: "Merchant: Frontier Labs", confidence: 0.93 },
    { text: "Invoice: CLPAY-042", confidence: 0.91 },
    { text: "Amount: 0.25 SOL", confidence: 0.89 },
    { text: `Recipient: ${demoRecipient}`, confidence: 0.86 },
    { text: `Memo: ${fileName.replace(/\.[^.]+$/, "")}`, confidence: 0.82 }
  ];
}

async function runQvacOcr(image: string): Promise<OCRBlock[]> {
  const qvac = await import("@qvac/sdk");
  const sdk = qvac as typeof qvac & {
    OCR_LATIN_RECOGNIZER_1: unknown;
  };

  if (!ocrModelId) {
    ocrModelId = await sdk.loadModel({
      modelSrc: sdk.OCR_LATIN_RECOGNIZER_1,
      modelType: "ocr",
      modelConfig: {
        langList: ["en"],
        useGPU: true,
        timeout: 30000,
        magRatio: 1.5,
        defaultRotationAngles: [90, 180, 270],
        contrastRetry: false,
        lowConfidenceThreshold: 0.5,
        recognizerBatchSize: 1
      }
    });
  }

  const imageBuffer = Buffer.from(stripDataUrl(image), "base64");
  const { blocks } = sdk.ocr({
    modelId: ocrModelId,
    image: imageBuffer,
    options: { paragraph: false }
  });
  return (await blocks) as OCRBlock[];
}

export function getQvacStatus() {
  const liveRequested = process.env.QVAC_MOCK === "0";
  return {
    localOnly: true as const,
    mode: liveRequested ? ("live-qvac" as const) : ("fallback-demo" as const),
    ocrModel: ocrModelId ? `${ocrModelName} loaded` : liveRequested ? `${ocrModelName} will load on first image` : "fallback demo mode",
    llmModel: llmModelName,
    paidServices: false as const,
    notes: [
      "No paid AI APIs, paid OCR, paid RPC, database, or hosting are required.",
      "Set QVAC_MOCK=0 before starting the API to force live local QVAC OCR.",
      qvacLoadError ? `Last QVAC load error: ${qvacLoadError}` : "Risk analysis is deterministic and local for demo reliability."
    ]
  };
}

export async function analyzePayment({ image, text, fileName }: AnalyzeInput): Promise<AnalysisResponse> {
  const startedAt = Date.now();
  let mode: AnalysisResponse["mode"] = "mock";
  let blocks: OCRBlock[];
  let engine: QvacStats["engine"] = "deterministic-fallback";

  if (text) {
    mode = "sample";
    engine = "sample-text";
    blocks = textToBlocks(text);
  } else if (image && process.env.QVAC_MOCK === "0") {
    try {
      mode = "qvac";
      engine = "qvac-ocr";
      blocks = await runQvacOcr(image);
    } catch (error) {
      qvacLoadError = error instanceof Error ? error.message : "Unknown QVAC error";
      mode = "mock";
      engine = "deterministic-fallback";
      blocks = mockBlocks(fileName);
    }
  } else {
    blocks = mockBlocks(fileName);
  }

  const intent = parseIntent(blocks);
  const riskReport = buildRiskReport(intent, blocks);

  return {
    mode,
    blocks,
    intent,
    riskReport,
    qvacStats: buildStats(startedAt, engine)
  };
}
