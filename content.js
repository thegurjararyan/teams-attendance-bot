// Teams Attendance Monitor - Content Script v2.0
// Created by @thegurjararyan

const TELEGRAM_BOT_TOKEN = "8451085577:AAFj4rLx1f9JHRQEPJz4xDS0KX97DMnmhU4";
const TELEGRAM_CHAT_ID = "650140634";

const CODE_PATTERN = /\b(?:[0-9a-f]{8}|[0-9]{8})(?:,(?:[0-9a-f]{8}|[0-9]{8}))*\b/i;
const KEYWORDS = ["attendance", "code", "mark", "present", "portal", "submit", "fill"];

const CODE_COOLDOWN = 20000;
const KW_COOLDOWN = 60000;
let lastCodeAlert = 0;
let lastKwAlert = 0;
let seenMessages = new Set();
let isMonitoring = true;
let keywordsEnabled = true;
let lastCaptionText = "";
let captionsActive = false;

chrome.storage.local.get(['keywordsEnabled'], (data) => {
  if (data.keywordsEnabled === false) keywordsEnabled = false;
});

// --- Telegram ---
function sendTelegram(message) {
  chrome.runtime.sendMessage({ type: "SEND_TELEGRAM", message });
}

// --- Alarm ---
function playAlarm() {
  try {
    const ctx = new AudioContext();
    [0, 0.3, 0.6].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 720; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.35);
    });
  } catch(e) {}
}

// --- Toast notification ---
function showToast(message, isCode = false, source = "Chat") {
  document.getElementById("aa-toast")?.remove();
  document.getElementById("aa-toast-style")?.remove();

  const accentColor = isCode ? '#22c55e' : '#f59e0b';

  const style = document.createElement("style");
  style.id = "aa-toast-style";
  style.textContent = `
    #aa-toast {
      position: fixed; bottom: 28px; right: 28px; z-index: 999999;
      background: #18181b; border: 1px solid #27272a;
      border-left: 3px solid ${accentColor};
      border-radius: 10px; padding: 14px 18px; width: 300px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: 'Segoe UI', sans-serif;
      animation: aa-slide 0.25s ease;
    }
    @keyframes aa-slide {
      from { opacity:0; transform: translateY(10px); }
      to   { opacity:1; transform: translateY(0); }
    }
    #aa-toast-top { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    #aa-toast-icon { font-size:15px; }
    #aa-toast-title {
      font-size:11px; font-weight:700; letter-spacing:0.8px;
      color:${accentColor}; text-transform:uppercase; flex:1;
    }
    #aa-toast-source {
      font-size:10px; color:#3f3f46; margin-right:6px;
    }
    #aa-toast-close {
      background:none; border:none; color:#3f3f46;
      cursor:pointer; font-size:13px; padding:0; line-height:1;
    }
    #aa-toast-close:hover { color:#71717a; }
    #aa-toast-msg {
      font-size:12px; color:#a1a1aa; line-height:1.5;
      word-break:break-word; background:#09090b;
      padding:8px 10px; border-radius:6px;
      font-family:${isCode ? 'monospace' : 'inherit'};
    }
    #aa-toast-time {
      margin-top:8px; font-size:10px; color:#3f3f46; text-align:right;
    }
  `;
  document.head.appendChild(style);

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const toast = document.createElement("div");
  toast.id = "aa-toast";
  toast.innerHTML = `
    <div id="aa-toast-top">
      <span id="aa-toast-icon">${isCode ? '🔑' : '⚡'}</span>
      <span id="aa-toast-title">${isCode ? 'Attendance Code' : 'Attendance Alert'}</span>
      <span id="aa-toast-source">via ${source}</span>
      <button id="aa-toast-close">✕</button>
    </div>
    <div id="aa-toast-msg">${message}</div>
    <div id="aa-toast-time">${now}</div>
  `;
  document.body.appendChild(toast);
  document.getElementById("aa-toast-close").onclick = () => toast.remove();
  setTimeout(() => toast?.remove(), 25000);

  // Update last alert in storage for popup display
  chrome.storage.local.set({ lastAlert: now });
}

