import { useMemo, useState } from "react";
import type { ExtractionResponse, PaymentIntent, PreparedTransaction, PrivacyReceipt } from "./types";

const defaultPayer = "DemoPayer1111111111111111111111111111111111";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [receipt, setReceipt] = useState<PrivacyReceipt | null>(null);
  const [prepared, setPrepared] = useState<PreparedTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const confidence = useMemo(() => {
    if (!intent) return "0%";
    return `${Math.round(intent.confidence * 100)}%`;
  }, [intent]);

  async function onFileSelected(nextFile: File | null) {
    setFile(nextFile);
    setExtraction(null);
    setIntent(null);
    setReceipt(null);
    setPrepared(null);
    setMessage("");
    setImagePreview(nextFile ? await fileToDataUrl(nextFile) : "");
  }

  async function extractPayment() {
    if (!file) return;
    setBusy(true);
    setMessage("Extracting payment details locally...");
    try {
      const image = await fileToDataUrl(file);
      const response = await fetch("/api/qvac/extract-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, fileName: file.name })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as ExtractionResponse;
      setExtraction(data);
      setIntent(data.intent);
      setMessage(data.mode === "qvac" ? "QVAC OCR complete." : "Mock extraction loaded for local UI work.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareTransaction() {
    if (!intent) return;
    setBusy(true);
    setMessage("Preparing devnet transaction...");
    try {
      const response = await fetch("/api/solana/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, payer: defaultPayer })
      });
      if (!response.ok) throw new Error(await response.text());
      setPrepared((await response.json()) as PreparedTransaction);
      setMessage("Devnet transaction payload prepared.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare transaction.");
    } finally {
      setBusy(false);
    }
  }

  async function createReceipt() {
    if (!intent) return;
    setBusy(true);
    setMessage("Creating privacy receipt...");
    try {
      const response = await fetch("/api/privacy/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, txSignature: prepared?.recentBlockhash })
      });
      if (!response.ok) throw new Error(await response.text());
      setReceipt((await response.json()) as PrivacyReceipt);
      setMessage("Privacy receipt created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create receipt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Tether Frontier Track</p>
            <h1>CloakPay AI</h1>
          </div>
          <div className="status-pill">{message || "Ready"}</div>
        </header>

        <div className="grid">
          <section className="panel upload-panel">
            <div className="panel-header">
              <span>1</span>
              <h2>Upload</h2>
            </div>
            <label className="dropzone">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Payment upload preview" />
              ) : (
                <strong>Select invoice image</strong>
              )}
            </label>
            <button disabled={!file || busy} onClick={extractPayment}>
              Extract With QVAC
            </button>
          </section>

          <section className="panel">
            <div className="panel-header">
              <span>2</span>
              <h2>Extraction</h2>
            </div>
            <div className="metric-row">
              <div>
                <small>Mode</small>
                <strong>{extraction?.mode ?? "None"}</strong>
              </div>
              <div>
                <small>Confidence</small>
                <strong>{confidence}</strong>
              </div>
            </div>
            <div className="ocr-list">
              {(extraction?.blocks ?? []).map((block, index) => (
                <p key={`${block.text}-${index}`}>{block.text}</p>
              ))}
              {!extraction && <p className="muted">OCR blocks will appear here.</p>}
            </div>
          </section>

          <section className="panel review-panel">
            <div className="panel-header">
              <span>3</span>
              <h2>Review</h2>
            </div>
            <label>
              Recipient
              <input
                value={intent?.recipientAddress ?? ""}
                onChange={(event) => intent && setIntent({ ...intent, recipientAddress: event.target.value })}
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0"
                step="0.001"
                value={intent?.amount ?? ""}
                onChange={(event) => intent && setIntent({ ...intent, amount: Number(event.target.value) })}
              />
            </label>
            <label>
              Token
              <select
                value={intent?.token ?? "SOL"}
                onChange={(event) => intent && setIntent({ ...intent, token: event.target.value as "SOL" | "USDT" })}
              >
                <option>SOL</option>
                <option>USDT</option>
              </select>
            </label>
            <label>
              Memo
              <input value={intent?.memo ?? ""} onChange={(event) => intent && setIntent({ ...intent, memo: event.target.value })} />
            </label>
            <div className="warnings">
              {(intent?.warnings ?? []).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
            <button disabled={!intent || busy} onClick={prepareTransaction}>
              Prepare Devnet Transfer
            </button>
          </section>

          <section className="panel">
            <div className="panel-header">
              <span>4</span>
              <h2>Receipt</h2>
            </div>
            {prepared && (
              <div className="receipt-block">
                <small>Prepared transfer</small>
                <p>{prepared.lamports} lamports to {prepared.to}</p>
              </div>
            )}
            <button disabled={!intent || busy} onClick={createReceipt}>
              Create Privacy Receipt
            </button>
            {receipt && (
              <div className="receipt-block">
                <small>Commitment</small>
                <code>{receipt.commitment}</code>
                <small>Nullifier preview</small>
                <code>{receipt.nullifierHash}</code>
                <small>Stealth label</small>
                <strong>{receipt.stealthLabel}</strong>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
