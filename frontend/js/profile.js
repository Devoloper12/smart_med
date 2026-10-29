document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();

  document.getElementById('logout-profile-btn')?.addEventListener('click', () => {
    API.clearSession();
    showToast('Logged out.', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  });

  document.getElementById('save-pref-btn')?.addEventListener('click', () => {
    showToast('Preferences updated successfully.', 'success');
  });
});

function loadUserProfile() {
  const user = API.getUser();
  if (!user) return;

  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const inputName = document.getElementById('prof-input-name');
  const inputEmail = document.getElementById('prof-input-email');

  if (profName) profName.innerText = user.name || 'Caregiver';
  if (profEmail) profEmail.innerText = user.email || 'caregiver@example.com';
  if (inputName) inputName.value = user.name || 'Caregiver';
  if (inputEmail) inputEmail.value = user.email || 'caregiver@example.com';
}
