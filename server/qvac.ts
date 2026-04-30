import type { ExtractionResponse, OCRBlock, PaymentIntent } from "./types";

const demoRecipient = "CloakPayDemo11111111111111111111111111111111";

function stripDataUrl(image: string) {
  const comma = image.indexOf(",");
  return comma >= 0 ? image.slice(comma + 1) : image;
}

function parseIntent(blocks: OCRBlock[]): PaymentIntent {
  const text = blocks.map((block) => block.text).join("\n");
  const amountMatch = text.match(/(?:amount|total|pay)\s*:?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const addressMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  const tokenMatch = text.match(/\b(USDT|SOL)\b/i);
  const memoMatch = text.match(/(?:memo|invoice|ref)\s*:?\s*([A-Za-z0-9._ -]{3,48})/i);
  const warnings: string[] = [];

  if (!addressMatch) warnings.push("Recipient address needs manual confirmation.");
  if (!amountMatch) warnings.push("Amount needs manual confirmation.");
  if (!tokenMatch) warnings.push("Token defaulted to SOL for the devnet demo.");

  const confidenceValues = blocks
    .map((block) => block.confidence)
    .filter((value): value is number => typeof value === "number");
  const confidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : 0.72;

  return {
    recipientAddress: addressMatch?.[0] ?? demoRecipient,
    amount: amountMatch ? Number(amountMatch[1]) : 0.25,
    token: (tokenMatch?.[1]?.toUpperCase() as "SOL" | "USDT" | undefined) ?? "SOL",
    memo: memoMatch?.[1]?.trim() ?? "Frontier demo payment",
    confidence,
    warnings
  };
}

function mockExtraction(fileName: string): ExtractionResponse {
  const blocks: OCRBlock[] = [
    { text: "Invoice: Frontier-042", confidence: 0.91 },
    { text: "Pay 0.25 SOL", confidence: 0.88 },
    { text: `Recipient ${demoRecipient}`, confidence: 0.82 },
    { text: `Memo: ${fileName.replace(/\.[^.]+$/, "")}`, confidence: 0.79 }
  ];

  return {
    mode: "mock",
    blocks,
    intent: parseIntent(blocks)
  };
}

export async function extractPaymentFromImage(image: string, fileName: string): Promise<ExtractionResponse> {
  if (process.env.QVAC_MOCK !== "0") {
    return mockExtraction(fileName);
  }

  const qvac = await import("@qvac/sdk");
  const imageBuffer = Buffer.from(stripDataUrl(image), "base64");
  const modelId = await qvac.loadModel({
    modelSrc: qvac.OCR_LATIN_RECOGNIZER_1,
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

  try {
    const { blocks } = qvac.ocr({
      modelId,
      image: imageBuffer,
      options: { paragraph: false }
    });
    const ocrBlocks = (await blocks) as OCRBlock[];
    return {
      mode: "qvac",
      blocks: ocrBlocks,
      intent: parseIntent(ocrBlocks)
    };
  } finally {
    await qvac.unloadModel({ modelId, clearStorage: false });
  }
}
