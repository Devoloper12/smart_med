let adherenceChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  const isCg = window.isCaregiver ? window.isCaregiver() : (user && user.role === 'caregiver');

  if (user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
      greetingEl.innerText = user.name || 'Patient';
      if (isCg) {
        greetingEl.innerHTML = `${user.name || 'Caregiver'} <span class="badge bg-info text-dark ms-2 align-middle fs-6">Caregiver Mode</span>`;
      }
    }
  }

  // RBAC for Header Action Buttons on Dashboard
  const addMedBtn = document.getElementById('dashboard-add-med-btn');
  const quickSosBtn = document.getElementById('dashboard-sos-btn');
  const headerActionsContainer = document.getElementById('dashboard-header-actions');

  if (isCg) {
    if (headerActionsContainer) {
      headerActionsContainer.innerHTML = `
        <a href="sos-notifications.html" class="btn btn-outline-danger btn-sm rounded-pill px-3 d-flex align-items-center gap-1">
          <i class="fa-solid fa-truck-medical text-danger"></i> SOS Notifications
        </a>
        <a href="patient-tracking.html" class="btn btn-primary-health btn-sm rounded-pill px-3 d-flex align-items-center gap-1">
          <i class="fa-solid fa-chart-line"></i> Patient Tracking
        </a>
      `;
    }
  } else {
    if (quickSosBtn) quickSosBtn.addEventListener('click', triggerQuickEmergencySOS);
  }

  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.innerText = new Date().toLocaleDateString(undefined, options);
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    const data = await API.get('/patients/dashboard-stats');
    if (!data || !data.stats) return;
    const stats = data.stats;
    const isCg = data.isCaregiver || (window.isCaregiver && window.isCaregiver());

    // Caregiver Monitoring Banner
    if (isCg) {
      let cgBanner = document.getElementById('caregiver-monitoring-banner');
      if (!cgBanner) {
        cgBanner = document.createElement('div');
        cgBanner.id = 'caregiver-monitoring-banner';
        cgBanner.className = 'alert alert-info border-info d-flex flex-wrap justify-content-between align-items-center mb-4 p-3 rounded-3 shadow-sm';
        document.querySelector('main.container')?.prepend(cgBanner);
      }
      const pat = data.monitoredPatient;
      cgBanner.innerHTML = `
        <div class="d-flex align-items-center gap-3">
          <div class="bg-info bg-opacity-25 rounded-circle p-2 d-flex align-items-center justify-content-center text-info" style="width: 44px; height: 44px;">
            <i class="fa-solid fa-user-shield fs-5"></i>
          </div>
          <div>
            <div class="fw-bold fs-6">Caregiver Monitoring Mode &bull; Read-Only Account</div>
            <div class="small text-muted">
              Monitoring Patient: <strong>${pat?.name || 'Linked Patient'}</strong>
              ${pat?.email ? `&bull; ${pat.email}` : ''}
              &bull; Blood: <strong>${pat?.bloodGroup || 'O+'}</strong>
              &bull; Age: <strong>${pat?.age || 30}</strong>
            </div>
          </div>
        </div>
        <span class="badge bg-info text-dark rounded-pill px-3 py-2 mt-2 mt-sm-0">
          <i class="fa-solid fa-circle-check me-1 text-success"></i> Monitoring Active
        </span>
      `;
    }

    document.getElementById('metric-today-count').innerText = stats.todayMedicinesCount || 0;
    document.getElementById('metric-upcoming-count').innerText = stats.upcomingRemindersCount || 0;
    document.getElementById('metric-prescriptions-count').innerText = stats.prescriptionCount || 0;
    document.getElementById('metric-missed-count').innerText = stats.missedMedicineCount || 0;

    const adherenceBadge = document.getElementById('metric-adherence-rate');
    if (adherenceBadge) adherenceBadge.innerText = `${stats.adherenceRate}% Adherence`;

    renderTodaySchedule(stats.todayMedicines || []);
    renderUpcomingReminders(stats.upcomingReminders || []);
    renderAdherenceChart(stats.weeklyAdherence);

    // Check for active Emergency SOS alerts (vital for caregivers and patients)
    try {
      const emData = await API.get('/emergency');
      const activeAlert = (emData.alerts || []).find(a => a.status === 'triggered');
      let bannerContainer = document.getElementById('active-sos-banner');
      if (activeAlert) {
        if (!bannerContainer) {
          bannerContainer = document.createElement('div');
          bannerContainer.id = 'active-sos-banner';
          bannerContainer.className = 'alert alert-danger shadow border-danger d-flex flex-wrap justify-content-between align-items-center mb-4 p-3 rounded-3';
          document.querySelector('main.container')?.prepend(bannerContainer);
        }
        bannerContainer.innerHTML = `
          <div>
            <i class="fa-solid fa-triangle-exclamation fs-4 me-2 text-danger"></i>
            <strong>ACTIVE EMERGENCY SOS ALERT FROM PATIENT!</strong>
            <div class="small mt-1 text-danger-emphasis">${activeAlert.notes || 'Emergency assistance requested'} &bull; Location: ${activeAlert.location?.address || 'Current Location'}</div>
          </div>
          <div class="d-flex gap-2 mt-2 mt-sm-0">
            <a href="sos-notifications.html" class="btn btn-sm btn-danger rounded-pill px-3">Open SOS Responder</a>
          </div>
        `;
      } else if (bannerContainer) {
        bannerContainer.remove();
      }
    } catch (e) {}

    // If caregiver, inject Patient Health Summary spotlight card
    if (isCg && data.monitoredPatient) {
      const pat = data.monitoredPatient;
      let spotlight = document.getElementById('caregiver-patient-spotlight');
      if (!spotlight) {
        spotlight = document.createElement('div');
        spotlight.id = 'caregiver-patient-spotlight';
        spotlight.className = 'health-card p-4 mb-4 border-primary shadow-sm';
        const kpiRow = document.querySelector('.row.g-3.mb-4');
        if (kpiRow && kpiRow.nextElementSibling) {
          kpiRow.parentNode.insertBefore(spotlight, kpiRow.nextElementSibling);
        }
      }

      const conditions = (pat.medicalConditions || []).length > 0
        ? pat.medicalConditions.map(c => `<span class="badge bg-light text-dark border me-1">${c}</span>`).join('')
        : '<span class="text-muted small">None recorded</span>';

      spotlight.innerHTML = `
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div class="d-flex align-items-start gap-3">
            <div class="rounded-circle bg-primary bg-opacity-10 text-primary p-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 58px; height: 58px;">
              <i class="fa-solid fa-hospital-user fs-3"></i>
            </div>
            <div>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <h4 class="fw-bold mb-0 text-dark">${pat.name || 'Assigned Patient'}</h4>
                <span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3 py-1">
                  <i class="fa-solid fa-circle-check me-1"></i> Patient Monitored
                </span>
                <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-1">
                  ${stats.adherenceRate}% Adherence
                </span>
              </div>
              <div class="text-muted small mt-1">
                <span class="me-3"><i class="fa-regular fa-envelope me-1 text-primary"></i>${pat.email || 'N/A'}</span>
                <span class="me-3"><i class="fa-solid fa-droplet me-1 text-danger"></i>Blood: <strong>${pat.bloodGroup || 'O+'}</strong></span>
                <span class="me-3"><i class="fa-regular fa-calendar me-1 text-primary"></i>Age: <strong>${pat.age || 30}</strong></span>
                <span><i class="fa-solid fa-location-dot me-1 text-success"></i>Bangalore, India</span>
              </div>
              <div class="mt-2 small">
                <strong class="text-secondary">Diagnosed Conditions:</strong> ${conditions}
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 align-items-center">
            <a href="patient-tracking.html" class="btn btn-sm btn-primary-health rounded-pill px-3">
              <i class="fa-solid fa-chart-line me-1"></i> Patient Tracking
            </a>
            <a href="health-status.html" class="btn btn-sm btn-outline-primary rounded-pill px-3">
              <i class="fa-solid fa-heart-pulse me-1"></i> Health Status
            </a>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderTodaySchedule(medicines) {
  const container = document.getElementById('today-schedule-list');
  if (!container) return;
  const isCg = window.isCaregiver && window.isCaregiver();

  if (medicines.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fa-solid fa-calendar-check fs-1 mb-2 text-secondary opacity-50"></i>
        <p class="mb-2">No medications scheduled for today!</p>
        ${!isCg ? `
          <a href="medicines.html" class="btn btn-outline-primary btn-sm rounded-pill">
            <i class="fa-solid fa-plus me-1"></i> Add Medication
          </a>
        ` : `<div class="small text-secondary">Patient has no doses pending today.</div>`}
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
          <div class="rounded-circle p-2 d-flex align-items-center justify-content-center flex-shrink-0 ${isTaken ? 'bg-success bg-opacity-10 text-success' : isMissed ? 'bg-danger bg-opacity-10 text-danger' : 'bg-primary bg-opacity-10 text-primary'}" style="width: 44px; height: 44px;">
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

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="badge-status ${item.status}">${item.status}</span>
          ${!isCg && (item.status === 'pending' || item.status === 'snoozed') ? `
            <button class="btn btn-sm btn-success rounded-pill px-3" onclick="markTaken('${item._id}')" title="Mark Taken">
              <i class="fa-solid fa-check me-1"></i> Taken
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="markMissed('${item._id}')" title="Mark Missed">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : isCg ? `
            <span class="badge bg-secondary bg-opacity-10 text-secondary small py-1 px-2">
              <i class="fa-solid fa-eye me-1"></i>Caregiver View
            </span>
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
  if (window.isCaregiver && window.isCaregiver()) {
    showToast('Caregivers have read-only access and cannot alter patient medications.', 'warning');
    return;
  }
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
  if (window.isCaregiver && window.isCaregiver()) {
    showToast('Caregivers have read-only access and cannot alter patient medications.', 'warning');
    return;
  }
  if (!confirm('Mark dose as missed? This notifies registered caregivers.')) return;
  try {
    const res = await API.patch(`/reminders/${reminderId}/missed`);
    showToast(res.message, 'warning');
    await loadDashboardData();
    if (res.caregivers && res.caregivers.length > 0) {
      const primary = res.caregivers.find(c => c.isPrimary) || res.caregivers[0];
      if (primary && primary.whatsappUrl) {
        if (confirm(`Dose marked missed! Open WhatsApp to send alert message to caregiver ${primary.name}?`)) {
          window.open(primary.whatsappUrl, '_blank');
        }
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerQuickEmergencySOS() {
  if (window.isCaregiver && window.isCaregiver()) {
    showToast('Caregivers cannot trigger SOS. Only patients can trigger emergency SOS.', 'warning');
    return;
  }
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
