// Background Service Worker
// Created by @thegurjararyan

const TELEGRAM_BOT_TOKEN = "8451085577:AAFj4rLx1f9JHRQEPJz4xDS0KX97DMnmhU4";
const TELEGRAM_CHAT_ID = "650140634";

async function sendTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
    });
  } catch(e) { console.error("[AttAlert BG] Telegram error:", e); }
}

function sendToTeamsTabs(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url?.includes('teams.microsoft.com') || tab.url?.includes('teams.live.com')) {
        chrome.tabs.sendMessage(tab.id, msg, () => chrome.runtime.lastError);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SEND_TELEGRAM") {
    sendTelegram(msg.message);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "ATTENDANCE_DETECTED") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn5qYPC90ZXh0Pjwvc3ZnPg==",
      title: "Attendance Alert",
      message: msg.message || "Keyword detected in Teams",
      priority: 2,
      requireInteraction: true
    });
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "CAPTIONS_STATUS") {
    chrome.storage.local.set({ captionsActive: msg.active });
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "TEST_ALERT") {
    sendToTeamsTabs(msg);
    sendTelegram("🧪 Test — Teams Attendance Alert is active and working.");
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "SIMULATE") {
    sendToTeamsTabs(msg);
    sendTelegram("🔬 *Simulate triggered*\n\nText: `" + msg.text + "`");
    sendResponse({ ok: true });
    return true;
  }
  if (["TOGGLE_MONITORING", "TOGGLE_KEYWORDS", "UPDATE_KEYWORDS"].includes(msg.type)) {
    sendToTeamsTabs(msg);
    sendResponse({ ok: true });
    return true;
  }
});