// --- Core detection ---
function checkMessage(text, elementId, source = "Chat") {
  if (seenMessages.has(elementId)) return;
  seenMessages.add(elementId);
  if (!isMonitoring) return;

  const now = Date.now();

  // Code pattern — 20s cooldown
  const codeMatch = text.match(CODE_PATTERN);
  if (codeMatch && now - lastCodeAlert > CODE_COOLDOWN) {
    lastCodeAlert = now;
    const code = codeMatch[0];
    playAlarm();
    showToast(`Code: ${code}`, true, source);
    sendTelegram(`🔑 *Attendance Code!*\n\nCode: \`${code}\`\nSource: ${source}\n\n${text.substring(0, 150)}`);
    chrome.runtime.sendMessage({ type: "ATTENDANCE_DETECTED", message: `Code: ${code} (${source})` });
    return;
  }

  // Keywords — 60s cooldown
  if (!keywordsEnabled) return;
  const matched = KEYWORDS.find(k => text.toLowerCase().includes(k));
  if (matched && now - lastKwAlert > KW_COOLDOWN) {
    lastKwAlert = now;
    playAlarm();
    showToast(text.substring(0, 120) + (text.length > 120 ? '...' : ''), false, source);
    sendTelegram(`⚠️ *Keyword: "${matched}"*\nSource: ${source}\n\n${text.substring(0, 150)}`);
    chrome.runtime.sendMessage({ type: "ATTENDANCE_DETECTED", message: `${matched} detected (${source})` });
  }
}

// --- Chat DOM observer ---
function startChatObserver() {
  const selectors = [
    '[data-tid="chat-pane-message"]', '.fui-ChatMessage',
    '[class*="chatMessage"]', '[class*="message-body"]',
    '[class*="messageBody"]', 'p[class*="text"]', '[data-tid*="message"]'
  ];
  const observer = new MutationObserver((mutations) => {
    if (!isMonitoring) return;
    mutations.forEach(({ addedNodes }) => {
      addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        selectors.forEach(sel => {
          node.querySelectorAll?.(sel).forEach(el => {
            const text = el.innerText?.trim();
            const id = (el.getAttribute('data-tid') || el.className) + text?.substring(0, 20);
            if (text?.length > 2) checkMessage(text, id, "Chat");
          });
          if (node.matches?.(sel)) {
            const text = node.innerText?.trim();
            const id = (node.getAttribute('data-tid') || node.className) + text?.substring(0, 20);
            if (text?.length > 2) checkMessage(text, id, "Chat");
          }
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[AttAlert] 🟢 Chat monitor active");
}

// --- Caption monitor ---
function startCaptionMonitor() {
  setInterval(() => {
    const els = document.querySelectorAll('[data-tid="closed-caption-text"]');
    if (els.length > 0) {
      if (!captionsActive) {
        captionsActive = true;
        chrome.storage.local.set({ captionsActive: true });
        chrome.runtime.sendMessage({ type: "CAPTIONS_STATUS", active: true });
      }
      els.forEach(el => {
        const text = el.innerText?.trim();
        if (!text || text === lastCaptionText) return;
        lastCaptionText = text;
        checkMessage(text, "caption-" + text.substring(0, 30), "Captions");
      });
    } else {
      if (captionsActive) {
        captionsActive = false;
        chrome.storage.local.set({ captionsActive: false });
        chrome.runtime.sendMessage({ type: "CAPTIONS_STATUS", active: false });
      }
    }
  }, 1500);
  console.log("[AttAlert] 🎤 Caption monitor active");
}

// --- Message listener from popup/background ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TOGGLE_MONITORING") {
    isMonitoring = msg.value;
    sendResponse({ ok: true });
  }
  if (msg.type === "TOGGLE_KEYWORDS") {
    keywordsEnabled = msg.value;
    chrome.storage.local.set({ keywordsEnabled: msg.value });
    sendResponse({ ok: true });
  }
  if (msg.type === "TEST_ALERT") {
    playAlarm();
    showToast("Extension is working correctly ✓", false, "Test");
    sendTelegram("🧪 Test — Teams Attendance Alert is active and working.");
    sendResponse({ ok: true });
  }
  if (msg.type === "SIMULATE") {
    const fakeId = "simulate-" + Date.now();
    seenMessages.delete(fakeId); // always fresh
    checkMessage(msg.text, fakeId, "Simulate");
    sendResponse({ ok: true });
  }
  if (msg.type === "UPDATE_KEYWORDS") {
    KEYWORDS.length = 0;
    msg.keywords.forEach(k => KEYWORDS.push(k));
    sendResponse({ ok: true });
  }
  return true;
});

startChatObserver();
startCaptionMonitor();
