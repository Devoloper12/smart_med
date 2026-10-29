let allCaregivers = [];
let editingCaregiverId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const isCg = window.isCaregiver && window.isCaregiver();
  if (isCg) {
    const addBtn = document.getElementById('add-caregiver-header-btn');
    if (addBtn) addBtn.style.display = 'none';
    const modalEl = document.getElementById('caregiverModal');
    if (modalEl) modalEl.remove();
    const countBadge = document.getElementById('caregivers-count-badge');
    if (countBadge) {
      countBadge.insertAdjacentHTML('afterend', '<span class="badge bg-info text-dark rounded-pill px-3 py-1 ms-2"><i class="fa-solid fa-user-shield me-1"></i>Caregiver Read-Only</span>');
    }
    await loadLinkedPatientCard();
  }

  await loadCaregivers();
  document.getElementById('caregiver-form')?.addEventListener('submit', handleCaregiverFormSubmit);
  document.getElementById('caregiverModal')?.addEventListener('hidden.bs.modal', resetCaregiverForm);
});

async function loadLinkedPatientCard() {
  try {
    const data = await API.get('/patients/profile');
    if (!data || !data.patient) return;
    const pat = data.patient;
    const patUser = pat.userId || {};

    let card = document.getElementById('linked-patient-display-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'linked-patient-display-card';
      card.className = 'health-card p-4 mb-4 border-primary shadow-sm';
      const mainContainer = document.querySelector('main.container');
      const gridRow = document.getElementById('caregivers-container');
      if (mainContainer && gridRow) {
        mainContainer.insertBefore(card, gridRow);
      }
    }

    const conditions = Array.isArray(pat.medicalConditions) && pat.medicalConditions.length > 0
      ? pat.medicalConditions.map(c => `<span class="badge bg-light text-dark border me-1">${c}</span>`).join('')
      : '<span class="text-muted small">None recorded</span>';

    card.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span class="badge bg-primary rounded-pill mb-2 px-3 py-1">
            <i class="fa-solid fa-link me-1"></i> Monitored Linked Patient
          </span>
          <h4 class="fw-bold mb-1">${patUser.name || 'Patient'}</h4>
          <div class="small text-muted mb-2">
            <span class="me-3"><i class="fa-regular fa-envelope me-1 text-primary"></i>${patUser.email || 'N/A'}</span>
            <span class="me-3"><i class="fa-solid fa-droplet me-1 text-danger"></i>Blood Group: <strong>${pat.bloodGroup || 'O+'}</strong></span>
            <span><i class="fa-regular fa-calendar me-1 text-primary"></i>Age: <strong>${pat.age || 30}</strong></span>
          </div>
          <div class="small">
            <strong class="text-secondary">Medical Conditions:</strong> ${conditions}
          </div>
        </div>

        <div class="d-flex flex-column align-items-md-end gap-2">
          <span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3 py-2">
            <i class="fa-solid fa-circle-check me-1"></i> Emergency Alerts Linked
          </span>
          <a href="dashboard.html" class="btn btn-sm btn-outline-primary rounded-pill px-3">
            <i class="fa-solid fa-gauge-high me-1"></i> Patient Health Dashboard
          </a>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Error loading patient profile:', e);
  }
}

async function loadCaregivers() {
  const container = document.getElementById('caregivers-container');
  if (!container) return;

  try {
    const data = await API.get('/caregivers');
    allCaregivers = data.caregivers || [];
    renderCaregivers(allCaregivers);
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center py-4 text-danger">Failed to load caregivers: ${err.message}</div>`;
  }
}

