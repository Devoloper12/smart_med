let allPrescriptions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadPrescriptions();
  setupDropzone();

  document.getElementById('prescription-form')?.addEventListener('submit', handlePrescriptionUpload);
  if (document.getElementById('rx-date')) document.getElementById('rx-date').value = new Date().toISOString().split('T')[0];
});

function setupDropzone() {
  const dropzone = document.getElementById('rx-dropzone');
  const fileInput = document.getElementById('rx-file');
  const fileNameDisplay = document.getElementById('selected-file-name');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      fileNameDisplay.innerHTML = `Selected: <strong>${fileInput.files[0].name}</strong>`;
    }
  });
}

async function loadPrescriptions() {
  const container = document.getElementById('prescriptions-container');
  if (!container) return;

  try {
    const data = await API.get('/prescriptions');
    allPrescriptions = data.prescriptions || [];
    renderPrescriptions(allPrescriptions);
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center py-4 text-danger">Failed to load prescriptions: ${err.message}</div>`;
  }
}

function renderPrescriptions(prescriptions) {
  const container = document.getElementById('prescriptions-container');
  const countBadge = document.getElementById('prescriptions-count-badge');
  if (countBadge) countBadge.innerText = `${prescriptions.length} Document${prescriptions.length === 1 ? '' : 's'}`;
  if (!container) return;

  if (prescriptions.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="bg-white p-4 rounded-3 border">
          <i class="fa-solid fa-file-prescription fs-1 text-primary mb-3 opacity-50"></i>
          <h5>No Prescriptions Stored</h5>
          <p class="text-muted">Upload and safeguard digital prescriptions here.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = prescriptions.map(rx => {
    const rxDate = new Date(rx.prescriptionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const fullDownloadUrl = rx.fileUrl.startsWith('http') ? rx.fileUrl : `${API.baseURL.replace(/\/api\/?$/, '')}${rx.fileUrl}`;

    return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="prescription-card h-100 d-flex flex-column">
          <div class="prescription-icon-header">
            <i class="fa-solid fa-file-pdf text-danger"></i>
          </div>
          <div class="p-3 flex-grow-1">
            <h6 class="fw-bold text-truncate mb-1">${rx.originalName || 'Prescription'}</h6>
            <div class="small text-primary fw-medium mb-2"><i class="fa-solid fa-user-doctor me-1"></i>${rx.doctorName}</div>
            <div class="small text-muted"><i class="fa-regular fa-calendar me-1"></i>${rxDate}</div>
          </div>
          <div class="p-3 border-top bg-light bg-opacity-25 d-flex justify-content-between align-items-center">
            <a href="${fullDownloadUrl}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill">
              <i class="fa-regular fa-eye me-1"></i> View / Download
            </a>
            <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deletePrescription('${rx._id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handlePrescriptionUpload(e) {
  e.preventDefault();
  const fileInput = document.getElementById('rx-file');
  const doctorName = document.getElementById('rx-doctor').value.trim();
  const prescriptionDate = document.getElementById('rx-date').value;
  const notes = document.getElementById('rx-notes').value.trim();

  if (!fileInput.files || fileInput.files.length === 0) return showToast('Please select a file.', 'error');
  if (!doctorName) return showToast('Doctor name required.', 'error');

  const formData = new FormData();
  formData.append('prescriptionFile', fileInput.files[0]);
  formData.append('doctorName', doctorName);
  formData.append('prescriptionDate', prescriptionDate);
  formData.append('notes', notes);

  try {
    await API.upload('/prescriptions', formData);
    showToast('Prescription uploaded!', 'success');
    document.getElementById('prescription-form').reset();
    document.getElementById('selected-file-name').innerHTML = '';
    await loadPrescriptions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deletePrescription(id) {
  if (!confirm('Delete prescription?')) return;
  try {
    const res = await API.delete(`/prescriptions/${id}`);
    showToast(res.message, 'success');
    await loadPrescriptions();
  } catch (err) { showToast(err.message, 'error'); }
}
