export type OCRBlock = {
  text: string;
  bbox?: [number, number, number, number];
  confidence?: number;
};

export type SourceField = {
  field: "recipient" | "amount" | "token" | "memo" | "merchant";
  value: string;
  evidence: string;
  confidence: number;
};

export type PaymentIntent = {
  recipientAddress: string;
  amount: number;
  token: "SOL" | "USDT" | "UNKNOWN";
  memo: string;
  merchant: string;
  confidence: number;
  sourceFields: SourceField[];
  warnings: string[];
};

export type RiskReport = {
  score: number;
  verdict: "safe" | "review" | "block";
  warnings: string[];
  explanation: string;
  evidence: string[];
};

export type QvacStats = {
  localOnly: boolean;
  engine: "qvac-ocr" | "deterministic-fallback" | "sample-text";
  ocrModel: string;
  llmModel: string;
  processingMs: number;
};

export type AnalysisResponse = {
  mode: "qvac" | "mock" | "sample";
  blocks: OCRBlock[];
  intent: PaymentIntent;
  riskReport: RiskReport;
  qvacStats: QvacStats;
};
