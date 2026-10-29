let reportChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadReports();
});

async function loadReports() {
  const container = document.getElementById('reports-content-container');
  if (!container) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId') || '';

    const data = await API.get(`/patients/reports${patientId ? `?patientId=${patientId}` : ''}`);
    if (!data || !data.report) {
      container.innerHTML = `<div class="alert alert-warning">No report data generated.</div>`;
      return;
    }

    const p = data.patient || { name: 'Assigned Patient', age: 48, bloodGroup: 'O+', medicalConditions: [] };
    const r = data.report;

    const conditions = (p.medicalConditions || []).length > 0
      ? p.medicalConditions.map(c => `<span class="badge bg-light text-dark border me-1">${c}</span>`).join('')
      : '<span class="text-muted small">None recorded</span>';

    container.innerHTML = `
      <!-- Patient Information Header Card -->
      <div class="health-card p-4 mb-4 border-primary shadow-sm">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span class="badge bg-primary rounded-pill mb-2 px-3 py-1">Official Medical Adherence Report</span>
            <h4 class="fw-bold mb-1">${p.name}</h4>
            <div class="text-muted small">
              <span class="me-3"><i class="fa-regular fa-envelope me-1 text-primary"></i>${p.email || 'patient@smartmed.com'}</span>
              <span class="me-3"><i class="fa-solid fa-droplet text-danger me-1"></i>Blood Group: <strong>${p.bloodGroup || 'O+'}</strong></span>
              <span><i class="fa-regular fa-calendar text-primary me-1"></i>Age: <strong>${p.age || 48} yrs</strong></span>
            </div>
            <div class="mt-2 small">
              <strong class="text-secondary">Medical Conditions:</strong> ${conditions}
            </div>
          </div>

          <div class="text-md-end">
            <div class="display-6 fw-bold text-success">${r.adherenceRate}%</div>
            <div class="small text-muted">Overall Adherence Score</div>
          </div>
        </div>
      </div>

      <!-- Compliance Metrics Overview -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="text-muted small fw-medium">Total Doses Scheduled</div>
            <div class="metric-number text-primary">${r.totalScheduled}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="text-muted small fw-medium">Successfully Taken</div>
            <div class="metric-number text-success">${r.takenCount}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="text-muted small fw-medium">Missed Doses</div>
            <div class="metric-number text-danger">${r.missedCount}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="text-muted small fw-medium">Pending Doses</div>
            <div class="metric-number text-warning">${r.pendingCount || 0}</div>
          </div>
        </div>
      </div>

      <!-- Weekly Trend Chart -->
      <div class="health-card p-4 mb-4">
        <h5 class="fw-bold mb-3"><i class="fa-solid fa-chart-column me-2 text-success"></i>7-Day Intake Compliance Trend</h5>
        <div style="height: 250px; position: relative;">
          <canvas id="reportAdherenceChart"></canvas>
        </div>
      </div>

      <!-- Detailed Medication Intake Audit Log Table -->
      <div class="health-card">
        <div class="health-card-header d-flex justify-content-between align-items-center">
          <h5 class="fw-bold mb-0"><i class="fa-solid fa-clipboard-list me-2 text-primary"></i>Recent Medication Intake Audit Log</h5>
          <span class="small text-muted">Latest Record Feed</span>
        </div>
        <div class="health-card-body p-0">
          ${(r.auditLog || []).length === 0 ? `
            <div class="p-4 text-center text-muted">No audit log records available.</div>
          ` : `
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Scheduled Time</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${r.auditLog.map(item => {
                    const med = item.medicineId || {};
                    const timeStr = new Date(item.reminderTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const isTaken = item.status === 'taken';
                    const isMissed = item.status === 'missed';

                    return `
                      <tr>
                        <td class="fw-bold">${med.medicineName || 'Medicine'}</td>
                        <td><span class="badge bg-light text-dark border">${med.dosage || '1 dose'}</span></td>
                        <td><i class="fa-regular fa-clock me-1 text-primary"></i>${timeStr}</td>
                        <td>
                          <span class="badge ${isTaken ? 'bg-success' : isMissed ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill">
                            ${item.status.toUpperCase()}
                          </span>
                        </td>
                        <td class="small text-muted">${item.notes || med.instructions || 'Standard'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    renderChart(r.weeklyLabels, r.weeklyTaken, r.weeklyMissed);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error loading report: ${err.message}</div>`;
  }
}

function renderChart(labels, taken, missed) {
  const canvas = document.getElementById('reportAdherenceChart');
  if (!canvas) return;
  if (reportChart) reportChart.destroy();

  const ctx = canvas.getContext('2d');
  reportChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        { label: 'Taken', data: taken || [3, 4, 3, 4, 4, 3, 4], backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Missed', data: missed || [0, 1, 0, 0, 0, 1, 0], backgroundColor: '#ef4444', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}
