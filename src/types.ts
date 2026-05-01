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

export type PrivacyReceipt = {
  invoiceHash: string;
  commitment: string;
  nullifierHash: string;
  stealthLabel: string;
  redactedSummary: string;
  createdAt: string;
  txSignature?: string;
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

export type QvacStatus = {
  localOnly: true;
  mode: "live-qvac" | "fallback-demo";
  ocrModel: string;
  llmModel: string;
  paidServices: false;
  notes: string[];
};

export type PreparedTransaction = {
  network: "devnet";
  from: string;
  to: string;
  lamports: number;
  recentBlockhash: string;
  serializedTransaction: string;
  explorerUrl: string;
};

export type LocalHistoryItem = {
  id: string;
  createdAt: string;
  merchant: string;
  amount: number;
  token: PaymentIntent["token"];
  verdict: RiskReport["verdict"];
  score: number;
  mode: AnalysisResponse["mode"];
  txSignature?: string;
  receiptCommitment?: string;
};

export type FeedbackCategory = "bug" | "wallet" | "invoice" | "risk" | "mainnet" | "other";

export type FeedbackItem = {
  id: string;
  createdAt: string;
  category: FeedbackCategory;
  message: string;
  email?: string;
};
