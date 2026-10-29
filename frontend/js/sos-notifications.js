document.addEventListener('DOMContentLoaded', async () => {
  await loadSOSNotifications();
});

async function loadSOSNotifications() {
  await Promise.all([renderLiveSOSStatus(), renderSOSHistory()]);
}

async function renderLiveSOSStatus() {
  const container = document.getElementById('sos-live-centerpiece');
  if (!container) return;

  try {
    const data = await API.get('/emergency');
    const alerts = data.alerts || [];
    const active = alerts.find(a => a.status === 'triggered');

    if (active) {
      if (typeof playEmergencySiren === 'function') playEmergencySiren();

      container.className = 'health-card p-4 p-md-5 border-danger bg-danger bg-opacity-10 shadow text-start';
      container.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="spinner-grow spinner-grow-sm text-danger" role="status"></span>
          <h2 class="fw-bold text-danger mb-0">🚨 LIVE EMERGENCY SOS SIGNAL ACTIVE!</h2>
        </div>
        <p class="lead text-dark mb-3">
          Your monitored patient has triggered an emergency broadcast requesting immediate medical intervention.
        </p>

        <div class="p-3 bg-white rounded-3 border border-danger mb-3 shadow-sm">
          <div class="row g-2">
            <div class="col-md-6">
              <div class="small text-muted">Incident Location:</div>
              <strong class="fs-6 text-dark">${active.location?.address || 'Current Patient Coordinates'}</strong>
            </div>
            <div class="col-md-6">
              <div class="small text-muted">Distress Notes:</div>
              <strong class="fs-6 text-danger">${active.notes || 'Immediate assistance required'}</strong>
            </div>
            <div class="col-12 mt-2 pt-2 border-top small text-muted">
              Triggered at: ${new Date(active.alertTime).toLocaleString()}
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-success rounded-pill px-4" onclick="resolveSOS('${active._id}')">
            <i class="fa-solid fa-circle-check me-1"></i> Mark Emergency Resolved & Safe
          </button>
          <a href="https://maps.google.com/?q=${active.location?.latitude || '12.9716'},${active.location?.longitude || '77.5946'}" target="_blank" class="btn btn-outline-danger rounded-pill px-3">
            <i class="fa-solid fa-map-location-dot me-1"></i> View GPS Map
          </a>
          <a href="tel:911" class="btn btn-danger rounded-pill px-3">
            <i class="fa-solid fa-phone me-1"></i> Call 911 / 112
          </a>
        </div>
      `;
    } else {
      container.className = 'health-card p-4 p-md-5 border-success border-opacity-25 shadow-sm text-center';
      container.innerHTML = `
        <div class="text-success mb-3">
          <i class="fa-solid fa-shield-heart" style="font-size: 3.5rem;"></i>
        </div>
        <h3 class="fw-bold text-dark mb-2">Emergency Status: All Clear</h3>
        <p class="text-muted small mb-3">
          Your live caregiver receiver is active and listening. No active distress signals detected from your assigned patient.
        </p>
        <span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3 py-2">
          <i class="fa-solid fa-wifi me-1"></i> Telemetry Receiver Connected
        </span>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error retrieving SOS status: ${err.message}</div>`;
  }
}

async function renderSOSHistory() {
  const container = document.getElementById('sos-history-list');
  const countEl = document.getElementById('sos-incident-count');
  if (!container) return;

  try {
    const data = await API.get('/emergency');
    const alerts = data.alerts || [];

    if (countEl) countEl.innerText = `${alerts.length} Incident${alerts.length === 1 ? '' : 's'}`;

    if (alerts.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-muted small">No past emergency SOS alerts on record.</div>`;
      return;
    }

    container.innerHTML = alerts.map(a => {
      const isResolved = a.status === 'resolved';
      const aDate = new Date(a.alertTime).toLocaleString();

      return `
        <div class="p-3 mb-2 border rounded-3 ${isResolved ? 'bg-light' : 'bg-danger bg-opacity-10 border-danger'}">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <span class="badge ${isResolved ? 'bg-success' : 'bg-danger'} rounded-pill mb-1">
                ${a.status.toUpperCase()}
              </span>
              <div class="fw-bold text-dark">${a.notes || 'Emergency Alert Triggered'}</div>
              <div class="small text-muted"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${a.location?.address || 'Current Location'}</div>
              <div class="smaller text-muted mt-1"><i class="fa-regular fa-clock me-1"></i>${aDate}</div>
            </div>
            ${!isResolved ? `
              <button class="btn btn-sm btn-outline-success rounded-pill" onclick="resolveSOS('${a._id}')">
                Mark Resolved
              </button>
            ` : `<span class="badge bg-secondary rounded-pill small">Resolved</span>`}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="p-3 text-danger">Failed to load history: ${err.message}</div>`;
  }
}

async function resolveSOS(alertId) {
  try {
    const res = await API.patch(`/emergency/${alertId}/resolve`);
    showToast(res.message, 'success');
    await loadSOSNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
