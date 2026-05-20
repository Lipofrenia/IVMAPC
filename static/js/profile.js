// Элементы DOM
const modal = document.getElementById('profile-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeBtn = document.querySelector('.modal-close');
const cancelBtn = document.querySelector('.btn-cancel');
const photoInput = document.getElementById('modal-photo');
const photoPreview = document.getElementById('photo-preview');
const fileNameDisplay = document.getElementById('file-name');

// Функции модального окна
function openModal() {
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

// Обработка выбора фото
function handlePhotoSelection(event) {
  const file = event.target.files[0];
  
  if (file) {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      photoInput.value = '';
      fileNameDisplay.textContent = '';
      photoPreview.innerHTML = '';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 5MB');
      photoInput.value = '';
      fileNameDisplay.textContent = '';
      photoPreview.innerHTML = '';
      return;
    }
    
    fileNameDisplay.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  } else {
    fileNameDisplay.textContent = '';
    photoPreview.innerHTML = '';
  }
}

// Инициализация
function init() {
  // Обработчики
  if(settingsBtn) settingsBtn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if(photoInput) photoInput.addEventListener('change', handlePhotoSelection);
  
  if(modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
      closeModal();
    }
  });
}

// Запуск
document.addEventListener('DOMContentLoaded', init);