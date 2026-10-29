let allAssignedPatients = [];
let selectedPatientId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchAssignedPatients();

  document.getElementById('patient-search')?.addEventListener('input', filterPatients);
  document.getElementById('patient-status-filter')?.addEventListener('change', filterPatients);
});

async function fetchAssignedPatients() {
  const grid = document.getElementById('assigned-patients-grid');
  if (!grid) return;

  try {
    const data = await API.get('/patients/assigned');
    allAssignedPatients = data.patients || [];

    if (allAssignedPatients.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="p-4 bg-white rounded-3 border text-center text-muted">
            <i class="fa-solid fa-user-xmark fs-2 mb-2 text-secondary opacity-50"></i>
            <h6>No Patients Currently Assigned</h6>
            <p class="small mb-0">When patients link your caregiver account, their real-time telemetry will stream here.</p>
          </div>
        </div>
      `;
      return;
    }

    renderPatientsGrid(allAssignedPatients);

    // Select first patient by default
    if (!selectedPatientId && allAssignedPatients.length > 0) {
      selectedPatientId = allAssignedPatients[0].patientId;
      await loadPatientTrackingDetail(selectedPatientId);
    }
  } catch (err) {
    grid.innerHTML = `<div class="col-12 text-danger p-3 text-center">Failed to load patients: ${err.message}</div>`;
  }
}

function filterPatients() {
  const query = document.getElementById('patient-search')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('patient-status-filter')?.value || 'all';

  const filtered = allAssignedPatients.filter(p => {
    const nameMatch = (p.name || '').toLowerCase().includes(query);
    const condMatch = (p.medicalConditions || []).some(c => c.toLowerCase().includes(query));
    const bloodMatch = (p.bloodGroup || '').toLowerCase().includes(query);
    const searchPass = !query || nameMatch || condMatch || bloodMatch;

    const statusPass = statusFilter === 'all' || (p.status || '').toLowerCase().includes(statusFilter.toLowerCase());

    return searchPass && statusPass;
  });

  renderPatientsGrid(filtered);
}

function renderPatientsGrid(patients) {
  const grid = document.getElementById('assigned-patients-grid');
  if (!grid) return;

  if (patients.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-3 text-muted small">No patients match the search criteria.</div>`;
    return;
  }

  grid.innerHTML = patients.map(p => {
    const isSelected = p.patientId === selectedPatientId;
    const badgeClass = p.statusBadge === 'danger' ? 'bg-danger text-white' : p.statusBadge === 'warning' ? 'bg-warning text-dark' : 'bg-success bg-opacity-10 text-success border border-success';

    return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="health-card p-3 h-100 cursor-pointer ${isSelected ? 'border-primary shadow-sm bg-primary bg-opacity-10' : ''}" onclick="selectPatient('${p.patientId}')" style="cursor: pointer; transition: all 0.2s ease;">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle p-2 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
                <i class="fa-solid fa-hospital-user"></i>
              </div>
              <div>
                <div class="fw-bold fs-6">${p.name}</div>
                <div class="small text-muted">${p.email || 'N/A'}</div>
              </div>
            </div>
            <span class="badge ${badgeClass} rounded-pill small px-2 py-1">${p.status}</span>
          </div>

          <div class="d-flex justify-content-between align-items-center smaller text-muted pt-2 border-top mt-2">
            <span><i class="fa-solid fa-droplet text-danger me-1"></i>${p.bloodGroup || 'O+'}</span>
            <span><i class="fa-solid fa-chart-pie text-primary me-1"></i>${p.adherenceRate}% Adherence</span>
            <span><i class="fa-solid fa-triangle-exclamation text-warning me-1"></i>${p.missedCount} Missed</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function selectPatient(patientId) {
  selectedPatientId = patientId;
  renderPatientsGrid(allAssignedPatients);
  await loadPatientTrackingDetail(patientId);
}

async function loadPatientTrackingDetail(patientId) {
  const container = document.getElementById('patient-detail-tracking-section');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <div class="mt-2 text-muted small">Streaming live patient tracking data...</div>
    </div>
  `;

  try {
    const data = await API.get(`/patients/tracking?patientId=${patientId}`);
    if (!data || !data.patient) {
      container.innerHTML = `<div class="alert alert-warning">Patient telemetry unavailable.</div>`;
      return;
    }

    const p = data.patient;
    const t = data.tracking;

    // Check for SOS alert
    const sosBanner = document.getElementById('sos-alert-container');
    if (sosBanner) {
      if (t.hasActiveSOS && t.activeSOS) {
        sosBanner.innerHTML = `
          <div class="alert alert-danger shadow border-danger d-flex flex-wrap justify-content-between align-items-center p-3 mb-4 rounded-3">
            <div class="d-flex align-items-center gap-2">
              <span class="spinner-grow spinner-grow-sm text-danger" role="status"></span>
              <div>
                <strong class="fs-6">🚨 CRITICAL EMERGENCY SOS SIGNAL DETECTED FOR ${p.name.toUpperCase()}!</strong>
                <div class="small text-danger-emphasis">
                  Location: ${t.activeSOS.location?.address || 'Current Coordinates'} &bull; Notes: ${t.activeSOS.notes || 'Emergency assistance requested'}
                </div>
              </div>
            </div>
            <div class="d-flex gap-2 mt-2 mt-sm-0">
              <a href="sos-notifications.html" class="btn btn-sm btn-danger rounded-pill px-3">
                <i class="fa-solid fa-truck-medical me-1"></i> View SOS Incident
              </a>
            </div>
          </div>
        `;
      } else {
        sosBanner.innerHTML = '';
      }
    }

    // Format times
    const lastActiveDate = new Date(t.lastActive);
    const lastActiveStr = lastActiveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + lastActiveDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';

    const conditionsBadges = (p.medicalConditions || []).length > 0
      ? p.medicalConditions.map(c => `<span class="badge bg-light text-dark border me-1">${c}</span>`).join('')
      : '<span class="text-muted small">None recorded</span>';

    // Modern Healthcare Tracking Section
    container.innerHTML = `
      <!-- Top Health Summary Card -->
      <div class="health-card p-4 mb-4 border-primary shadow-sm">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div class="d-flex align-items-start gap-3">
            <div class="rounded-circle bg-primary bg-opacity-10 text-primary p-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 60px; height: 60px;">
              <i class="fa-solid fa-heart-pulse fs-3"></i>
            </div>
            <div>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <h4 class="fw-bold mb-0">${p.name}</h4>
                <span class="badge ${t.statusBadge === 'danger' ? 'bg-danger text-white' : t.statusBadge === 'warning' ? 'bg-warning text-dark' : 'bg-success bg-opacity-10 text-success border border-success'} rounded-pill px-3 py-1">
                  ${t.status}
                </span>
                <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-1">
                  ${t.adherenceRate}% Adherence
                </span>
              </div>
              <div class="text-muted small mt-1">
                <span class="me-3"><i class="fa-regular fa-envelope me-1 text-primary"></i>${p.email || 'patient@smartmed.com'}</span>
                <span class="me-3"><i class="fa-solid fa-droplet me-1 text-danger"></i>Blood Group: <strong>${p.bloodGroup || 'O+'}</strong></span>
                <span class="me-3"><i class="fa-regular fa-calendar me-1 text-primary"></i>Age: <strong>${p.age || 30} yrs</strong></span>
                <span><i class="fa-solid fa-clock-rotate-left me-1 text-secondary"></i>Last Active: <strong>${lastActiveStr}</strong></span>
              </div>
              <div class="mt-2 small">
                <strong class="text-secondary">Medical Conditions:</strong> ${conditionsBadges}
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <a href="sos-notifications.html" class="btn btn-sm btn-outline-danger rounded-pill px-3">
              <i class="fa-solid fa-truck-medical me-1"></i> SOS Notifications
            </a>
            <a href="health-status.html?patientId=${p.id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">
              <i class="fa-solid fa-heart-pulse me-1"></i> Health Status
            </a>
          </div>
        </div>
      </div>

      <!-- Telemetry Cards Row -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Adherence Percentage</div>
                <div class="metric-number text-success">${t.adherenceRate}%</div>
              </div>
              <div class="metric-icon-box bg-success bg-opacity-10 text-success">
                <i class="fa-solid fa-percent"></i>
              </div>
            </div>
            <div class="progress mt-2" style="height: 6px;">
              <div class="progress-bar bg-success" role="progressbar" style="width: ${t.adherenceRate}%"></div>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Missed Doses</div>
                <div class="metric-number text-danger">${(t.missedMedicines || []).length}</div>
              </div>
              <div class="metric-icon-box bg-danger bg-opacity-10 text-danger">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
            </div>
            <div class="small text-danger mt-1">Requires follow-up</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Upcoming Today</div>
                <div class="metric-number text-primary">${(t.upcomingMedicines || []).length}</div>
              </div>
              <div class="metric-icon-box bg-primary bg-opacity-10 text-primary">
                <i class="fa-regular fa-clock"></i>
              </div>
            </div>
            <div class="small text-muted mt-1">Next scheduled doses</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="metric-card">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small fw-medium">Active Prescriptions</div>
                <div class="metric-number text-info">${t.totalMedicinesCount || 1}</div>
              </div>
              <div class="metric-icon-box bg-info bg-opacity-10 text-info">
                <i class="fa-solid fa-pills"></i>
              </div>
            </div>
            <div class="small text-muted mt-1">Regimen active</div>
          </div>
        </div>
      </div>

      <!-- Location Tracking Card (Optional / Real-time) -->
      <div class="health-card p-3 p-md-4 mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="fw-bold mb-0">
            <i class="fa-solid fa-location-crosshairs text-danger me-2"></i>Patient Location & Geolocation Telemetry
          </h6>
          <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill small px-2 py-1">GPS Telemetry</span>
        </div>
        <div class="row g-3 align-items-center">
          <div class="col-md-7">
            <div class="d-flex align-items-start gap-3">
              <div class="rounded-circle bg-danger bg-opacity-10 text-danger p-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px;">
                <i class="fa-solid fa-map-pin fs-5"></i>
              </div>
              <div>
                <div class="fw-semibold text-dark">${t.location?.address || 'Current Registered Residence'}</div>
                <div class="small text-muted mt-1">
                  GPS Coordinates: Lat <strong>${t.location?.latitude || '12.9716'}</strong>, Long <strong>${t.location?.longitude || '77.5946'}</strong>
                </div>
                <div class="smaller text-muted mt-1">
                  <i class="fa-regular fa-clock me-1"></i>Last location sync: ${new Date(t.location?.updatedAt || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-5 text-md-end">
            <a href="https://maps.google.com/?q=${t.location?.latitude || '12.9716'},${t.location?.longitude || '77.5946'}" target="_blank" class="btn btn-sm btn-outline-danger rounded-pill px-3">
              <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Open Google Maps
            </a>
          </div>
        </div>
      </div>

      <!-- Missed Medicines & Upcoming Medicines Lists Row -->
      <div class="row g-4 mb-4">
        <!-- Missed Medicines Panel -->
        <div class="col-lg-6">
          <div class="health-card h-100">
            <div class="health-card-header d-flex justify-content-between align-items-center">
              <div>
                <h6 class="fw-bold mb-0 text-danger">
                  <i class="fa-solid fa-triangle-exclamation me-2"></i>Missed Medicines Log
                </h6>
                <div class="smaller text-muted">Doses that triggered alerts to caregiver</div>
              </div>
              <span class="badge bg-danger rounded-pill px-2 py-1">${(t.missedMedicines || []).length} Recorded</span>
            </div>
            <div class="health-card-body p-3">
              ${renderMissedMedicinesList(t.missedMedicines || [], p)}
            </div>
          </div>
        </div>

        <!-- Upcoming Scheduled Medicines -->
        <div class="col-lg-6">
          <div class="health-card h-100">
            <div class="health-card-header d-flex justify-content-between align-items-center">
              <div>
                <h6 class="fw-bold mb-0 text-primary">
                  <i class="fa-regular fa-calendar-check me-2"></i>Upcoming Scheduled Medicines
                </h6>
                <div class="smaller text-muted">Next patient intake doses</div>
              </div>
              <span class="badge bg-primary rounded-pill px-2 py-1">${(t.upcomingMedicines || []).length} Scheduled</span>
            </div>
            <div class="health-card-body p-3">
              ${renderUpcomingMedicinesList(t.upcomingMedicines || [])}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error loading patient telemetry: ${err.message}</div>`;
  }
}

function renderMissedMedicinesList(missedList, patient) {
  if (missedList.length === 0) {
    return `
      <div class="text-center py-4 text-muted">
        <i class="fa-solid fa-circle-check fs-2 text-success opacity-50 mb-2"></i>
        <div class="small fw-medium">No missed medicines recorded!</div>
        <div class="smaller text-muted">Patient has taken scheduled doses diligently.</div>
      </div>
    `;
  }

  return missedList.map(item => {
    const med = item.medicineId || {};
    const timeStr = new Date(item.reminderTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const waText = encodeURIComponent(`Hi ${patient.name}, checking in regarding your missed dose of ${med.medicineName || 'medicine'} scheduled for ${timeStr}. Please let me know if you need assistance.`);
    const waUrl = `https://wa.me/?text=${waText}`;

    return `
      <div class="p-3 mb-2 rounded-3 border border-danger border-opacity-25 bg-danger bg-opacity-10 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
        <div>
          <div class="fw-bold text-dark">${med.medicineName || 'Medicine'} <span class="badge bg-light text-dark border small ms-1">${med.dosage || 'Dose'}</span></div>
          <div class="smaller text-danger"><i class="fa-regular fa-clock me-1"></i>Missed at: ${timeStr}</div>
          ${med.instructions ? `<div class="smaller text-muted mt-1">${med.instructions}</div>` : ''}
        </div>
        <a href="${waUrl}" target="_blank" class="btn btn-sm btn-outline-danger rounded-pill px-3 flex-shrink-0">
          <i class="fa-brands fa-whatsapp me-1"></i> Remind
        </a>
      </div>
    `;
  }).join('');
}

function renderUpcomingMedicinesList(upcomingList) {
  if (upcomingList.length === 0) {
    return `
      <div class="text-center py-4 text-muted">
        <i class="fa-regular fa-clock fs-2 text-primary opacity-50 mb-2"></i>
        <div class="small fw-medium">No upcoming doses in current window</div>
        <div class="smaller text-muted">Schedule is up to date.</div>
      </div>
    `;
  }

  return upcomingList.map(item => {
    const med = item.medicineId || {};
    const timeStr = new Date(item.reminderTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
      <div class="p-3 mb-2 rounded-3 border bg-light d-flex justify-content-between align-items-center gap-2">
        <div>
          <div class="fw-bold text-dark">${med.medicineName || 'Medicine'} <span class="badge bg-primary bg-opacity-10 text-primary small ms-1">${med.dosage || '1 dose'}</span></div>
          <div class="smaller text-muted"><i class="fa-regular fa-clock me-1 text-primary"></i>Scheduled: ${timeStr}</div>
          ${med.instructions ? `<div class="smaller text-secondary mt-1">${med.instructions}</div>` : ''}
        </div>
        <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1 small">Pending</span>
      </div>
    `;
  }).join('');
}
