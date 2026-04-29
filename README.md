# Teams Attendance Alert 🔔

A browser extension that monitors Microsoft Teams chat and live captions for attendance codes — and alerts you instantly via on-screen notification + Telegram message.

Built for Accenture Pre-Joining OB sessions where attendance codes are dropped in chat and missing them means missing attendance.

---

## Features

- **Dual-layer monitoring** — watches both Teams chat messages and live captions simultaneously
- **Smart code detection** — catches 8-character hex codes (`1f716eb4`) and 8-digit numeric codes (`12345678`), comma-separated too
- **Keyword detection** — configurable keywords like "attendance", "code", "portal" etc. (can be toggled off)
- **Telegram alert** — sends message to your Telegram instantly, even if you're away from the screen
- **On-screen toast** — subtle corner notification with source (Chat / Captions) and timestamp
- **Captions status indicator** — shows live whether captions are active in your meeting
- **Simulate mode** — test any message string to verify detection before your session
- **Clean minimal UI** — dark popup, no clutter

---

## Setup

### 1. Create a Telegram Bot

1. Open Telegram → search **@BotFather**
2. Send `/newbot` → follow prompts → copy the **Bot Token**
3. Search **@userinfobot** → send `/start` → note your **Chat ID**
4. Open your bot and send `/start` to it (required before first message)

### 2. Add your credentials to the extension

Open `content.js` and `background.js` — update these two lines near the top:

```js
const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const TELEGRAM_CHAT_ID   = "YOUR_CHAT_ID_HERE";
```

Both files need to be updated.

### 3. Install in Edge (or Chrome)

1. Go to `edge://extensions/` (or `chrome://extensions/`)
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `teams-monitor` folder
5. Extension is now installed ✓

### 4. Use it

1. Open [Teams Web](https://teams.microsoft.com) in your browser
2. Join your meeting
3. **Turn on Live Captions** in the meeting (`...` → `Turn on live captions`) — recommended
4. Click the extension icon to confirm monitoring is **Active**
5. That's it — you'll be alerted the moment a code or keyword appears

---

## Extension Popup

| Element | Description |
|---|---|
| **Active / Paused pill** | Current monitoring status |
| **Captions card** | Shows if live captions are detected in the meeting |
| **Last Alert card** | Timestamp of most recent detection |
| **Keywords card** | Whether keyword detection is on or off |
| **Pause / Resume button** | Toggle monitoring on/off |
| **Keyword detection toggle** | Disable keyword alerts, keep code detection active |
| **Test Alert button** | Fires a test — sound + toast + Telegram |
| **Simulate input** | Type any text and hit Run/Enter to test detection |
| **Keywords textarea** | Edit which keywords trigger alerts (one per line) |

---

## How Detection Works

**Priority 1 — Code Pattern (always on)**

Matches any 8-character alphanumeric or 8-digit number, optionally comma-separated:

```
1f716eb4          ✓
12345678          ✓
1f716eb4,357e6d01 ✓
```

Cooldown: 20 seconds between code alerts.

**Priority 2 — Keywords (toggleable)**

Default keywords: `attendance`, `code`, `mark`, `present`, `portal`, `submit`, `fill`

Cooldown: 60 seconds between keyword alerts.

**Sources monitored:**
- Teams chat DOM (MutationObserver on new messages)
- Live captions DOM (`data-tid="closed-caption-text"`, polled every 1.5s)

---

## Telegram Alert Format

**Code detected:**
```
🔑 Attendance Code!

Code: `1f716eb4`
Source: Chat

[full message text]
```

**Keyword detected:**
```
⚠️ Keyword: "attendance"
Source: Captions

[full message text]
```

---

## File Structure

```
teams-attendance-bot/
├── manifest.json     # Extension config (Manifest V3)
├── content.js        # Injected into Teams tab — monitors chat + captions
├── background.js     # Service worker — handles Telegram API calls
├── popup.html        # Extension popup UI
└── popup.js          # Popup logic (separate file, required by CSP)
```

---

## Notes

- Captions must be turned on manually each session — the extension cannot enable them automatically
- The extension only runs on `teams.microsoft.com` and `teams.live.com`
- If you reload the Teams tab, the extension re-injects automatically
- Keep the Teams tab open in the background — the extension monitors it even when you're on another tab

---

## Built by

[@thegurjararyan](https://github.com/thegurjararyan)
