import { Connection, Transaction } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import type { AnalysisResponse, PaymentIntent, PreparedTransaction, PrivacyReceipt, QvacStatus } from "./types";

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string }>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

const devnetEndpoint = "https://api.devnet.solana.com";
const connection = new Connection(devnetEndpoint, "confirmed");

const sampleInvoice = `Merchant: Frontier Labs
Invoice: CLPAY-042
Amount: 0.25 SOL
Recipient: AKYq5mW4TTsz7xyzcoaNiD2VkCfg3eQmQcZkQrzkfVee
Memo: QVAC local payment firewall demo
Note: Pay after local verification only`;

function bytesFromBase64(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatAddress(value: string) {
  if (!value) return "Not connected";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function verdictLabel(verdict?: string) {
  if (!verdict) return "Pending";
  return verdict.charAt(0).toUpperCase() + verdict.slice(1);
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [receipt, setReceipt] = useState<PrivacyReceipt | null>(null);
  const [prepared, setPrepared] = useState<PreparedTransaction | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [qvacStatus, setQvacStatus] = useState<QvacStatus | null>(null);
  const [invoiceText, setInvoiceText] = useState(sampleInvoice);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready for zero-dollar local analysis.");

  useEffect(() => {
    fetch("/api/qvac/status")
      .then((response) => response.json())
      .then((data: QvacStatus) => setQvacStatus(data))
      .catch(() => setMessage("Could not read QVAC status."));
  }, []);

  const riskClass = analysis?.riskReport.verdict ?? "pending";
  const canSend = Boolean(intent && walletAddress && prepared && analysis?.riskReport.verdict !== "block");

  const stackStatus = useMemo(
    () => [
      ["AI", qvacStatus?.mode === "live-qvac" ? "Live local QVAC" : "Free fallback demo"],
      ["RPC", "Public Solana devnet"],
      ["Storage", "Browser/local only"],
      ["Spend", "$0"]
    ],
    [qvacStatus]
  );

  async function onFileSelected(nextFile: File | null) {
    setFile(nextFile);
    setAnalysis(null);
    setIntent(null);
    setReceipt(null);
    setPrepared(null);
    setTxSignature("");
    setMessage("");
    setImagePreview(nextFile ? await fileToDataUrl(nextFile) : "");
  }

  async function analyzePayment(useSampleText = false) {
    setBusy(true);
    setMessage(useSampleText ? "Running local sample analysis..." : "Running local payment firewall...");
    try {
      const payload = useSampleText
        ? { text: invoiceText, fileName: "sample-invoice.txt" }
        : file
          ? { image: await fileToDataUrl(file), fileName: file.name }
          : { text: invoiceText, fileName: "sample-invoice.txt" };

      const response = await fetch("/api/qvac/analyze-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as AnalysisResponse;
      setAnalysis(data);
      setIntent(data.intent);
      setPrepared(null);
      setReceipt(null);
      setTxSignature("");
      setMessage(`${data.mode.toUpperCase()} analysis complete: ${verdictLabel(data.riskReport.verdict)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connectWallet() {
    const provider = window.solana;
    if (!provider) {
      setMessage("No injected Solana wallet found. Install Phantom or another Solana wallet for real devnet signing.");
      return;
    }
    const result = await provider.connect();
    setWalletAddress(result.publicKey.toBase58());
    setMessage("Wallet connected on devnet flow.");
  }

  async function prepareTransaction() {
    if (!intent || !walletAddress) return;
    setBusy(true);
    setMessage("Preparing free public-devnet transaction...");
    try {
      const response = await fetch("/api/solana/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, payer: walletAddress })
      });
      if (!response.ok) throw new Error(await response.text());
      setPrepared((await response.json()) as PreparedTransaction);
      setMessage("Transaction prepared. Nothing has been signed yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare transaction.");
    } finally {
      setBusy(false);
    }
  }

  async function signAndSend() {
    const provider = window.solana;
    if (!provider || !prepared) return;
    setBusy(true);
    setMessage("Waiting for wallet signature...");
    try {
      const transaction = Transaction.from(bytesFromBase64(prepared.serializedTransaction));
      let signature: string;

      if (provider.signAndSendTransaction) {
        signature = (await provider.signAndSendTransaction(transaction)).signature;
      } else if (provider.signTransaction) {
        const signed = await provider.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Wallet does not support transaction signing.");
      }

      await connection.confirmTransaction(signature, "confirmed");
      setTxSignature(signature);
      setMessage("Devnet payment sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createReceipt() {
    if (!intent) return;
    setBusy(true);
    setMessage("Creating local privacy receipt...");
    try {
      const response = await fetch("/api/privacy/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          riskReport: analysis?.riskReport,
          invoiceText,
          txSignature
        })
      });
      if (!response.ok) throw new Error(await response.text());
      setReceipt((await response.json()) as PrivacyReceipt);
      setMessage("Privacy receipt created locally.");
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
            <p className="eyebrow">Zero-Dollar QVAC Payment Firewall</p>
            <h1>CloakPay AI</h1>
            <p className="subtitle">Local AI checks the payment before Solana sees it.</p>
          </div>
          <div className="status-pill">{message}</div>
        </header>

        <section className="stack-strip">
          {stackStatus.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <div className="console-grid">
          <section className="panel input-panel">
            <div className="panel-header">
              <span>1</span>
              <h2>Payment Input</h2>
            </div>
            <label className="dropzone">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
              />
              {imagePreview ? <img src={imagePreview} alt="Payment upload preview" /> : <strong>Upload invoice image</strong>}
            </label>
            <textarea value={invoiceText} onChange={(event) => setInvoiceText(event.target.value)} />
            <div className="button-row">
              <button disabled={busy} onClick={() => analyzePayment(true)}>
                Run Sample
              </button>
              <button disabled={busy || (!file && !invoiceText.trim())} onClick={() => analyzePayment(false)}>
                Analyze
              </button>
            </div>
          </section>

          <section className="panel analysis-panel">
            <div className="panel-header">
              <span>2</span>
              <h2>QVAC Analysis</h2>
            </div>
            <div className="metric-row">
              <div>
                <small>Mode</small>
                <strong>{analysis?.mode ?? qvacStatus?.mode ?? "Pending"}</strong>
              </div>
              <div>
                <small>Runtime</small>
                <strong>{analysis ? `${analysis.qvacStats.processingMs}ms` : "Idle"}</strong>
              </div>
              <div>
                <small>Local Only</small>
                <strong>{qvacStatus?.localOnly ? "Yes" : "Checking"}</strong>
              </div>
              <div>
                <small>Paid Services</small>
                <strong>{qvacStatus?.paidServices === false ? "None" : "None"}</strong>
              </div>
            </div>
            <div className="ocr-list">
              {(analysis?.blocks ?? []).map((block, index) => (
                <p key={`${block.text}-${index}`}>{block.text}</p>
              ))}
              {!analysis && <p className="muted">OCR blocks and local analysis evidence will appear here.</p>}
            </div>
          </section>

          <section className={`panel risk-panel ${riskClass}`}>
            <div className="panel-header">
              <span>3</span>
              <h2>Risk Decision</h2>
            </div>
            <div className="risk-score">
              <small>Verdict</small>
              <strong>{verdictLabel(analysis?.riskReport.verdict)}</strong>
              <b>{analysis?.riskReport.score ?? 0}/100</b>
            </div>
            <p className="explanation">{analysis?.riskReport.explanation ?? "Run analysis to score the payment."}</p>
            <div className="warnings">
              {(analysis?.riskReport.warnings ?? []).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
            <div className="evidence-list">
              {(analysis?.riskReport.evidence ?? []).map((item) => (
                <code key={item}>{item}</code>
              ))}
            </div>
          </section>

          <section className="panel review-panel">
            <div className="panel-header">
              <span>4</span>
              <h2>Intent Review</h2>
            </div>
            <label>
              Merchant
              <input value={intent?.merchant ?? ""} onChange={(event) => intent && setIntent({ ...intent, merchant: event.target.value })} />
            </label>
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
                onChange={(event) => intent && setIntent({ ...intent, token: event.target.value as PaymentIntent["token"] })}
              >
                <option>SOL</option>
                <option>USDT</option>
                <option>UNKNOWN</option>
              </select>
            </label>
            <label>
              Memo
              <input value={intent?.memo ?? ""} onChange={(event) => intent && setIntent({ ...intent, memo: event.target.value })} />
            </label>
          </section>

          <section className="panel wallet-panel">
            <div className="panel-header">
              <span>5</span>
              <h2>Sign On Devnet</h2>
            </div>
            <div className="receipt-block">
              <small>Wallet</small>
              <strong>{formatAddress(walletAddress)}</strong>
            </div>
            <button disabled={busy || Boolean(walletAddress)} onClick={connectWallet}>
              Connect Wallet
            </button>
            <button disabled={busy || !intent || !walletAddress || analysis?.riskReport.verdict === "block"} onClick={prepareTransaction}>
              Prepare Devnet SOL
            </button>
            <button disabled={busy || !canSend} onClick={signAndSend}>
              Sign And Send
            </button>
            {prepared && (
              <div className="receipt-block">
                <small>Prepared transfer</small>
                <p>{prepared.lamports} lamports to {formatAddress(prepared.to)}</p>
              </div>
            )}
            {txSignature && (
              <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noreferrer">
                View devnet transaction
              </a>
            )}
          </section>

          <section className="panel receipt-panel">
            <div className="panel-header">
              <span>6</span>
              <h2>Privacy Receipt</h2>
            </div>
            <button disabled={busy || !intent} onClick={createReceipt}>
              Create Receipt
            </button>
            {receipt ? (
              <div className="receipt-stack">
                <div className="receipt-block">
                  <small>Redacted summary</small>
                  <p>{receipt.redactedSummary}</p>
                </div>
                <div className="receipt-block">
                  <small>Invoice hash</small>
                  <code>{receipt.invoiceHash}</code>
                </div>
                <div className="receipt-block">
                  <small>Commitment</small>
                  <code>{receipt.commitment}</code>
                </div>
                <div className="receipt-block">
                  <small>Nullifier preview</small>
                  <code>{receipt.nullifierHash}</code>
                </div>
              </div>
            ) : (
              <p className="muted">Receipt will prove what was checked without exposing private invoice text.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
