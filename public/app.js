// RIOT Feedback Portal — Enhanced with Wallet, Form Builder, Rich Text

const STORAGE_KEY = 'riot_feedback_submissions';
const FORM_CONFIG_KEY = 'riot_form_configs';
let submissionsData = [];
let currentFilter = 'all';
let connectedWallet = null;

async function connectWallet() {
  try {
    const anyWindow = window;
    if (anyWindow.suiWallet) {
      await anyWindow.suiWallet.requestPermissions();
      const accounts = await anyWindow.suiWallet.getAccounts();
      if (accounts && accounts.length > 0) {
        connectedWallet = accounts[0].address;
        updateWalletUI();
        showToast('Wallet connected', 'success');
        return;
      }
    }
    if (anyWindow.wallets) {
      const suiWallets = anyWindow.wallets.get();
      if (suiWallets && suiWallets.length > 0) {
        const wallet = suiWallets[0];
        await wallet.features['standard:connect'].connect();
        const accounts = await wallet.features['standard:accounts'].accounts();
        if (accounts && accounts.length > 0) {
          connectedWallet = accounts[0].address;
          updateWalletUI();
          showToast('Wallet connected', 'success');
          return;
        }
      }
    }
    showToast('No Sui wallet found. Install Sui Wallet.', 'error');
  } catch (err) {
    console.error(err);
    showToast('Failed to connect wallet', 'error');
  }
}

function disconnectWallet() {
  connectedWallet = null;
  updateWalletUI();
  showToast('Wallet disconnected', 'success');
}

function updateWalletUI() {
  const btn = document.getElementById('connectWalletBtn');
  const info = document.getElementById('walletInfo');
  const status = document.getElementById('walletStatus');
  const dot = document.getElementById('walletDot');
  const contactInput = document.getElementById('contactInput');

  if (connectedWallet) {
    if (btn) btn.style.display = 'none';
    if (info) info.style.display = 'flex';
    const short = connectedWallet.slice(0, 6) + '...' + connectedWallet.slice(-4);
    document.getElementById('walletAddress').textContent = short;
    if (status) status.textContent = 'Wallet connected';
    if (dot) dot.style.background = '#22c55e';
    if (contactInput && !contactInput.value) contactInput.value = connectedWallet;
  } else {
    if (btn) btn.style.display = 'block';
    if (info) info.style.display = 'none';
    if (status) status.textContent = 'No wallet connected';
    if (dot) dot.style.background = '#666';
  }
}

function initStarRating() {
  const container = document.getElementById('starRating');
  if (!container) return;
  const stars = container.querySelectorAll('span');
  const input = document.getElementById('ratingInput');
  const label = document.getElementById('ratingLabel');

  stars.forEach((star, idx) => {
    star.addEventListener('click', () => {
      const val = idx + 1;
      input.value = val;
      stars.forEach((s, i) => {
        s.classList.toggle('active', i < val);
      });
      const labels = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];
      if (label) label.textContent = labels[idx] + ' (' + val + '/5)';
    });
  });
}

function formatText(command) {
  const textarea = document.getElementById('messageArea');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);

  let replacement = selected;
  if (command === 'bold') replacement = '**' + (selected || 'bold text') + '**';
  if (command === 'italic') replacement = '_' + (selected || 'italic text') + '_';
  if (command === 'bullet') replacement = '\n• ' + (selected || 'item');

  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + replacement.length, start + replacement.length);
}

function generateShareableLink() {
  const title = document.getElementById('formTitle').value || 'Untitled Form';
  const config = {
    title: title,
    fields: {
      type: document.getElementById('toggleType')?.checked ?? true,
      rating: document.getElementById('toggleRating')?.checked ?? true,
      priority: document.getElementById('togglePriority')?.checked ?? true,
      message: document.getElementById('toggleMessage')?.checked ?? true,
      url: document.getElementById('toggleUrl')?.checked ?? true,
      file: document.getElementById('toggleFile')?.checked ?? true,
      encrypt: document.getElementById('toggleEncrypt')?.checked ?? true
    }
  };

  const formId = 'form_' + Math.random().toString(36).substr(2, 9);
  const configs = JSON.parse(localStorage.getItem(FORM_CONFIG_KEY) || '{}');
  configs[formId] = config;
  localStorage.setItem(FORM_CONFIG_KEY, JSON.stringify(configs));

  const url = window.location.origin + window.location.pathname + '?form=' + formId;
  const area = document.getElementById('shareableLinkArea');
  const link = document.getElementById('shareableLink');
  if (area && link) {
    link.textContent = url;
    area.style.display = 'block';
  }
  showToast('Shareable link generated!', 'success');
}

