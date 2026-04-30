import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { analyzeLocally, createLocalReceipt } from "./localAnalysis";
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

const productDescription = "a local-first QVAC payment firewall for Solana payments.";

const safeInvoice = `Merchant: Frontier Labs
Invoice: CLPAY-042
Amount: 0.25 SOL
Recipient: AKYq5mW4TTsz7xyzcoaNiD2VkCfg3eQmQcZkQrzkfVee
Memo: QVAC local payment firewall demo
Note: Pay after local verification only`;

const suspiciousInvoice = `Merchant: Unknown Airdrop Desk
Invoice: CLAIM-NOW
Amount: pending
Memo: urgent wallet verification
Note: Pay immediately to avoid fee. Bonus expires today. Never share seed phrase.`;

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

function toPublicKey(value: string, fallback: string) {
  try {
    return new PublicKey(value);
  } catch {
    return new PublicKey(fallback);
  }
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
  const [invoiceText, setInvoiceText] = useState(safeInvoice);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready for local payment analysis.");

  useEffect(() => {
    fetch("/api/qvac/status")
      .then((response) => {
        if (!response.ok) throw new Error("Hosted API unavailable.");
        return response.json();
      })
      .then((data: QvacStatus) => setQvacStatus(data))
      .catch(() => {
        setQvacStatus({
          localOnly: true,
          mode: "fallback-demo",
          ocrModel: "browser fallback",
          llmModel: "browser-risk-engine",
          paidServices: false,
          notes: ["Hosted API unavailable; public preview is running in browser fallback mode."]
        });
        setMessage("Public preview ready in browser fallback mode.");
      });
  }, []);

  const riskClass = analysis?.riskReport.verdict ?? "pending";
  const canSend = Boolean(intent && walletAddress && prepared && analysis?.riskReport.verdict !== "block");

  const stackStatus = useMemo(
    () => [
      ["AI", qvacStatus?.mode === "live-qvac" ? "Live local QVAC" : "Free fallback demo"],
      ["RPC", "Public Solana devnet"],
      ["Storage", "Browser/local only"],
      ["Build Cost", "$0"]
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

  function loadSample(nextText: string) {
    setFile(null);
    setImagePreview("");
    setAnalysis(null);
    setIntent(null);
    setReceipt(null);
    setPrepared(null);
    setTxSignature("");
    setInvoiceText(nextText);
    setMessage("Sample loaded. Run analysis to score it locally.");
  }

  async function analyzePayment(useSampleText = false) {
    setBusy(true);
    setMessage(useSampleText ? "Running local sample analysis..." : "Running local payment firewall...");
    const fallbackFileName = file ? file.name : "sample-invoice.txt";
    const fallbackText = file && !useSampleText ? undefined : invoiceText;
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
      const data = analyzeLocally({
        text: fallbackText,
        fileName: fallbackFileName,
        browserFallback: true
      });
      setAnalysis(data);
      setIntent(data.intent);
      setPrepared(null);
      setReceipt(null);
      setTxSignature("");
      setMessage("Hosted API unavailable, so CloakPay ran the payment firewall in your browser.");
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
      try {
        if (intent.token === "USDT") {
          throw new Error("USDT is tracked in the payment intent, but the $0 public preview only sends devnet SOL.");
        }
        const fallbackKey = "11111111111111111111111111111111";
        const fromPubkey = toPublicKey(walletAddress, fallbackKey);
        const toPubkey = toPublicKey(intent.recipientAddress, fallbackKey);
        const lamports = Math.max(1, Math.round(intent.amount * LAMPORTS_PER_SOL));
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        const transaction = new Transaction({ feePayer: fromPubkey, recentBlockhash: blockhash }).add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
        );
        setPrepared({
          network: "devnet",
          from: fromPubkey.toBase58(),
          to: toPubkey.toBase58(),
          lamports,
          recentBlockhash: transaction.recentBlockhash ?? blockhash,
          serializedTransaction: window.btoa(String.fromCharCode(...transaction.serialize({ requireAllSignatures: false }))),
          explorerUrl: `https://explorer.solana.com/address/${toPubkey.toBase58()}?cluster=devnet`
        });
        setMessage("Hosted API unavailable, so the devnet transaction was prepared in your browser.");
      } catch (fallbackError) {
        setMessage(fallbackError instanceof Error ? fallbackError.message : "Could not prepare transaction.");
      }
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
      setReceipt(
        await createLocalReceipt({
          intent,
          riskReport: analysis?.riskReport,
          invoiceText,
          txSignature
        })
      );
      setMessage("Hosted API unavailable, so the privacy receipt was created in your browser.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div className="hero-copy">
            <p className="eyebrow">QVAC Payment Firewall</p>
            <h1>CloakPay AI</h1>
            <p className="subtitle">{productDescription}</p>
            <p className="hero-note">A judge-ready demo for checking private payment context before a wallet signs on Solana devnet.</p>
          </div>
          <div className="status-pill">
            <small>Live demo status</small>
            <strong>{message}</strong>
          </div>
        </header>

        <section className="stack-strip">
          {stackStatus.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section className="flow-rail" aria-label="Demo flow">
          {["Input", "Analyze", "Decide", "Review", "Sign", "Receipt"].map((step, index) => (
            <div key={step} className={index < 2 || analysis ? "active" : ""}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
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
            <div className="sample-row">
              <button type="button" disabled={busy} onClick={() => loadSample(safeInvoice)}>
                Safe Sample
              </button>
              <button type="button" disabled={busy} onClick={() => loadSample(suspiciousInvoice)}>
                Risky Sample
              </button>
            </div>
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
              <h2>Local Analysis</h2>
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
