let allPatientsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchPatients();

  document.getElementById('patients-search')?.addEventListener('input', filterPatients);
  document.getElementById('patients-status-filter')?.addEventListener('change', filterPatients);
});

async function fetchPatients() {
  const container = document.getElementById('patients-directory-container');
  if (!container) return;

  try {
    const data = await API.get('/patients/assigned');
    allPatientsList = data.patients || [];
    renderPatients(allPatientsList);
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center py-4 text-danger">Failed to load patients: ${err.message}</div>`;
  }
}

function filterPatients() {
  const query = document.getElementById('patients-search')?.value.toLowerCase().trim() || '';
  const status = document.getElementById('patients-status-filter')?.value || 'all';

  const filtered = allPatientsList.filter(p => {
    const matchesQuery = (p.name || '').toLowerCase().includes(query) || (p.email || '').toLowerCase().includes(query) || (p.medicalConditions || []).some(c => c.toLowerCase().includes(query));
    const matchesStatus = status === 'all' || (p.status || '').toLowerCase().includes(status.toLowerCase());
    return matchesQuery && matchesStatus;
  });

  renderPatients(filtered);
}

function renderPatients(patients) {
  const container = document.getElementById('patients-directory-container');
  const countBadge = document.getElementById('patients-count-badge');
  if (countBadge) countBadge.innerText = `${patients.length} Patient${patients.length === 1 ? '' : 's'}`;
  if (!container) return;

  if (patients.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="bg-white p-4 rounded-3 border">
          <i class="fa-solid fa-users-slash fs-1 text-primary mb-3 opacity-50"></i>
          <h5>No Patients Found</h5>
          <p class="text-muted">No assigned patients match your filter criteria.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = patients.map(p => {
    const conditions = (p.medicalConditions || []).length > 0
      ? p.medicalConditions.map(c => `<span class="badge bg-light text-dark border me-1 small">${c}</span>`).join('')
      : '<span class="text-muted smaller">None recorded</span>';

    const statusBadge = p.statusBadge === 'danger'
      ? 'bg-danger text-white'
      : p.statusBadge === 'warning'
      ? 'bg-warning text-dark'
      : 'bg-success bg-opacity-10 text-success border border-success';

    return `
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <div class="health-card h-100 d-flex flex-column shadow-sm">
          <div class="health-card-header d-flex justify-content-between align-items-start gap-2">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle p-2 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width: 44px; height: 44px;">
                <i class="fa-solid fa-hospital-user fs-5"></i>
              </div>
              <div>
                <h6 class="fw-bold mb-0">${p.name}</h6>
                <div class="smaller text-muted">${p.email || 'N/A'}</div>
              </div>
            </div>
            <span class="badge ${statusBadge} rounded-pill small px-2 py-1">${p.status}</span>
          </div>

          <div class="health-card-body flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded-3">
              <span class="small text-muted"><i class="fa-solid fa-droplet text-danger me-1"></i>Blood: <strong>${p.bloodGroup || 'O+'}</strong></span>
              <span class="small text-muted"><i class="fa-regular fa-calendar me-1 text-primary"></i>Age: <strong>${p.age || 30} yrs</strong></span>
              <span class="small text-muted"><i class="fa-solid fa-pills text-info me-1"></i>Meds: <strong>${p.activeMedicinesCount || 1}</strong></span>
            </div>

            <div class="mb-3">
              <div class="d-flex justify-content-between smaller text-muted mb-1">
                <span>Adherence Rate</span>
                <span class="fw-bold text-success">${p.adherenceRate}%</span>
              </div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar bg-success" style="width: ${p.adherenceRate}%"></div>
              </div>
            </div>

            <div class="smaller mb-2">
              <strong class="text-secondary">Conditions:</strong>
              <div class="mt-1">${conditions}</div>
            </div>

            <div class="smaller text-muted border-top pt-2 mt-auto">
              <i class="fa-solid fa-location-dot me-1 text-success"></i>${p.location}
            </div>
          </div>

          <div class="card-footer bg-transparent border-top p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <a href="patient-tracking.html?patientId=${p.patientId}" class="btn btn-sm btn-primary-health rounded-pill px-3">
              <i class="fa-solid fa-chart-line me-1"></i> Tracking
            </a>
            <a href="messages.html?patientId=${p.patientId}&name=${encodeURIComponent(p.name)}" class="btn btn-sm btn-outline-success rounded-pill px-3">
              <i class="fa-brands fa-whatsapp me-1"></i> Message
            </a>
            <a href="health-status.html?patientId=${p.patientId}" class="btn btn-sm btn-outline-secondary rounded-pill px-2" title="Health Status">
              <i class="fa-solid fa-heart-pulse"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