function renderCaregivers(caregivers) {
  const container = document.getElementById('caregivers-container');
  const countBadge = document.getElementById('caregivers-count-badge');
  const isCg = window.isCaregiver && window.isCaregiver();
  if (countBadge) countBadge.innerText = `${caregivers.length} Contact${caregivers.length === 1 ? '' : 's'}`;
  if (!container) return;

  if (caregivers.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="bg-white p-4 rounded-3 border">
          <i class="fa-solid fa-hand-holding-heart fs-1 text-primary mb-3 opacity-50"></i>
          <h5>No Caregivers Added</h5>
          <p class="text-muted">${isCg ? 'No caregiver contacts logged yet for this patient.' : 'Register family members or caregivers to receive automated alerts.'}</p>
          ${!isCg ? `
            <button class="btn btn-primary-health btn-sm rounded-pill" data-bs-toggle="modal" data-bs-target="#caregiverModal">
              <i class="fa-solid fa-plus me-1"></i> Add Caregiver
            </button>
          ` : ''}
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = caregivers.map(cg => `
    <div class="col-12 col-md-6 col-lg-4 mb-4">
      <div class="health-card h-100 d-flex flex-column ${cg.isPrimary ? 'border-primary' : ''}">
        <div class="health-card-header d-flex justify-content-between align-items-start gap-2">
          <div>
            <h6 class="fw-bold mb-0">${cg.name}</h6>
            <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill small">${cg.relationship}</span>
            ${cg.isPrimary ? '<span class="badge bg-primary rounded-pill small ms-1">Primary Contact</span>' : ''}
          </div>
          ${!isCg ? `
            <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteCaregiver('${cg._id}')" title="Delete Caregiver">
              <i class="fa-solid fa-trash"></i>
            </button>
          ` : ''}
        </div>
        <div class="health-card-body flex-grow-1">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i class="fa-solid fa-phone text-primary small"></i>
            <a href="tel:${cg.phone}" class="text-decoration-none text-dark fw-medium small text-break">${cg.phone}</a>
          </div>
          ${cg.email ? `<div class="small text-muted mb-3 text-break"><i class="fa-regular fa-envelope me-1"></i>${cg.email}</div>` : ''}
        </div>
        <div class="card-footer bg-transparent border-top p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <button class="btn btn-sm btn-outline-warning rounded-pill" onclick="sendTestAlert('${cg._id}', '${cg.name}')">
            <i class="fa-solid fa-paper-plane me-1"></i> Test Alert
          </button>
          <a href="tel:${cg.phone}" class="btn btn-sm btn-outline-success rounded-pill px-3">Call</a>
        </div>
      </div>
    </div>
  `).join('');
}

function resetCaregiverForm() {
  editingCaregiverId = null;
  document.getElementById('caregiver-form')?.reset();
}

async function handleCaregiverFormSubmit(e) {
  e.preventDefault();
  if (window.isCaregiver && window.isCaregiver()) {
    showToast('Caregiver accounts are read-only and cannot add caregivers.', 'warning');
    return;
  }
  const name = document.getElementById('cg-name').value.trim();
  const phone = document.getElementById('cg-phone').value.trim();
  const relationship = document.getElementById('cg-relation').value.trim();
  const email = document.getElementById('cg-email').value.trim();
  const isPrimary = document.getElementById('cg-primary').checked;

  if (!name || !phone || !relationship) return showToast('Fill all required fields.', 'error');

  try {
    await API.post('/caregivers', { name, phone, relationship, email, isPrimary });
    showToast('Caregiver added!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('caregiverModal')).hide();
    await loadCaregivers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function sendTestAlert(id, name) {
  try {
    const res = await API.post(`/caregivers/${id}/notify`, { message: 'Emergency contact test ping from patient' });
    showToast(res.message, 'success');
    if (res.dispatch && res.dispatch.whatsappUrl) {
      if (confirm(`Alert generated for ${name} (${res.dispatch.phone})!\n\nOpen WhatsApp to send alert message directly to their phone now?`)) {
        window.open(res.dispatch.whatsappUrl, '_blank');
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCaregiver(id) {
  if (window.isCaregiver && window.isCaregiver()) {
    showToast('Caregiver accounts are read-only and cannot remove caregivers.', 'warning');
    return;
  }
  if (!confirm('Remove caregiver?')) return;
  try {
    const res = await API.delete(`/caregivers/${id}`);
    showToast(res.message, 'success');
    await loadCaregivers();
  } catch (err) { showToast(err.message, 'error'); }
}
