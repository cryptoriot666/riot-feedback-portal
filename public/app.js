// RIOT Feedback Portal — Frontend Logic

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
let submissionsData = [];
let currentFilter = 'all';

// ========== Form Page ==========
function initForm() {
  const form = document.getElementById('feedbackForm');
  if (!form) return;

  // Priority buttons
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      document.getElementById('priorityInput').value = btn.dataset.value;
    });
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = document.getElementById('btnText');
    const statusArea = document.getElementById('statusArea');
    const resultArea = document.getElementById('resultArea');
    const blobIdDisplay = document.getElementById('blobIdDisplay');

    btnText.innerHTML = '<span class="spinner"></span> Uploading to Walrus...';
    statusArea.style.display = 'block';
    statusArea.className = '';
    statusArea.style.cssText = 'display: block; text-align: center; padding: 1rem; border-radius: 0.75rem; font-size: 0.875rem; background: rgba(234, 179, 8, 0.05); border: 1px solid rgba(234, 179, 8, 0.2); color: #eab308;';
    statusArea.textContent = 'Storing feedback as Walrus blob...';
    resultArea.style.display = 'none';

    const formData = new FormData(form);
    const data = {
      project: formData.get('project'),
      type: formData.get('type'),
      priority: formData.get('priority'),
      message: formData.get('message'),
      contact: formData.get('contact') || '',
      encrypt: formData.get('encrypt') === 'on',
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (result.success) {
        statusArea.style.cssText = 'display: block; text-align: center; padding: 1rem; border-radius: 0.75rem; font-size: 0.875rem; background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e;';
        statusArea.textContent = '✅ Feedback stored successfully';
        blobIdDisplay.textContent = result.blobId;
        resultArea.style.display = 'block';
        form.reset();
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('btn-active'));
        document.querySelector('.priority-btn[data-value="medium"]').classList.add('btn-active');
        document.getElementById('priorityInput').value = 'medium';
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      statusArea.style.cssText = 'display: block; text-align: center; padding: 1rem; border-radius: 0.75rem; font-size: 0.875rem; background: rgba(255, 26, 26, 0.05); border: 1px solid rgba(255, 26, 26, 0.2); color: #FF1A1A;';
      statusArea.textContent = '❌ Error: ' + err.message;
      console.error(err);
    } finally {
      btnText.textContent = 'Submit to Walrus';
    }
  });
}

// ========== Admin Page ==========
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

async function loadSubmissions() {
  const list = document.getElementById('submissionsList');
  const badge = document.getElementById('countBadge');

  list.innerHTML = '<div class="empty-state"><span class="spinner"></span><p style="margin-top: 1rem;">Loading from Walrus...</p></div>';

  try {
    const res = await fetch(`${API_URL}/submissions`);
    submissionsData = await res.json();
    badge.textContent = `${submissionsData.length} submission${submissionsData.length !== 1 ? 's' : ''}`;
    renderSubmissions();
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><p style="color: #FF1A1A;">Error loading submissions</p><p style="font-size: 0.75rem;">${err.message}</p></div>`;
  }
}

function renderSubmissions() {
  const list = document.getElementById('submissionsList');
  let filtered = submissionsData;

  if (currentFilter !== 'all') {
    filtered = submissionsData.filter(s => {
      if (currentFilter === 'encrypted') return s.encrypt;
      if (currentFilter === 'critical') return s.priority === 'critical';
      return s.type === currentFilter;
    });
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No submissions match this filter.</p></div>';
    return;
  }

  list.innerHTML = filtered.map((sub, idx) => {
    const typeColors = {
      bug: 'badge-red',
      feature: 'badge-cyan',
      ux: 'badge-purple',
      docs: '',
      general: ''
    };
    const priorityColors = {
      low: '#666',
      medium: '#eab308',
      high: '#FF6347',
      critical: '#FF1A1A'
    };
    const date = new Date(sub.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = new Date(sub.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="table-row" style="cursor: pointer;" onclick="openModal(${idx})">
        <div>
          <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">${escapeHtml(sub.project)}</div>
          <div style="font-size: 0.75rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${escapeHtml(sub.message)}</div>
        </div>
        <div><span class="badge ${typeColors[sub.type] || ''}">${sub.type}</span></div>
        <div style="color: ${priorityColors[sub.priority] || '#666'}; font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">${sub.priority}</div>
        <div>${sub.encrypt ? '<span class="badge badge-purple">🔒 Seal</span>' : '<span style="font-size: 0.75rem; color: #666;">Public</span>'}</div>
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
      <div>
        <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Project</label>
        <p style="color: white; font-weight: 600;">${escapeHtml(sub.project)}</p>
      </div>
      <div>
        <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Type</label>
        <p style="color: white; font-weight: 600;">${sub.type}</p>
      </div>
      <div>
        <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Priority</label>
        <p style="color: white; font-weight: 600; text-transform: uppercase;">${sub.priority}</p>
      </div>
      <div>
        <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Date</label>
        <p style="color: white;">${new Date(sub.timestamp).toLocaleString()}</p>
      </div>
    </div>
    <div>
      <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Message</label>
      <div style="padding: 1rem; background: #0A0A0A; border-radius: 0.75rem; color: #ccc; font-size: 0.875rem; line-height: 1.6;">${escapeHtml(sub.message).replace(/\n/g, '<br>')}</div>
    </div>
    ${sub.contact ? `
    <div>
      <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Contact</label>
      <p style="color: #00D4AA;">${escapeHtml(sub.contact)}</p>
    </div>
    ` : ''}
    <div>
      <label style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Walrus Blob ID</label>
      <code style="display: block; padding: 0.75rem; background: #0A0A0A; border-radius: 0.5rem; font-size: 0.75rem; color: #00D4AA; font-family: monospace; word-break: break-all;">${sub.blobId || 'Pending'}</code>
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

function exportCSV() {
  if (submissionsData.length === 0) {
    showToast('No submissions to export', 'error');
    return;
  }

  const headers = ['timestamp', 'project', 'type', 'priority', 'message', 'contact', 'encrypt', 'blobId'];
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

// Init
document.addEventListener('DOMContentLoaded', () => {
  initForm();
});
