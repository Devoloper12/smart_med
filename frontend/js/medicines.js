let allMedicines = [];
let editingMedicineId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchMedicines();

  document.getElementById('medicine-search')?.addEventListener('input', filterMedicines);
  document.getElementById('status-filter')?.addEventListener('change', filterMedicines);
  document.getElementById('medicine-form')?.addEventListener('submit', handleMedicineFormSubmit);
  document.getElementById('medicineModal')?.addEventListener('hidden.bs.modal', resetMedicineForm);
});

async function fetchMedicines() {
  const container = document.getElementById('medicines-container');
  if (!container) return;

  try {
    const data = await API.get('/medicines');
    allMedicines = data.medicines || [];
    renderMedicines(allMedicines);
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-danger">Failed to load medicines: ${err.message}</div>`;
  }
}

function filterMedicines() {
  const searchVal = document.getElementById('medicine-search')?.value.toLowerCase().trim() || '';
  const statusVal = document.getElementById('status-filter')?.value || 'all';

  const filtered = allMedicines.filter(med => {
    const matchesSearch = med.medicineName.toLowerCase().includes(searchVal) || med.dosage.toLowerCase().includes(searchVal);
    const matchesStatus = statusVal === 'all' || med.status.toLowerCase() === statusVal.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  renderMedicines(filtered);
}

function renderMedicines(medicines) {
  const container = document.getElementById('medicines-container');
  const countEl = document.getElementById('medicines-count-badge');
  if (countEl) countEl.innerText = `${medicines.length} Medicine${medicines.length === 1 ? '' : 's'}`;
  if (!container) return;

  if (medicines.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="p-4 bg-white rounded-3 border">
          <i class="fa-solid fa-pills fs-1 text-primary mb-3 opacity-50"></i>
          <h5>No medicines found</h5>
          <p class="text-muted">Click below to add a new medication schedule.</p>
          <button class="btn btn-primary-health btn-sm rounded-pill mt-2" data-bs-toggle="modal" data-bs-target="#medicineModal">
            <i class="fa-solid fa-plus me-1"></i> Add New Medicine
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = medicines.map(med => {
    const start = new Date(med.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const end = new Date(med.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const statusColor = med.status === 'Active' ? 'success' : 'secondary';

    return `
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <div class="health-card h-100 d-flex flex-column">
          <div class="health-card-header d-flex justify-content-between align-items-start gap-2">
            <div>
              <span class="badge bg-${statusColor} bg-opacity-10 text-${statusColor} rounded-pill px-2 py-1 mb-1 small">${med.status}</span>
              <h5 class="fw-bold mb-0 text-break">${med.medicineName}</h5>
            </div>
            <div class="dropdown">
              <button class="btn btn-sm btn-light rounded-circle" type="button" data-bs-toggle="dropdown">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li><button class="dropdown-item" onclick="openEditMedicineModal('${med._id}')"><i class="fa-solid fa-pen-to-square me-2 text-primary"></i>Edit</button></li>
                <li><button class="dropdown-item text-danger" onclick="deleteMedicine('${med._id}', '${med.medicineName}')"><i class="fa-solid fa-trash me-2"></i>Delete</button></li>
              </ul>
            </div>
          </div>

          <div class="health-card-body flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-light text-dark border">${med.dosage}</span>
              <span class="badge bg-light text-dark border">${med.frequency}</span>
            </div>
            <p class="small text-muted mb-3">${med.instructions || 'Take as instructed.'}</p>
            <div class="border-top pt-2 mt-auto smaller text-muted d-flex justify-content-between">
              <span>From: ${start}</span>
              <span>To: ${end}</span>
            </div>
          </div>

          <div class="card-footer bg-transparent border-top p-3 d-flex justify-content-between align-items-center">
            <a href="reminders.html" class="btn btn-sm btn-outline-primary rounded-pill">
              <i class="fa-regular fa-bell me-1"></i> Reminders
            </a>
            <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="openEditMedicineModal('${med._id}')">
              <i class="fa-solid fa-pen me-1"></i> Edit
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function resetMedicineForm() {
  editingMedicineId = null;
  document.getElementById('medicine-form')?.reset();
  document.getElementById('medicineModalLabel').innerText = 'Add New Medicine';
  document.getElementById('save-medicine-btn').innerHTML = '<i class="fa-solid fa-plus me-1"></i> Add Medicine';

  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  if (document.getElementById('med-start-date')) document.getElementById('med-start-date').value = today;
  if (document.getElementById('med-end-date')) document.getElementById('med-end-date').value = nextMonth;
}

function openEditMedicineModal(id) {
  const med = allMedicines.find(m => String(m._id) === String(id));
  if (!med) return;

  editingMedicineId = id;
  document.getElementById('medicineModalLabel').innerText = 'Edit Medicine';
  document.getElementById('save-medicine-btn').innerHTML = '<i class="fa-solid fa-check me-1"></i> Update Medicine';

  document.getElementById('med-name').value = med.medicineName || '';
  document.getElementById('med-dosage').value = med.dosage || '';
  document.getElementById('med-frequency').value = med.frequency || 'Once daily';
  document.getElementById('med-start-date').value = med.startDate ? new Date(med.startDate).toISOString().split('T')[0] : '';
  document.getElementById('med-end-date').value = med.endDate ? new Date(med.endDate).toISOString().split('T')[0] : '';
  document.getElementById('med-instructions').value = med.instructions || '';
  document.getElementById('med-status').value = med.status || 'Active';

  const modalEl = document.getElementById('medicineModal');
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function handleMedicineFormSubmit(e) {
  e.preventDefault();

  const medicineName = document.getElementById('med-name').value.trim();
  const dosage = document.getElementById('med-dosage').value.trim();
  const frequency = document.getElementById('med-frequency').value;
  const startDate = document.getElementById('med-start-date').value;
  const endDate = document.getElementById('med-end-date').value;
  const instructions = document.getElementById('med-instructions').value.trim();
  const status = document.getElementById('med-status').value;
  const btn = document.getElementById('save-medicine-btn');

  if (!medicineName || !dosage || !frequency || !endDate) {
    showToast('Please fill all required fields.', 'error');
    return;
  }

  try {
    btn.disabled = true;
    const payload = { medicineName, dosage, frequency, startDate, endDate, instructions, status };

    if (editingMedicineId) {
      await API.put(`/medicines/${editingMedicineId}`, payload);
      showToast('Medicine updated!', 'success');
    } else {
      await API.post('/medicines', payload);
      showToast('Medicine added!', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('medicineModal')).hide();
    await fetchMedicines();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteMedicine(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    const res = await API.delete(`/medicines/${id}`);
    showToast(res.message, 'success');
    await fetchMedicines();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