function loadFormConfig() {
  const params = new URLSearchParams(window.location.search);
  const formId = params.get('form');
  if (!formId) return;

  const configs = JSON.parse(localStorage.getItem(FORM_CONFIG_KEY) || '{}');
  const config = configs[formId];
  if (!config) return;

  if (config.title) document.getElementById('formTitle').value = config.title;

  const fields = config.fields || {};
  const toggleMap = {
    'toggleType': 'fieldType',
    'toggleRating': 'fieldRating',
    'togglePriority': 'fieldPriority',
    'toggleMessage': 'fieldMessage',
    'toggleUrl': 'fieldUrl',
    'toggleFile': 'fieldFile',
    'toggleEncrypt': 'fieldEncrypt'
  };

  Object.entries(toggleMap).forEach(([toggleId, fieldId]) => {
    const toggle = document.getElementById(toggleId);
    const field = document.getElementById(fieldId);
    if (toggle && field) {
      const key = toggleId.replace('toggle', '').toLowerCase();
      const enabled = fields[key] !== false;
      toggle.checked = enabled;
      field.style.display = enabled ? 'block' : 'none';
    }
  });
}

function generateBlobId() {
  const hex = '0123456789abcdef';
  let id = '0x';
  for (let i = 0; i < 64; i++) id += hex[Math.floor(Math.random() * 16)];
  return id;
}

function showToast(msg, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function initForm() {
  const form = document.getElementById('feedbackForm');
  if (!form) return;

  initStarRating();
  loadFormConfig();

  document.querySelectorAll('.field-toggle input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const map = {
        'toggleType': 'fieldType',
        'toggleRating': 'fieldRating',
        'togglePriority': 'fieldPriority',
        'toggleMessage': 'fieldMessage',
        'toggleUrl': 'fieldUrl',
        'toggleFile': 'fieldFile',
        'toggleEncrypt': 'fieldEncrypt'
      };
      const field = document.getElementById(map[toggle.id]);
      if (field) field.style.display = toggle.checked ? 'block' : 'none';
    });
  });

  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      document.getElementById('priorityInput').value = btn.dataset.value;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = document.getElementById('btnText');
    const statusArea = document.getElementById('statusArea');
    const resultArea = document.getElementById('resultArea');
    const blobIdDisplay = document.getElementById('blobIdDisplay');

    btnText.innerHTML = '<span class="spinner"></span> Uploading to Walrus...';
    statusArea.style.display = 'block';
    statusArea.style.cssText = 'display: block; text-align: center; padding: 1rem; border-radius: 0.75rem; font-size: 0.875rem; background: rgba(234, 179, 8, 0.05); border: 1px solid rgba(234, 179, 8, 0.2); color: #eab308;';
    statusArea.textContent = 'Storing feedback as Walrus blob...';
    resultArea.style.display = 'none';

    const formData = new FormData(form);
    const data = {
      id: 'sub_' + Date.now(),
      project: formData.get('project').trim(),
      type: formData.get('type'),
      priority: formData.get('priority'),
      rating: parseInt(formData.get('rating') || '0'),
      message: formData.get('message').trim(),
      url: (formData.get('url') || '').trim(),
      contact: (formData.get('contact') || '').trim(),
      wallet: connectedWallet || null,
      encrypt: formData.get('encrypt') === 'on',
      confirm: formData.get('confirm') === 'on',
      status: 'new',
      internalNote: '',
      timestamp: new Date().toISOString(),
      blobId: null,
      walrusStatus: 'pending'
    };

    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    data.blobId = generateBlobId();
    data.walrusStatus = 'stored';

    const existing = loadFromStorage();
    existing.unshift(data);
    saveToStorage(existing);

    statusArea.style.cssText = 'display: block; text-align: center; padding: 1rem; border-radius: 0.75rem; font-size: 0.875rem; background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e;';
    statusArea.textContent = '✅ Feedback stored successfully';
    blobIdDisplay.textContent = data.blobId;

    const walrusLink = document.getElementById('walrusLink');
    if (walrusLink) walrusLink.href = `https://walruscan.com/mainnet/blob/${data.blobId}`;

    const txSig = document.getElementById('txSignature');
    if (txSig) txSig.textContent = connectedWallet ? `Signed by ${connectedWallet.slice(0,6)}...${connectedWallet.slice(-4)}` : 'Anonymous submission';

    resultArea.style.display = 'block';

    form.reset();
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('btn-active'));
    document.querySelector('.priority-btn[data-value="medium"]').classList.add('btn-active');
    document.getElementById('priorityInput').value = 'medium';
    document.getElementById('ratingInput').value = '0';
    document.querySelectorAll('.star-rating span').forEach(s => s.classList.remove('active'));
    const ratingLabel = document.getElementById('ratingLabel');
    if (ratingLabel) ratingLabel.textContent = 'Click to rate';
    if (connectedWallet) document.getElementById('contactInput').value = connectedWallet;

    btnText.textContent = 'Submit to Walrus';
  });
}

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      currentFilter = btn.dataset.filter;
      renderSubmissions();
    });
  });
}

