let isOn = true;
let kwOn = true;

const toggleBtn     = document.getElementById('toggleBtn');
const monitorPill   = document.getElementById('monitorPill');
const pillText      = document.getElementById('pillText');
const kwToggle      = document.getElementById('kwToggle');
const kwStatus      = document.getElementById('kwStatus');
const testBtn       = document.getElementById('testBtn');
const simBtn        = document.getElementById('simBtn');
const simInput      = document.getElementById('simInput');
const saveBtn       = document.getElementById('saveBtn');
const keywordsInput = document.getElementById('keywordsInput');
const captionStatus = document.getElementById('captionStatus');
const lastAlertEl   = document.getElementById('lastAlertTime');

// Load state
chrome.storage.local.get(['keywords','monitoring','keywordsEnabled','captionsActive','lastAlert'], (data) => {
  if (data.keywords) keywordsInput.value = data.keywords.join('\n');
  if (data.monitoring === false) { isOn = false; updateMonitorUI(); }
  if (data.keywordsEnabled === false) { kwOn = false; kwToggle.checked = false; updateKwUI(); }
  updateCaptionUI(!!data.captionsActive);
  if (data.lastAlert) lastAlertEl.textContent = data.lastAlert;
});

// Poll every 2s for caption + last alert updates
setInterval(() => {
  chrome.storage.local.get(['captionsActive','lastAlert'], (data) => {
    updateCaptionUI(!!data.captionsActive);
    if (data.lastAlert) lastAlertEl.textContent = data.lastAlert;
  });
}, 2000);

function updateMonitorUI() {
  if (isOn) {
    toggleBtn.textContent = 'Pause Monitoring';
    toggleBtn.className = 'btn btn-danger';
    monitorPill.className = 'pill on';
    pillText.textContent = 'Active';
  } else {
    toggleBtn.textContent = 'Resume Monitoring';
    toggleBtn.className = 'btn btn-success';
    monitorPill.className = 'pill off';
    pillText.textContent = 'Paused';
  }
}

function updateKwUI() {
  kwStatus.textContent = kwOn ? 'On' : 'Off';
  kwStatus.className = 'card-value ' + (kwOn ? 'green' : 'muted');
}

function updateCaptionUI(active) {
  captionStatus.textContent = active ? 'Active' : 'Inactive';
  captionStatus.className = 'card-value ' + (active ? 'green' : 'muted');
}

toggleBtn.addEventListener('click', () => {
  isOn = !isOn;
  updateMonitorUI();
  chrome.storage.local.set({ monitoring: isOn });
  send({ type: 'TOGGLE_MONITORING', value: isOn });
});

kwToggle.addEventListener('change', () => {
  kwOn = kwToggle.checked;
  updateKwUI();
  send({ type: 'TOGGLE_KEYWORDS', value: kwOn });
});

testBtn.addEventListener('click', () => {
  send({ type: 'TEST_ALERT' });
  testBtn.textContent = '✓ Sent';
  setTimeout(() => testBtn.textContent = '🔔 Test Alert', 1500);
});

simBtn.addEventListener('click', () => {
  const text = simInput.value.trim();
  if (!text) return;
  send({ type: 'SIMULATE', text });
  simInput.value = '';
  simBtn.textContent = '✓';
  setTimeout(() => simBtn.textContent = 'Run', 1200);
});

simInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') simBtn.click();
});

saveBtn.addEventListener('click', () => {
  const keywords = keywordsInput.value.split('\n').map(k => k.trim()).filter(Boolean);
  chrome.storage.local.set({ keywords });
  send({ type: 'UPDATE_KEYWORDS', keywords });
  saveBtn.textContent = '✓ Saved';
  setTimeout(() => saveBtn.textContent = 'Save Keywords', 1500);
});

function send(msg) {
  chrome.runtime.sendMessage(msg, () => chrome.runtime.lastError);
}
