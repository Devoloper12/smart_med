document.addEventListener('DOMContentLoaded', async () => {
  await loadEmergencyData();
  document.getElementById('giant-sos-btn')?.addEventListener('click', handleEmergencySOSTrigger);
  document.getElementById('detect-location-btn')?.addEventListener('click', autoDetectLocation);
});

async function loadEmergencyData() {
  await Promise.all([loadCaregiverContacts(), loadEmergencyAlertHistory()]);
}

async function loadCaregiverContacts() {
  const container = document.getElementById('emergency-caregivers-list');
  if (!container) return;

  try {
    const data = await API.get('/caregivers');
    const caregivers = data.caregivers || [];
    if (caregivers.length === 0) {
      container.innerHTML = `<div class="p-3 text-center text-muted">No caregivers registered.</div>`;
      return;
    }

    container.innerHTML = caregivers.map(cg => `
      <div class="d-flex align-items-center justify-content-between p-3 border-bottom">
        <div>
          <div class="fw-bold">${cg.name} <span class="badge bg-light text-dark border small">${cg.relationship}</span></div>
          <div class="small text-muted">${cg.phone}</div>
        </div>
        <a href="tel:${cg.phone}" class="btn btn-success btn-sm rounded-pill px-3">Call</a>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="p-3 text-danger">Failed to load contacts.</div>`;
  }
}

async function loadEmergencyAlertHistory() {
  const container = document.getElementById('sos-history-list');
  if (!container) return;

  try {
    const data = await API.get('/emergency');
    const alerts = data.alerts || [];

    if (alerts.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-muted">No past emergency SOS alerts.</div>`;
      return;
    }

    container.innerHTML = alerts.map(a => {
      const aDate = new Date(a.alertTime).toLocaleString();
      const isResolved = a.status === 'resolved';

      return `
        <div class="p-3 mb-2 border rounded-3 ${isResolved ? 'bg-light' : 'bg-danger bg-opacity-10 border-danger'}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="badge ${isResolved ? 'bg-success' : 'bg-danger'} rounded-pill mb-1">${a.status.toUpperCase()}</span>
              <div class="fw-bold">${a.notes || 'Emergency Alert Triggered'}</div>
              <div class="small text-muted">${aDate}</div>
            </div>
            ${!isResolved ? `
              <button class="btn btn-sm btn-outline-success rounded-pill" onclick="resolveEmergencyAlert('${a._id}')">Mark Resolved</button>
            ` : `<span class="badge bg-secondary rounded-pill small">Resolved</span>`}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="p-3 text-danger">Failed to load alerts.</div>`;
  }
}

async function handleEmergencySOSTrigger() {
  const addressInput = document.getElementById('emergency-address')?.value || 'Patient Residence';
  const notesInput = document.getElementById('emergency-notes')?.value || 'Emergency SOS triggered by patient';

  playEmergencySiren();

  try {
    const payload = { address: addressInput, notes: notesInput };
    const res = await API.post('/emergency/sos', payload);
    showToast(res.message, 'error', '🚨 SOS TRIGGERED');
    await loadEmergencyAlertHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function autoDetectLocation() {
  const addressInput = document.getElementById('emergency-address');
  if (!navigator.geolocation) return showToast('Geolocation unsupported.', 'warning');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (addressInput) addressInput.value = `GPS Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`;
      showToast('Coordinates captured.', 'success');
    },
    (err) => showToast('Could not detect location.', 'warning')
  );
}

async function resolveEmergencyAlert(alertId) {
  try {
    const res = await API.patch(`/emergency/${alertId}/resolve`);
    showToast(res.message, 'success');
    await loadEmergencyAlertHistory();
  } catch (err) { showToast(err.message, 'error'); }
}
