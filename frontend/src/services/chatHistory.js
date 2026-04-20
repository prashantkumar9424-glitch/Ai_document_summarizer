const CHAT_HISTORY_STORAGE_KEY = "insights-user-chat-history";
const MAX_CHAT_HISTORY_ITEMS = 18;

function readHistoryMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeHistoryMap(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(value));
}

export function loadUserChatHistory(userId) {
  if (!userId) {
    return [];
  }

  const historyMap = readHistoryMap();
  return Array.isArray(historyMap[userId]) ? historyMap[userId] : [];
}

export function saveUserChatHistoryEntry(userId, entry) {
  if (!userId || !entry) {
    return [];
  }

  const historyMap = readHistoryMap();
  const currentHistory = Array.isArray(historyMap[userId]) ? historyMap[userId] : [];
  const nextHistory = [entry, ...currentHistory].slice(0, MAX_CHAT_HISTORY_ITEMS);

  historyMap[userId] = nextHistory;
  writeHistoryMap(historyMap);
  return nextHistory;
}
