export type OCRBlock = {
  text: string;
  bbox?: [number, number, number, number];
  confidence?: number;
};

export type PaymentIntent = {
  recipientAddress: string;
  amount: number;
  token: "SOL" | "USDT";
  memo: string;
  confidence: number;
  warnings: string[];
};

export type ExtractionResponse = {
  mode: "qvac" | "mock";
  blocks: OCRBlock[];
  intent: PaymentIntent;
};
