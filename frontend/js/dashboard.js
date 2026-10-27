let adherenceChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  if (user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) greetingEl.innerText = user.name || 'Patient';
  }

  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.innerText = new Date().toLocaleDateString(undefined, options);
  }

  await loadDashboardData();

  const quickSosBtn = document.getElementById('dashboard-sos-btn');
  if (quickSosBtn) quickSosBtn.addEventListener('click', triggerQuickEmergencySOS);
});

async function loadDashboardData() {
  try {
    const data = await API.get('/patients/dashboard-stats');
    if (!data || !data.stats) return;
    const stats = data.stats;

    document.getElementById('metric-today-count').innerText = stats.todayMedicinesCount || 0;
    document.getElementById('metric-upcoming-count').innerText = stats.upcomingRemindersCount || 0;
    document.getElementById('metric-prescriptions-count').innerText = stats.prescriptionCount || 0;
    document.getElementById('metric-missed-count').innerText = stats.missedMedicineCount || 0;

    const adherenceBadge = document.getElementById('metric-adherence-rate');
    if (adherenceBadge) adherenceBadge.innerText = `${stats.adherenceRate}% Adherence`;

    renderTodaySchedule(stats.todayMedicines || []);
    renderUpcomingReminders(stats.upcomingReminders || []);
    renderAdherenceChart(stats.weeklyAdherence);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderTodaySchedule(medicines) {
  const container = document.getElementById('today-schedule-list');
  if (!container) return;

  if (medicines.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fa-solid fa-calendar-check fs-1 mb-2 text-secondary opacity-50"></i>
        <p class="mb-2">No medications scheduled for today!</p>
        <a href="medicines.html" class="btn btn-outline-primary btn-sm rounded-pill">
          <i class="fa-solid fa-plus me-1"></i> Add Medication
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = medicines.map(item => {
    const med = item.medicineId || {};
    const timeStr = new Date(item.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isTaken = item.status === 'taken';
    const isMissed = item.status === 'missed';

    return `
      <div class="medicine-card-item">
        <div class="d-flex align-items-center gap-3">
          <div class="rounded-circle p-3 d-flex align-items-center justify-content-center ${isTaken ? 'bg-success bg-opacity-10 text-success' : isMissed ? 'bg-danger bg-opacity-10 text-danger' : 'bg-primary bg-opacity-10 text-primary'}" style="width: 48px; height: 48px;">
            <i class="fa-solid ${isTaken ? 'fa-check' : isMissed ? 'fa-xmark' : 'fa-pills'} fs-5"></i>
          </div>
          <div>
            <div class="fw-bold fs-6">${med.medicineName || 'Prescription Medicine'}</div>
            <div class="text-muted small">
              <span class="badge bg-light text-dark border me-1">${med.dosage || 'Dose'}</span>
              <span><i class="fa-regular fa-clock me-1 text-primary"></i>${timeStr}</span>
            </div>
            ${med.instructions ? `<div class="small text-secondary mt-1">${med.instructions}</div>` : ''}
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <span class="badge-status ${item.status}">${item.status}</span>
          ${item.status === 'pending' || item.status === 'snoozed' ? `
            <button class="btn btn-sm btn-success rounded-pill px-3" onclick="markTaken('${item._id}')" title="Mark Taken">
              <i class="fa-solid fa-check me-1"></i> Taken
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="markMissed('${item._id}')" title="Mark Missed">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderUpcomingReminders(reminders) {
  const container = document.getElementById('upcoming-reminders-list');
  if (!container) return;

  if (reminders.length === 0) {
    container.innerHTML = `<div class="text-center py-4 text-muted small">No upcoming reminders in queue.</div>`;
    return;
  }

  container.innerHTML = reminders.map(r => {
    const med = r.medicineId || {};
    const dateStr = new Date(r.reminderTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = new Date(r.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="d-flex align-items-center justify-content-between p-2 mb-2 border-bottom">
        <div>
          <div class="fw-semibold small">${med.medicineName || 'Medicine'}</div>
          <div class="text-muted smaller"><i class="fa-regular fa-calendar me-1"></i>${dateStr} at ${timeStr}</div>
        </div>
        <span class="badge bg-primary bg-opacity-10 text-primary small rounded-pill px-2 py-1">${med.dosage || '1 dose'}</span>
      </div>
    `;
  }).join('');
}

function renderAdherenceChart(adherenceData) {
  const canvas = document.getElementById('adherenceChart');
  if (!canvas) return;
  if (adherenceChart) adherenceChart.destroy();

  const ctx = canvas.getContext('2d');
  const labels = adherenceData?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const takenData = adherenceData?.taken || [3, 4, 3, 4, 4, 3, 4];
  const missedData = adherenceData?.missed || [0, 1, 0, 0, 0, 1, 0];

  adherenceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Taken', data: takenData, backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Missed', data: missedData, backgroundColor: '#ef4444', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

async function markTaken(reminderId) {
  try {
    playReminderChime();
    const res = await API.patch(`/reminders/${reminderId}/taken`);
    showToast(res.message, 'success');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markMissed(reminderId) {
  if (!confirm('Mark dose as missed? This notifies registered caregivers.')) return;
  try {
    const res = await API.patch(`/reminders/${reminderId}/missed`);
    showToast(res.message, 'warning');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerQuickEmergencySOS() {
  if (!confirm('Are you sure you want to trigger EMERGENCY SOS now?')) return;
  playEmergencySiren();

  try {
    const res = await API.post('/emergency/sos', { address: 'Registered Residence' });
    showToast(res.message, 'error', '🚨 SOS TRIGGERED');
    setTimeout(() => { window.location.href = 'emergency.html'; }, 1000);
  } catch (err) {
    showToast('Failed to trigger SOS: ' + err.message, 'error');
  }
}
