import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { PrismaHero } from "./components/ui/prisma-hero";
import {
  clearFeedback,
  clearMonitorEvents,
  clearProfile,
  loadFeedback,
  loadHistory,
  loadMonitorEvents,
  loadProfile,
  saveFeedbackItem,
  saveHistoryItem,
  saveMonitorEvent,
  saveProfile,
  updateHistoryItem
} from "./localStore";
import { analyzeLocally, createLocalReceipt } from "./localAnalysis";
import type {
  AnalysisResponse,
  FeedbackCategory,
  FeedbackItem,
  LocalHistoryItem,
  MonitorEvent,
  NetworkCluster,
  PaymentIntent,
  PreparedTransaction,
  PrivacyReceipt,
  QvacStatus,
  UserProfile
} from "./types";

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

const networkEndpoints: Record<NetworkCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com"
};

const networkLabels: Record<NetworkCluster, string> = {
  devnet: "Devnet",
  "mainnet-beta": "Mainnet-Beta"
};

const productDescription = "a local-first QVAC Tether payment firewall for Solana payments.";

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

const feedbackUrl = "https://github.com/jerreenj/CloakPayAI-Solana-Tether/issues/new";
const faucetUrl = "https://faucet.solana.com/";
const supportEmail = "mailto:jerreen08@gmail.com?subject=CloakPay%20AI%20Support";

function getConnection(network: NetworkCluster) {
  return new Connection(networkEndpoints[network], "confirmed");
}

function explorerTxUrl(signature: string, network: NetworkCluster) {
  return `https://explorer.solana.com/tx/${signature}${network === "devnet" ? "?cluster=devnet" : ""}`;
}

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

