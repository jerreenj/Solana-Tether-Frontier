import express from "express";
import { createPrivacyReceipt } from "./privacy";
import { extractPaymentFromImage } from "./qvac";
import { prepareDevnetTransfer } from "./solana";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "cloakpay-ai" });
});

app.post("/api/qvac/extract-payment", async (request, response) => {
  try {
    const { image, fileName } = request.body as { image?: string; fileName?: string };
    if (!image) {
      response.status(400).send("Missing image payload.");
      return;
    }
    response.json(await extractPaymentFromImage(image, fileName ?? "upload.png"));
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : "Extraction failed.");
  }
});

app.post("/api/privacy/receipt", async (request, response) => {
  try {
    response.json(await createPrivacyReceipt(request.body));
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : "Receipt generation failed.");
  }
});

app.post("/api/solana/prepare", async (request, response) => {
  try {
    response.json(await prepareDevnetTransfer(request.body));
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : "Transaction preparation failed.");
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`CloakPay AI API listening on http://127.0.0.1:${port}`);
});
