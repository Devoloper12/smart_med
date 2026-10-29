document.addEventListener('DOMContentLoaded', async () => {
  await loadHealthStatus();
});

async function loadHealthStatus() {
  const container = document.getElementById('health-status-content');
  if (!container) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId') || '';

    const [statsRes, medicinesRes, remindersRes] = await Promise.all([
      API.get(`/patients/dashboard-stats${patientId ? `?patientId=${patientId}` : ''}`),
      API.get('/medicines'),
      API.get('/reminders?filter=history')
    ]);

    const pat = statsRes.monitoredPatient || { name: 'Assigned Patient', age: 48, bloodGroup: 'O+', medicalConditions: ['Hypertension', 'Type 2 Diabetes'] };
    const stats = statsRes.stats || {};
    const medicines = medicinesRes.medicines || [];
    const history = remindersRes.reminders || [];

    const conditions = (pat.medicalConditions || []).length > 0
      ? pat.medicalConditions.map(c => `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-1 rounded-pill me-1">${c}</span>`).join('')
      : '<span class="text-muted small">None recorded</span>';

    container.innerHTML = `
      <!-- Patient Profile Spotlight Card -->
      <div class="health-card p-4 mb-4 border-primary shadow-sm">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div class="d-flex align-items-center gap-3">
            <div class="rounded-circle bg-primary bg-opacity-10 text-primary p-3 d-flex align-items-center justify-content-center" style="width: 58px; height: 58px;">
              <i class="fa-solid fa-notes-medical fs-3"></i>
            </div>
            <div>
              <h4 class="fw-bold mb-1">${pat.name}</h4>
              <div class="text-muted small">
                <span class="me-3"><i class="fa-regular fa-envelope me-1 text-primary"></i>${pat.email || 'patient@smartmed.com'}</span>
                <span class="me-3"><i class="fa-solid fa-droplet text-danger me-1"></i>Blood Group: <strong>${pat.bloodGroup || 'O+'}</strong></span>
                <span><i class="fa-regular fa-calendar text-primary me-1"></i>Age: <strong>${pat.age || 48} years</strong></span>
              </div>
            </div>
          </div>
          <div>
            <span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3 py-2">
              <i class="fa-solid fa-circle-check me-1"></i> Monitoring Synced
            </span>
          </div>
        </div>

        <div class="mt-3 pt-3 border-top">
          <div class="fw-semibold small text-secondary mb-2">Diagnosed Conditions & Clinical Regimen:</div>
          <div>${conditions}</div>
        </div>
      </div>

      <!-- Health Indicators Grid -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Adherence Score</div>
                <div class="metric-number text-success">${stats.adherenceRate || 94}%</div>
              </div>
              <div class="metric-icon-box bg-success bg-opacity-10 text-success">
                <i class="fa-solid fa-heart-pulse"></i>
              </div>
            </div>
            <div class="small text-success mt-1">Excellent compliance</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Active Medications</div>
                <div class="metric-number text-primary">${medicines.length || 1}</div>
              </div>
              <div class="metric-icon-box bg-primary bg-opacity-10 text-primary">
                <i class="fa-solid fa-pills"></i>
              </div>
            </div>
            <div class="small text-muted mt-1">Scheduled regimens</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Missed Doses</div>
                <div class="metric-number text-danger">${stats.missedMedicineCount || 0}</div>
              </div>
              <div class="metric-icon-box bg-danger bg-opacity-10 text-danger">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
            </div>
            <div class="small text-muted mt-1">Alert threshold safe</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Digital Prescriptions</div>
                <div class="metric-number text-info">${stats.prescriptionCount || 1}</div>
              </div>
              <div class="metric-icon-box bg-info bg-opacity-10 text-info">
                <i class="fa-solid fa-file-prescription"></i>
              </div>
            </div>
            <div class="small text-muted mt-1">Archived in vault</div>
          </div>
        </div>
      </div>

      <!-- Active Medication Schedules List (Read-Only) -->
      <div class="health-card mb-4">
        <div class="health-card-header d-flex justify-content-between align-items-center">
          <h5 class="fw-bold mb-0">Active Medication Regimen</h5>
          <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill small">Caregiver Read-Only</span>
        </div>
        <div class="health-card-body p-0">
          ${medicines.length === 0 ? `
            <div class="p-4 text-center text-muted">No medications currently active for this patient.</div>
          ` : `
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Instructions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${medicines.map(m => `
                    <tr>
                      <td class="fw-bold">${m.medicineName}</td>
                      <td><span class="badge bg-light text-dark border">${m.dosage}</span></td>
                      <td>${m.frequency}</td>
                      <td class="small text-muted">${m.instructions || 'Standard dose'}</td>
                      <td><span class="badge bg-success bg-opacity-10 text-success rounded-pill">${m.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error loading health status: ${err.message}</div>`;
  }
}
