let currentFilter = 'today';
let patientMedicinesList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadMedicinesDropdown();
  await loadReminders();

  document.querySelectorAll('[data-reminder-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('[data-reminder-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-reminder-filter');
      loadReminders();
    });
  });

  document.getElementById('reminder-form')?.addEventListener('submit', handleCreateReminder);
  document.getElementById('test-chime-btn')?.addEventListener('click', () => {
    playReminderChime();
    showToast('Chime alert played.', 'info');
  });
});

async function loadMedicinesDropdown() {
  try {
    const data = await API.get('/medicines');
    patientMedicinesList = data.medicines || [];
    const select = document.getElementById('reminder-medicine-select');
    if (!select) return;

    if (patientMedicinesList.length === 0) {
      select.innerHTML = '<option value="">No medicines found. Add one first.</option>';
      return;
    }

    select.innerHTML = patientMedicinesList.map(m => `
      <option value="${m._id}">${m.medicineName} (${m.dosage})</option>
    `).join('');
  } catch (e) {}
}

async function loadReminders() {
  const container = document.getElementById('reminders-container');
  if (!container) return;

  try {
    const data = await API.get(`/reminders?filter=${currentFilter}`);
    renderReminders(data.reminders || []);
  } catch (err) {
    container.innerHTML = `<div class="text-center py-4 text-danger">Failed to load reminders: ${err.message}</div>`;
  }
}

function renderReminders(reminders) {
  const container = document.getElementById('reminders-container');
  const countEl = document.getElementById('reminders-count-badge');
  if (countEl) countEl.innerText = `${reminders.length} Record${reminders.length === 1 ? '' : 's'}`;
  if (!container) return;

  if (reminders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 bg-white rounded-3 border">
        <i class="fa-regular fa-bell-slash fs-1 text-muted mb-3 opacity-50"></i>
        <h5>No reminders found</h5>
        <p class="text-muted">No scheduled reminders in this category.</p>
        <button class="btn btn-primary-health btn-sm rounded-pill" data-bs-toggle="modal" data-bs-target="#reminderModal">
          <i class="fa-solid fa-plus me-1"></i> Add Custom Reminder
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = reminders.map(r => {
    const med = r.medicineId || {};
    const rDate = new Date(r.reminderTime);
    const dateFormatted = rDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const timeFormatted = rDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isPending = r.status === 'pending' || r.status === 'snoozed';

    return `
      <div class="health-card p-3 mb-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="rounded-3 p-2 bg-primary bg-opacity-10 text-primary flex-shrink-0 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px;">
            <i class="fa-solid fa-bell fs-5"></i>
          </div>
          <div>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span class="fw-bold fs-6">${med.medicineName || 'Medicine'}</span>
              <span class="badge bg-light text-dark border small">${med.dosage || 'Dose'}</span>
              <span class="badge-status ${r.status}">${r.status}</span>
            </div>
            <div class="small text-muted mt-1">
              <span><i class="fa-regular fa-calendar me-1 text-primary"></i>${dateFormatted}</span>
              <span class="ms-3"><i class="fa-regular fa-clock me-1 text-primary"></i>${timeFormatted}</span>
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          ${isPending ? `
            <button class="btn btn-sm btn-success rounded-pill px-3" onclick="handleMarkTaken('${r._id}')">
              <i class="fa-solid fa-check me-1"></i> Taken
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="handleMarkMissed('${r._id}')" title="Mark Missed">
              <i class="fa-solid fa-xmark me-1"></i> Missed
            </button>
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-2" onclick="handleSnooze('${r._id}')" title="Snooze 15m">
              <i class="fa-solid fa-clock-rotate-left"></i> 15m
            </button>
          ` : `<span class="small text-muted fst-italic">Logged</span>`}
        </div>
      </div>
    `;
  }).join('');
}

async function handleCreateReminder(e) {
  e.preventDefault();
  const medicineId = document.getElementById('reminder-medicine-select').value;
  const reminderTime = document.getElementById('reminder-datetime').value;
  const notes = document.getElementById('reminder-notes').value.trim();

  if (!medicineId || !reminderTime) return showToast('Select medicine and time.', 'error');

  try {
    await API.post('/reminders', { medicineId, reminderTime, notes });
    showToast('Reminder scheduled!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
    await loadReminders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleMarkTaken(id) {
  try {
    playReminderChime();
    const res = await API.patch(`/reminders/${id}/taken`);
    showToast(res.message, 'success');
    await loadReminders();
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleMarkMissed(id) {
  if (!confirm('Mark dose as missed? This notifies registered caregivers.')) return;
  try {
    const res = await API.patch(`/reminders/${id}/missed`);
    showToast(res.message, 'warning');
    await loadReminders();
    if (res.caregivers && res.caregivers.length > 0) {
      const primary = res.caregivers.find(c => c.isPrimary) || res.caregivers[0];
      if (primary && primary.whatsappUrl) {
        if (confirm(`Alert generated! Open WhatsApp to send missed dose alert to caregiver ${primary.name}?`)) {
          window.open(primary.whatsappUrl, '_blank');
        }
      }
    }
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleSnooze(id) {
  try {
    const res = await API.patch(`/reminders/${id}/snooze`, { minutes: 15 });
    showToast(res.message, 'info');
    await loadReminders();
  } catch (err) { showToast(err.message, 'error'); }
}
