document.addEventListener('DOMContentLoaded', async () => {
  await loadAlertsFeed();
  document.getElementById('clear-alerts-btn')?.addEventListener('click', () => {
    showToast('All alerts acknowledged.', 'success');
  });
});

async function loadAlertsFeed() {
  const container = document.getElementById('alerts-feed-container');
  if (!container) return;

  try {
    const [emergencyData, remindersData, statsData] = await Promise.all([
      API.get('/emergency'),
      API.get('/reminders?filter=history'),
      API.get('/patients/dashboard-stats')
    ]);

    const activeSOS = (emergencyData.alerts || []).filter(a => a.status === 'triggered');
    const pastSOS = (emergencyData.alerts || []).filter(a => a.status === 'resolved');
    const missedReminders = (remindersData.reminders || []).filter(r => r.status === 'missed');
    const patName = statsData.monitoredPatient?.name || 'Patient';

    let alerts = [];

    // Map Active SOS Alerts
    activeSOS.forEach(sos => {
      alerts.push({
        id: sos._id,
        type: 'CRITICAL_SOS',
        level: 'danger',
        icon: 'fa-truck-medical',
        title: `🚨 EMERGENCY SOS SIGNAL FROM ${patName.toUpperCase()}!`,
        message: `${sos.notes || 'Immediate assistance requested'} &bull; Location: ${sos.location?.address || 'Current Coordinates'}`,
        timestamp: new Date(sos.alertTime),
        actionUrl: 'sos-notifications.html',
        actionLabel: 'Respond to SOS'
      });
    });

    // Map Missed Reminders
    missedReminders.forEach(rem => {
      const med = rem.medicineId || {};
      const timeStr = new Date(rem.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const waMsg = encodeURIComponent(`Hi ${patName}, SmartMed detected that you missed your dose of ${med.medicineName || 'medicine'} at ${timeStr}. Are you okay?`);

      alerts.push({
        id: rem._id,
        type: 'MISSED_DOSE',
        level: 'warning',
        icon: 'fa-triangle-exclamation',
        title: `⚠️ Missed Medication Dose: ${med.medicineName || 'Scheduled Medicine'} (${med.dosage || '1 dose'})`,
        message: `Patient ${patName} did not confirm dose at scheduled time (${timeStr}). Automated caregiver alert dispatched.`,
        timestamp: new Date(rem.reminderTime),
        actionUrl: `https://wa.me/?text=${waMsg}`,
        actionLabel: 'Contact via WhatsApp',
        isExternal: true
      });
    });

    // Map Past Resolved SOS
    pastSOS.forEach(sos => {
      alerts.push({
        id: sos._id,
        type: 'RESOLVED_SOS',
        level: 'secondary',
        icon: 'fa-circle-check text-success',
        title: `Emergency SOS Incident Resolved for ${patName}`,
        message: `Incident at ${sos.location?.address || 'Residence'} resolved. Patient marked safe.`,
        timestamp: new Date(sos.alertTime),
        actionUrl: 'sos-notifications.html',
        actionLabel: 'View Log'
      });
    });

    // Sort by newest first
    alerts.sort((a, b) => b.timestamp - a.timestamp);

    const countBadge = document.getElementById('alerts-count-badge');
    if (countBadge) countBadge.innerText = `${alerts.length} Alert${alerts.length === 1 ? '' : 's'}`;

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="p-5 text-center bg-white rounded-3 border">
          <i class="fa-solid fa-bell-slash fs-1 text-success mb-3 opacity-50"></i>
          <h5 class="fw-bold">No Active Alerts</h5>
          <p class="text-muted small">All patient medications are on track and emergency channels are idle.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(a => {
      const timeFormatted = a.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="health-card p-3 p-md-4 mb-3 border-${a.level} shadow-sm">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div class="d-flex align-items-start gap-3">
              <div class="rounded-circle p-3 bg-${a.level} bg-opacity-10 text-${a.level} d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px;">
                <i class="fa-solid ${a.icon} fs-5"></i>
              </div>
              <div>
                <h6 class="fw-bold mb-1 text-${a.level === 'danger' ? 'danger' : 'dark'}">${a.title}</h6>
                <div class="small text-muted mb-2">${a.message}</div>
                <div class="smaller text-secondary"><i class="fa-regular fa-clock me-1"></i>${timeFormatted}</div>
              </div>
            </div>

            <div class="flex-shrink-0">
              <a href="${a.actionUrl}" ${a.isExternal ? 'target="_blank"' : ''} class="btn btn-sm btn-${a.level === 'danger' ? 'danger' : a.level === 'warning' ? 'outline-warning' : 'outline-secondary'} rounded-pill px-3">
                ${a.actionLabel}
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error loading alerts: ${err.message}</div>`;
  }
}
