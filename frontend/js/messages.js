document.addEventListener('DOMContentLoaded', async () => {
  setupQuickTemplates();
  setupDirectButtons();
  await loadMessages();

  document.getElementById('caregiver-message-form')?.addEventListener('submit', handleSendMessage);
});

function setupQuickTemplates() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const template = btn.getAttribute('data-template');
      const textarea = document.getElementById('msg-content');
      if (textarea && template) {
        textarea.value = template;
        textarea.focus();
      }
    });
  });
}

function setupDirectButtons() {
  const waBtn = document.getElementById('direct-wa-btn');
  const smsBtn = document.getElementById('direct-sms-btn');

  waBtn?.addEventListener('click', () => {
    const text = document.getElementById('msg-content')?.value.trim();
    const phone = document.getElementById('msg-recipient-phone')?.value.trim() || '';
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (!text) return showToast('Please enter a message text first.', 'warning');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });

  smsBtn?.addEventListener('click', () => {
    const text = document.getElementById('msg-content')?.value.trim();
    const phone = document.getElementById('msg-recipient-phone')?.value.trim() || '';
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    if (!text) return showToast('Please enter a message text first.', 'warning');
    const url = cleanPhone ? `sms:${cleanPhone}?body=${encodeURIComponent(text)}` : `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = url;
  });
}

async function loadMessages() {
  const container = document.getElementById('messages-stream-list');
  const countBadge = document.getElementById('message-count-badge');
  if (!container) return;

  try {
    const data = await API.get('/patients/messages');
    const messages = data.messages || [];

    if (countBadge) countBadge.innerText = `${messages.length} Message${messages.length === 1 ? '' : 's'}`;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fa-solid fa-comments fs-2 text-secondary opacity-50 mb-2"></i>
          <p class="mb-0 small">No messages sent yet. Use the form to reach out to the patient.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(m => {
      const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';

      return `
        <div class="p-3 mb-2 rounded-3 border bg-white shadow-sm">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <div>
              <strong class="small text-primary">${m.senderName || 'Caregiver'}</strong>
              <span class="smaller text-muted">&rarr; ${m.recipientName || 'Patient'}</span>
            </div>
            <span class="smaller text-muted">${timeStr}</span>
          </div>
          <p class="small mb-0 text-dark">${m.message}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-danger small">Failed to load messages: ${err.message}</div>`;
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  const phone = document.getElementById('msg-recipient-phone').value.trim();
  const message = document.getElementById('msg-content').value.trim();
  const btn = document.getElementById('send-msg-btn');

  if (!message) return showToast('Please enter a message.', 'error');

  try {
    btn.disabled = true;
    const res = await API.post('/patients/messages', { message, recipientPhone: phone });
    showToast(res.message, 'success');

    if (res.dispatch && res.dispatch.whatsappUrl) {
      if (confirm('Message saved to clinical log!\n\nOpen WhatsApp to deliver this check-in to patient phone now?')) {
        window.open(res.dispatch.whatsappUrl, '_blank');
      }
    }

    document.getElementById('msg-content').value = '';
    await loadMessages();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}