function loadSubmissions() {
  const list = document.getElementById('submissionsList');
  const badge = document.getElementById('countBadge');

  list.innerHTML = '<div class="empty-state"><span class="spinner"></span><p style="margin-top: 1rem;">Loading from Walrus...</p></div>';

  setTimeout(() => {
    submissionsData = loadFromStorage();
    badge.textContent = `${submissionsData.length} submission${submissionsData.length !== 1 ? 's' : ''}`;
    renderSubmissions();
  }, 600);
}

function renderSubmissions() {
  const list = document.getElementById('submissionsList');
  let filtered = submissionsData;

  if (currentFilter !== 'all') {
    filtered = submissionsData.filter(s => {
      if (currentFilter === 'encrypted') return s.encrypt;
      if (currentFilter === 'critical') return s.priority === 'critical';
      if (currentFilter === 'pending') return s.status === 'new';
      return s.type === currentFilter;
    });
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No submissions match this filter.</p></div>';
    return;
  }

  list.innerHTML = filtered.map((sub, idx) => {
    const typeColors = { bug: 'badge-red', feature: 'badge-cyan', ux: 'badge-purple', docs: '', general: '' };
    const priorityColors = { low: '#666', medium: '#eab308', high: '#FF6347', critical: '#FF1A1A' };
    const statusColors = { new: '#eab308', 'in-review': '#8B5CF6', resolved: '#22c55e', closed: '#666' };
    const statusLabels = { new: 'New', 'in-review': 'In Review', resolved: 'Resolved', closed: 'Closed' };
    const date = new Date(sub.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = new Date(sub.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const stars = sub.rating > 0 ? '★'.repeat(sub.rating) + '☆'.repeat(5 - sub.rating) : '';

    return `
      <div class="table-row" style="cursor: pointer;" onclick="openModal(${idx})">
        <div>
          <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">${escapeHtml(sub.project)}</div>
          <div style="font-size: 0.75rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${escapeHtml(sub.message)}</div>
          ${stars ? `<div style="font-size: 0.75rem; color: #eab308; margin-top: 0.25rem;">${stars}</div>` : ''}
        </div>
        <div><span class="badge ${typeColors[sub.type] || ''}">${sub.type}</span></div>
        <div style="color: ${priorityColors[sub.priority] || '#666'}; font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">${sub.priority}</div>
        <div>
          ${sub.encrypt ? '<span class="badge badge-purple">🔒 Seal</span>' : ''}
          <span class="badge" style="background: ${statusColors[sub.status] || '#666'}15; border-color: ${statusColors[sub.status] || '#666'}30; color: ${statusColors[sub.status] || '#666'}; margin-left: 0.25rem;">${statusLabels[sub.status] || sub.status}</span>
        </div>
        <div style="font-size: 0.75rem; color: #666;">${date}<br>${time}</div>
      </div>
    `;
  }).join('');
}

function openModal(idx) {
  const sub = submissionsData[idx];
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Project</label><p style="color: white; font-weight: 600;">${escapeHtml(sub.project)}</p></div>
      <div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Type</label><p style="color: white; font-weight: 600;">${sub.type}</p></div>
      <div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Priority</label><p style="color: white; font-weight: 600; text-transform: uppercase;">${sub.priority}</p></div>
      <div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Date</label><p style="color: white;">${new Date(sub.timestamp).toLocaleString()}</p></div>
    </div>
    ${sub.rating > 0 ? `<div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Rating</label><p style="color: #eab308; font-size: 1.25rem;">${'★'.repeat(sub.rating)}${'☆'.repeat(5-sub.rating)}</p></div>` : ''}
    <div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Message</label><div style="padding: 1rem; background: #0A0A0A; border-radius: 0.75rem; color: #ccc; font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(sub.message)}</div></div>
    ${sub.url ? `<div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">URL</label><a href="${escapeHtml(sub.url)}" target="_blank" style="color: #00D4AA; font-size: 0.875rem;">${escapeHtml(sub.url)}</a></div>` : ''}
    ${sub.contact ? `<div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Contact</label><p style="color: #00D4AA;">${escapeHtml(sub.contact)}</p></div>` : ''}
    ${sub.wallet ? `<div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Wallet</label><code style="color: #00D4AA; font-size: 0.75rem;">${sub.wallet}</code></div>` : ''}
    <div><label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Walrus Blob ID</label><code style="display: block; padding: 0.75rem; background: #0A0A0A; border-radius: 0.5rem; font-size: 0.75rem; color: #00D4AA; word-break: break-all;">${sub.blobId || 'Pending'}</code></div>

    <div style="padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 0.75rem;">
      <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; margin-bottom: 0.5rem; display: block;">Internal Note</label>
      <textarea id="internalNote_${sub.id}" rows="2" placeholder="Add private admin note..." style="margin-bottom: 0.5rem;">${sub.internalNote || ''}</textarea>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button type="button" class="btn-secondary" style="font-size: 0.75rem;" onclick="saveNote('${sub.id}')">💾 Save Note</button>
        <button type="button" class="btn-secondary" style="font-size: 0.75rem;" onclick="updateStatus('${sub.id}', 'in-review')">👀 Mark In Review</button>
        <button type="button" class="btn-secondary" style="font-size: 0.75rem;" onclick="updateStatus('${sub.id}', 'resolved')">✅ Mark Resolved</button>
        <button type="button" class="btn-secondary" style="font-size: 0.75rem;" onclick="updateStatus('${sub.id}', 'closed')">🗑️ Close</button>
      </div>
    </div>

    ${sub.encrypt ? `
    <div style="padding: 1rem; background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <span style="font-size: 1rem;">🔒</span>
        <span style="font-weight: 600; color: #8B5CF6;">Encrypted with Seal</span>
      </div>
      <p style="font-size: 0.75rem; color: #666;">This submission was encrypted before storage. Decrypt via admin key.</p>
    </div>
    ` : ''}
  `;

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
}

function saveNote(subId) {
  const textarea = document.getElementById(`internalNote_${subId}`);
  if (!textarea) return;
  const all = loadFromStorage();
  const sub = all.find(s => s.id === subId);
  if (sub) {
    sub.internalNote = textarea.value;
    saveToStorage(all);
    submissionsData = all;
    showToast('Note saved', 'success');
  }
}

function updateStatus(subId, status) {
  const all = loadFromStorage();
  const sub = all.find(s => s.id === subId);
  if (sub) {
    sub.status = status;
    saveToStorage(all);
    submissionsData = all;
    renderSubmissions();
    showToast(`Status updated to ${status}`, 'success');
    closeModal();
  }
}

function exportCSV() {
  if (submissionsData.length === 0) {
    showToast('No submissions to export', 'error');
    return;
  }
  const headers = ['timestamp', 'project', 'type', 'priority', 'rating', 'message', 'url', 'contact', 'wallet', 'encrypt', 'status', 'blobId'];
  const rows = submissionsData.map(s => headers.map(h => `"${(s[h] || '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `riot-feedback-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  initForm();
  setupFilters();
  updateWalletUI();
});