function displayToken(value?: string) {
  if (!value) return "Pending";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

function toPublicKey(value: string, fallback: string) {
  try {
    return new PublicKey(value);
  } catch {
    return new PublicKey(fallback);
  }
}

function createId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
  const [history, setHistory] = useState<LocalHistoryItem[]>(() => loadHistory());
  const [currentHistoryId, setCurrentHistoryId] = useState("");
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>(() => loadFeedback());
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>(() => loadMonitorEvents());
  const [accountName, setAccountName] = useState(() => loadProfile()?.name ?? "Preview Operator");
  const [accountEmail, setAccountEmail] = useState(() => loadProfile()?.email ?? "");
  const [network, setNetwork] = useState<NetworkCluster>("devnet");
  const [mainnetAcknowledged, setMainnetAcknowledged] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
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
  const canSend = Boolean(
    intent &&
      walletAddress &&
      prepared &&
      analysis?.riskReport.verdict !== "block" &&
      (prepared.network !== "mainnet-beta" || mainnetAcknowledged)
  );

  function logEvent(level: MonitorEvent["level"], area: MonitorEvent["area"], eventMessage: string) {
    setMonitorEvents(
      saveMonitorEvent({
        id: createId(),
        createdAt: new Date().toISOString(),
        level,
        area,
        message: eventMessage,
        network
      })
    );
  }

  const stackStatus = useMemo(
    () => [
      ["AI", qvacStatus?.mode === "live-qvac" ? "Live local QVAC" : "Free fallback demo"],
      ["RPC", `${networkLabels[network]} public RPC`],
      ["Account", profile ? profile.name : "Local preview profile"],
      ["Support", "Email + GitHub + export"]
    ],
    [network, profile, qvacStatus]
  );

  const productionReadiness = useMemo(
    () => [
      ["Mainnet payments", "Enabled for SOL transfer preparation with explicit user confirmation before real funds move."],
      ["Payment reliability", "Devnet and mainnet transaction builders use public Solana RPC with wallet-side signing."],
      ["Security review", "Mainnet includes user confirmation gates; independent audit remains your responsibility before scale."],
      ["Accounts/history", "Wallet-linked local profile, activity history, and exportable receipts are enabled."],
      ["Monitoring/support", "Health endpoint, local event log, email support, GitHub issues, and exportable feedback are enabled."],
      [
        "QVAC proof",
        qvacStatus?.mode === "live-qvac"
          ? "Live local QVAC mode is detected."
          : "Hosted preview uses fallback; record local QVAC proof with QVAC_MOCK=0."
      ]
    ],
    [qvacStatus]
  );

  const feedbackIssueUrl = useMemo(() => {
    const params = new URLSearchParams({
      title: `Preview feedback: ${feedbackCategory}`,
      body: `Category: ${feedbackCategory}\nContact: ${feedbackEmail || "not provided"}\n\n${feedbackText || "Write feedback here."}`
    });
    return `${feedbackUrl}?${params.toString()}`;
  }, [feedbackCategory, feedbackEmail, feedbackText]);

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

  function rememberAnalysis(data: AnalysisResponse, nextReceipt?: PrivacyReceipt) {
    const id = createId();
    setCurrentHistoryId(id);
    setHistory(
      saveHistoryItem({
      id,
      createdAt: new Date().toISOString(),
      network,
      merchant: data.intent.merchant,
        amount: data.intent.amount,
        token: data.intent.token,
        verdict: data.riskReport.verdict,
        score: data.riskReport.score,
        mode: data.mode,
        receiptCommitment: nextReceipt?.commitment,
        txSignature: nextReceipt?.txSignature
      })
    );
    logEvent("info", "analysis", `Analysis finished with ${data.riskReport.verdict} verdict.`);
  }

  function rememberReceipt(nextReceipt: PrivacyReceipt, signature = txSignature) {
    if (!currentHistoryId) return;
    setHistory(
      updateHistoryItem(currentHistoryId, {
        receiptCommitment: nextReceipt.commitment,
        txSignature: signature || nextReceipt.txSignature
      })
    );
    logEvent("info", "receipt", "Privacy receipt created and stored locally.");
  }

  function saveAccount() {
    const now = new Date().toISOString();
    const nextProfile = saveProfile({
      id: profile?.id ?? createId(),
      name: accountName.trim() || "Preview Operator",
      email: accountEmail.trim() || undefined,
      walletAddress: walletAddress || profile?.walletAddress,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now
    });
    setProfile(nextProfile);
    logEvent("info", "system", "Local account profile saved.");
    setMessage("Local account saved. It stays in this browser unless exported.");
  }

  function submitLocalFeedback() {
    const trimmed = feedbackText.trim();
    if (!trimmed) {
      setMessage("Write a short feedback note first.");
      return;
    }
    const item: FeedbackItem = {
      id: createId(),
      createdAt: new Date().toISOString(),
      category: feedbackCategory,
      message: trimmed,
      email: feedbackEmail.trim() || undefined
    };
    setFeedbackItems(saveFeedbackItem(item));
    setFeedbackText("");
    logEvent("info", "support", `Feedback saved locally: ${feedbackCategory}.`);
    setMessage("Feedback saved locally. Export it or open a GitHub issue when ready.");
  }

  async function tryWithoutWallet() {
    setBusy(true);
    setFile(null);
    setImagePreview("");
    setPrepared(null);
    setTxSignature("");
    setInvoiceText(safeInvoice);
    const data = analyzeLocally({ text: safeInvoice, fileName: "safe-public-preview.txt", browserFallback: true });
    const nextReceipt = await createLocalReceipt({
      intent: data.intent,
      riskReport: data.riskReport,
      invoiceText: safeInvoice
    });
    setAnalysis(data);
    setIntent(data.intent);
    setReceipt(nextReceipt);
    rememberAnalysis(data, nextReceipt);
    setMessage("Walletless preview complete: analysis and receipt were created locally.");
    setBusy(false);
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
      rememberAnalysis(data);
      setMessage(`${displayToken(data.mode)} analysis complete: ${verdictLabel(data.riskReport.verdict)}.`);
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
      rememberAnalysis(data);
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
    const address = result.publicKey.toBase58();
    setWalletAddress(address);
    const now = new Date().toISOString();
    const nextProfile = saveProfile({
      id: profile?.id ?? createId(),
      name: profile?.name ?? (accountName.trim() || "Wallet Operator"),
      email: profile?.email ?? (accountEmail.trim() || undefined),
      walletAddress: address,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now
    });
    setProfile(nextProfile);
    logEvent("info", "wallet", `Wallet connected for ${networkLabels[network]}.`);
    setMessage(`Wallet connected for ${networkLabels[network]} flow.`);
  }

  async function prepareTransaction() {
    if (!intent || !walletAddress) return;
    if (network === "mainnet-beta" && !mainnetAcknowledged) {
      setMessage("Confirm the mainnet real-funds warning before preparing a mainnet transaction.");
      logEvent("warn", "wallet", "Mainnet prepare blocked until explicit confirmation.");
      return;
    }
    setBusy(true);
    setMessage(`Preparing ${networkLabels[network]} transaction...`);
    try {
      const response = await fetch("/api/solana/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, payer: walletAddress, network })
      });
      if (!response.ok) throw new Error(await response.text());
      setPrepared((await response.json()) as PreparedTransaction);
      setMessage("Transaction prepared. Nothing has been signed yet.");
      logEvent("info", "wallet", `${networkLabels[network]} transaction prepared.`);
    } catch (error) {
      try {
        if (intent.token === "USDT") {
          throw new Error("USDT is tracked in the payment intent, but CloakPay currently prepares SOL transfers only.");
        }
        const connection = getConnection(network);
        const fallbackKey = "11111111111111111111111111111111";
        const fromPubkey = toPublicKey(walletAddress, fallbackKey);
        const toPubkey = toPublicKey(intent.recipientAddress, fallbackKey);
        const lamports = Math.max(1, Math.round(intent.amount * LAMPORTS_PER_SOL));
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        const transaction = new Transaction({ feePayer: fromPubkey, recentBlockhash: blockhash }).add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
        );
        setPrepared({
          network,
          from: fromPubkey.toBase58(),
          to: toPubkey.toBase58(),
          lamports,
          recentBlockhash: transaction.recentBlockhash ?? blockhash,
          serializedTransaction: window.btoa(String.fromCharCode(...transaction.serialize({ requireAllSignatures: false }))),
          explorerUrl: `https://explorer.solana.com/address/${toPubkey.toBase58()}${network === "devnet" ? "?cluster=devnet" : ""}`
        });
        logEvent("warn", "wallet", "Hosted API unavailable; transaction prepared in browser fallback.");
        setMessage("Hosted API unavailable, so the transaction was prepared in your browser.");
      } catch (fallbackError) {
        setMessage(fallbackError instanceof Error ? fallbackError.message : "Could not prepare transaction.");
        logEvent("error", "wallet", fallbackError instanceof Error ? fallbackError.message : "Could not prepare transaction.");
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
        const connection = getConnection(prepared.network);
        signature = await connection.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Wallet does not support transaction signing.");
      }

      const connection = getConnection(prepared.network);
      await connection.confirmTransaction(signature, "confirmed");
      setTxSignature(signature);
      if (currentHistoryId) {
        setHistory(updateHistoryItem(currentHistoryId, { txSignature: signature }));
      }
      logEvent("info", "wallet", `${networkLabels[prepared.network]} payment sent.`);
      setMessage(`${networkLabels[prepared.network]} payment sent.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signing failed.");
      logEvent("error", "wallet", error instanceof Error ? error.message : "Signing failed.");
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
      const nextReceipt = (await response.json()) as PrivacyReceipt;
      setReceipt(nextReceipt);
      rememberReceipt(nextReceipt);
      setMessage("Privacy receipt created locally.");
    } catch (error) {
      const nextReceipt = await createLocalReceipt({
        intent,
        riskReport: analysis?.riskReport,
        invoiceText,
        txSignature
      });
      setReceipt(nextReceipt);
      rememberReceipt(nextReceipt);
      setMessage("Hosted API unavailable, so the privacy receipt was created in your browser.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="site-shell">
      <PrismaHero />

      <section className="app-shell" aria-label="CloakPay AI product workspace">
        <section id="demo" className="app-section demo-section">
          <div className="section-inner">
            <header className="view-header">
              <div>
                <h1>Preview Command Center</h1>
                <p>Try the firewall first, see the free local stack, then jump into the devnet payment flow when you are ready.</p>
              </div>
              <div className="status-pill">
                <small>Live Preview Status</small>
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

            <section className="user-guide" aria-label="First time guide">
              <div>
                <small>Start here</small>
                <strong>Try the firewall before connecting a wallet.</strong>
                <p>Run a safe or risky sample to see how CloakPay catches payment risk before signing.</p>
                <button type="button" disabled={busy} onClick={tryWithoutWallet}>
                  Try Without Wallet
                </button>
              </div>
              <div>
                <small>User account</small>
                <strong>{profile ? profile.name : "Create local profile"}</strong>
                <p>Save a free wallet-linked operator profile, then export account history before submission or user testing.</p>
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Name" />
                <input value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="Email or support contact" />
                <button type="button" onClick={saveAccount}>
                  Save Account
                </button>
              </div>
              <div>
                <small>Wallet testers</small>
                <strong>Start on devnet, switch when ready.</strong>
                <p>Use devnet for public testing. Mainnet is available only after confirming the real-funds warning.</p>
                <a href={faucetUrl} target="_blank" rel="noreferrer">
                  Get Devnet SOL
                </a>
              </div>
              <div>
                <small>Feedback</small>
                <strong>Help shape the real product.</strong>
                <p>Send bugs, confusing screens, wallet issues, or invoice cases we should support next.</p>
                <div className="mini-actions">
                  <a href={feedbackUrl} target="_blank" rel="noreferrer">
                    GitHub Issue
                  </a>
                  <a href={supportEmail}>
                    Email Support
                  </a>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="firewall" className="app-section firewall-section">
          <div className="section-inner">
            <header className="view-header">
              <div>
                <small>Firewall</small>
                <h1>Payment Firewall</h1>
                <p>Extract payment details, score invoice risk, review intent, sign on devnet, and save a privacy receipt.</p>
              </div>
              <div className="status-pill">
                <small>Risk decision</small>
                <strong>{verdictLabel(analysis?.riskReport.verdict)}</strong>
              </div>
            </header>

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
                    <strong>{displayToken(analysis?.mode ?? qvacStatus?.mode)}</strong>
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
                  <h2>Sign Payment</h2>
                </div>
                <div className="safety-banner">
                  Mainnet is enabled for SOL transfers only. Mainnet uses real funds and must be tested carefully before sharing with users.
                </div>
                <label className="network-control">
                  Network
                  <select
                    value={network}
                    onChange={(event) => {
                      const nextNetwork = event.target.value as NetworkCluster;
                      setNetwork(nextNetwork);
                      setPrepared(null);
                      setTxSignature("");
                      setMainnetAcknowledged(false);
                      logEvent("info", "wallet", `Network switched to ${networkLabels[nextNetwork]}.`);
                    }}
                  >
                    <option value="devnet">Devnet</option>
                    <option value="mainnet-beta">Mainnet-Beta</option>
                  </select>
                </label>
                {network === "mainnet-beta" && (
                  <label className="mainnet-check">
                    <input
                      type="checkbox"
                      checked={mainnetAcknowledged}
                      onChange={(event) => setMainnetAcknowledged(event.target.checked)}
                    />
                    I understand this prepares a real mainnet SOL transaction with real funds.
                  </label>
                )}
                <div className="receipt-block">
                  <small>Wallet</small>
                  <strong>{formatAddress(walletAddress)}</strong>
                </div>
                <button disabled={busy || Boolean(walletAddress)} onClick={connectWallet}>
                  Connect Wallet
                </button>
                <button
                  disabled={
                    busy ||
                    !intent ||
                    !walletAddress ||
                    analysis?.riskReport.verdict === "block" ||
                    (network === "mainnet-beta" && !mainnetAcknowledged)
                  }
                  onClick={prepareTransaction}
                >
                  Prepare {networkLabels[network]} SOL
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
                {txSignature && prepared && (
                  <a href={explorerTxUrl(txSignature, prepared.network)} target="_blank" rel="noreferrer">
                    View {networkLabels[prepared.network]} transaction
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
                <div className="feedback-footer">
                  <a href={feedbackUrl} target="_blank" rel="noreferrer">
                    Report issue or request feature
                  </a>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="readiness" className="app-section readiness-section">
          <div className="section-inner">
            <header className="view-header">
              <div>
                <small>Readiness</small>
                <h1>Production Readiness</h1>
                <p>Mainnet support, wallet accounts, monitoring, support, and exportable user history are now inside the product.</p>
              </div>
              <div className="status-pill">
                <small>Mainnet</small>
                <strong>Enabled with explicit real-funds confirmation.</strong>
              </div>
            </header>

            <section className="readiness-board" aria-label="Production readiness">
              <div className="section-heading">
                <small>Production path</small>
                <h2>Mainnet is available, but the product still forces user confirmation before real SOL can move.</h2>
              </div>
              <div className="readiness-grid">
                {productionReadiness.map(([label, value]) => (
                  <div key={label}>
                    <strong>{label}</strong>
                    <p>{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section id="history" className="app-section history-section">
          <div className="section-inner narrow-section">
            <header className="view-header single-column">
              <div>
                <small>History</small>
                <h1>Local User History</h1>
                <p>A free browser-only activity trail for analyses, receipts, and devnet transaction proof.</p>
              </div>
            </header>

            <section className="panel history-panel">
              <div className="panel-header">
                <span>7</span>
                <h2>Local User History</h2>
              </div>
              <p className="muted">
                Account: {profile?.name ?? "Not saved"} {profile?.walletAddress ? `· ${formatAddress(profile.walletAddress)}` : ""}. This profile lives in this browser unless exported.
              </p>
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div>
                      <strong>{item.merchant}</strong>
                      <p>
                        {item.amount} {item.token} · {item.network ? networkLabels[item.network] : "Devnet"} · {verdictLabel(item.verdict)} · {item.score}/100
                      </p>
                    </div>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                    {item.txSignature && <code>{item.txSignature}</code>}
                    {item.receiptCommitment && <code>{item.receiptCommitment}</code>}
                  </div>
                ))}
                {!history.length && <p className="muted">Run an analysis to create the first local history item.</p>}
              </div>
              <button type="button" disabled={!history.length} onClick={() => downloadJson("cloakpay-history.json", history)}>
                Export History
              </button>
              <button type="button" disabled={!profile} onClick={() => downloadJson("cloakpay-account.json", profile)}>
                Export Account
              </button>
              <button
                type="button"
                disabled={!profile}
                onClick={() => {
                  setProfile(clearProfile());
                  logEvent("warn", "system", "Local account profile cleared.");
                  setMessage("Local account profile cleared.");
                }}
              >
                Clear Account
              </button>
            </section>
          </div>
        </section>

        <section id="feedback" className="app-section feedback-section">
          <div className="section-inner narrow-section">
            <header className="view-header single-column">
              <div>
                <small>Feedback</small>
                <h1>Feedback Loop</h1>
                <p>Capture user issues, wallet friction, invoice formats, and mainnet asks without adding a paid backend.</p>
              </div>
            </header>

            <section className="panel feedback-panel">
              <div className="panel-header">
                <span>8</span>
                <h2>Preview Feedback Loop</h2>
              </div>
              <label>
                Category
                <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value as FeedbackCategory)}>
                  <option value="bug">Bug</option>
                  <option value="wallet">Wallet signing</option>
                  <option value="invoice">Invoice parsing</option>
                  <option value="risk">Risk verdict</option>
                  <option value="mainnet">Mainnet request</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Email
                <input value={feedbackEmail} onChange={(event) => setFeedbackEmail(event.target.value)} placeholder="Optional email, Telegram, or Discord" />
              </label>
              <label>
                Feedback
                <textarea
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder="What broke, confused you, or should be added before mainnet?"
                />
              </label>
              <div className="button-row">
                <button type="button" onClick={submitLocalFeedback}>
                  Save Feedback
                </button>
                <button type="button" disabled={!feedbackItems.length} onClick={() => downloadJson("cloakpay-feedback.json", feedbackItems)}>
                  Export Feedback
                </button>
              </div>
              <a href={feedbackIssueUrl} target="_blank" rel="noreferrer">
                Open GitHub Issue
              </a>
              <a href={supportEmail}>
                Email Support
              </a>
              <button
                type="button"
                disabled={!feedbackItems.length}
                onClick={() => {
                  setFeedbackItems(clearFeedback());
                  setMessage("Local feedback inbox cleared.");
                }}
              >
                Clear Local Inbox
              </button>
              <div className="feedback-count">
                <strong>{feedbackItems.length}</strong>
                <span>Saved Local Feedback Item{feedbackItems.length === 1 ? "" : "s"}</span>
              </div>
              <div className="monitor-log">
                <div className="panel-header">
                  <span>9</span>
                  <h2>Production Monitor</h2>
                </div>
                <p className="muted">Local event trail for analysis, wallet, receipt, support, and system events.</p>
                <div className="history-list">
                  {monitorEvents.map((item) => (
                    <div key={item.id} className={`history-item monitor-${item.level}`}>
                      <strong>{item.area.toUpperCase()} · {item.level.toUpperCase()}</strong>
                      <p>{item.message}</p>
                      <small>{new Date(item.createdAt).toLocaleString()} · {item.network ? networkLabels[item.network] : "No network"}</small>
                    </div>
                  ))}
                  {!monitorEvents.length && <p className="muted">Run the product flow to generate monitor events.</p>}
                </div>
                <div className="button-row">
                  <button type="button" disabled={!monitorEvents.length} onClick={() => downloadJson("cloakpay-monitor-events.json", monitorEvents)}>
                    Export Monitor
                  </button>
                  <button
                    type="button"
                    disabled={!monitorEvents.length}
                    onClick={() => {
                      setMonitorEvents(clearMonitorEvents());
                      setMessage("Local monitor log cleared.");
                    }}
                  >
                    Clear Monitor
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
