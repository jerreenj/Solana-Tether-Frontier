import type { FeedbackItem, LocalHistoryItem } from "./types";

const historyKey = "cloakpay.localHistory.v1";
const feedbackKey = "cloakpay.feedback.v1";

function readArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function loadHistory() {
  return readArray<LocalHistoryItem>(historyKey);
}

export function saveHistoryItem(item: LocalHistoryItem) {
  const next = [item, ...loadHistory().filter((entry) => entry.id !== item.id)].slice(0, 12);
  return writeArray(historyKey, next);
}

export function updateHistoryItem(id: string, patch: Partial<LocalHistoryItem>) {
  const next = loadHistory().map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
  return writeArray(historyKey, next);
}

export function loadFeedback() {
  return readArray<FeedbackItem>(feedbackKey);
}

export function saveFeedbackItem(item: FeedbackItem) {
  const next = [item, ...loadFeedback()].slice(0, 20);
  return writeArray(feedbackKey, next);
}

export function clearFeedback() {
  return writeArray<FeedbackItem>(feedbackKey, []);
}
