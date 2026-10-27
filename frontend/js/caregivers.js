let allCaregivers = [];
let editingCaregiverId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadCaregivers();
  document.getElementById('caregiver-form')?.addEventListener('submit', handleCaregiverFormSubmit);
  document.getElementById('caregiverModal')?.addEventListener('hidden.bs.modal', resetCaregiverForm);
});

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
  if (countBadge) countBadge.innerText = `${caregivers.length} Contact${caregivers.length === 1 ? '' : 's'}`;
  if (!container) return;

  if (caregivers.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="bg-white p-4 rounded-3 border">
          <i class="fa-solid fa-user-doctor fs-1 text-primary mb-3 opacity-50"></i>
          <h5>No Caregivers Added</h5>
          <p class="text-muted">Register family members or doctors to receive automated alerts.</p>
          <button class="btn btn-primary-health btn-sm rounded-pill" data-bs-toggle="modal" data-bs-target="#caregiverModal">
            <i class="fa-solid fa-plus me-1"></i> Add Caregiver
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = caregivers.map(cg => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="health-card h-100 d-flex flex-column ${cg.isPrimary ? 'border-primary' : ''}">
        <div class="health-card-header">
          <div>
            <h6 class="fw-bold mb-0">${cg.name}</h6>
            <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill small">${cg.relationship}</span>
          </div>
          <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteCaregiver('${cg._id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <div class="health-card-body flex-grow-1">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i class="fa-solid fa-phone text-primary small"></i>
            <a href="tel:${cg.phone}" class="text-decoration-none text-dark fw-medium small">${cg.phone}</a>
          </div>
          ${cg.email ? `<div class="small text-muted mb-3"><i class="fa-regular fa-envelope me-1"></i>${cg.email}</div>` : ''}
        </div>
        <div class="card-footer bg-transparent border-top p-3 d-flex justify-content-between align-items-center">
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
    const res = await API.post(`/caregivers/${id}/notify`, { message: 'Test ping from Smart Medicine system' });
    showToast(res.message, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCaregiver(id) {
  if (!confirm('Remove caregiver?')) return;
  try {
    const res = await API.delete(`/caregivers/${id}`);
    showToast(res.message, 'success');
    await loadCaregivers();
  } catch (err) { showToast(err.message, 'error'); }
}
