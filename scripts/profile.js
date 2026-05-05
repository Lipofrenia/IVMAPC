// Элементы DOM
const modal = document.getElementById('profile-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeBtn = document.querySelector('.modal-close');
const cancelBtn = document.querySelector('.btn-cancel');
const profileForm = document.getElementById('profile-form');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profilePhone = document.getElementById('profile-phone');
const profilePhoto = document.getElementById('profile-photo');
const orderContent = document.getElementById('order-content');
const ordersTab = document.getElementById('orders-tab');
const favoritesTab = document.getElementById('favorites-tab');
const photoInput = document.getElementById('modal-photo');
const photoPreview = document.getElementById('photo-preview');
const fileNameDisplay = document.getElementById('file-name');

// Поля формы
const nameInput = document.getElementById('modal-name');
const emailInput = document.getElementById('modal-email');
const phoneInput = document.getElementById('modal-phone');

// Состояние приложения
let currentTab = 'orders';
let selectedPhotoFile = null;

// Данные пользователя (в будущем будут приходить с сервера)
let userData = {
  id: 1,
  name: 'Username',
  email: 'bruhmail@mail.ru',
  phone: '+7 (800) 555-35-35',
  photoUrl: 'images/profile-photo.png'
};

// Функции валидации
const validators = {
  name: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Имя обязательно для заполнения';
    if (trimmed.length < 2) return 'Имя должно содержать минимум 2 символа';
    if (trimmed.length > 30) return 'Имя не должно превышать 30 символов';
    if (!/^[A-Za-zА-Яа-яЁё0-9\s]+$/.test(trimmed)) {
      return 'Имя может содержать только буквы, цифры и пробелы';
    }
    return null;
  },
  
  email: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email обязателен для заполнения';
    if (trimmed.length > 100) return 'Email не должен превышать 100 символов';
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Введите корректный email адрес';
    return null;
  },
  
  phone: (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 'Телефон обязателен для заполнения';
    if (digits.length !== 11) return 'Номер должен содержать 11 цифр';
    if (!digits.startsWith('7') && !digits.startsWith('8')) {
      return 'Номер должен начинаться с 7 или 8';
    }
    
    return null;
  }
};

function formatPhoneNumber(value) {
  let digits = value.replace(/\D/g, '');
  
  if (digits.length > 11) digits = digits.slice(0, 11);
  if (digits.length === 0) return '';
  
  let formatted = '';
  
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  
  if (digits.length >= 1) {
    formatted = '+7';
  }
  
  if (digits.length >= 2) {
    formatted += ` (${digits.slice(1, 4)}`;
  }
  
  if (digits.length >= 4) {
    formatted += `) ${digits.slice(4, 7)}`;
  }
  
  if (digits.length >= 7) {
    formatted += `-${digits.slice(7, 9)}`;
  }
  
  if (digits.length >= 9) {
    formatted += `-${digits.slice(9, 11)}`;
  }
  
  return formatted.trim();
}

function handlePhoneInput(e) {
  const cursorPos = e.target.selectionStart;
  const oldValue = e.target.value;
  const newValue = formatPhoneNumber(oldValue);
  
  if (oldValue !== newValue) {
    e.target.value = newValue;
    
    const newCursorPos = cursorPos + (newValue.length - oldValue.length);
    e.target.setSelectionRange(newCursorPos, newCursorPos);
  }
  
  validateField(phoneInput);
}

// Показать ошибку для поля
function showFieldError(input, errorMessage) {
  const formGroup = input.closest('.form-group');
  let errorHint = formGroup.querySelector('.error-hint');
  
  input.classList.add('error');
  
  if (!errorHint) {
    errorHint = document.createElement('div');
    errorHint.className = 'field-hint error-hint';
    formGroup.appendChild(errorHint);
  }
  
  errorHint.textContent = errorMessage;
  errorHint.style.color = '#ff4444';
}

function clearFieldError(input) {
  const formGroup = input.closest('.form-group');
  const errorHint = formGroup.querySelector('.error-hint');
  
  input.classList.remove('error');
  
  if (errorHint && !errorHint.classList.contains('persistent-hint')) {
    errorHint.remove();
  }
}

// Валидация конкретного поля
function validateField(field) {
  const value = field.value;
  let error = null;
  
  switch (field.id) {
    case 'modal-name':
      error = validators.name(value);
      break;
    case 'modal-email':
      error = validators.email(value);
      break;
    case 'modal-phone':
      const digits = value.replace(/\D/g, '');
      error = validators.phone(digits);
      break;
  }
  
  if (error) {
    showFieldError(field, error);
    return false;
  } else {
    clearFieldError(field);
    return true;
  }
}

function validateForm() {
  const isNameValid = validateField(nameInput);
  const isEmailValid = validateField(emailInput);
  const isPhoneValid = validateField(phoneInput);
  
  return isNameValid && isEmailValid && isPhoneValid;
}

// Функции модального окна
function openModal() {
  nameInput.value = userData.name;
  emailInput.value = userData.email;
  phoneInput.value = userData.phone;
  
  clearFieldError(nameInput);
  clearFieldError(emailInput);
  clearFieldError(phoneInput);
  
  photoInput.value = '';
  photoPreview.innerHTML = '';
  fileNameDisplay.textContent = '';
  selectedPhotoFile = null;
  
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
      showNotification('Пожалуйста, выберите изображение', 'error');
      photoInput.value = '';
      fileNameDisplay.textContent = '';
      photoPreview.innerHTML = '';
      selectedPhotoFile = null;
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Файл слишком большой. Максимум 5MB', 'error');
      photoInput.value = '';
      fileNameDisplay.textContent = '';
      photoPreview.innerHTML = '';
      selectedPhotoFile = null;
      return;
    }
    
    selectedPhotoFile = file;
    fileNameDisplay.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  } else {
    selectedPhotoFile = null;
    fileNameDisplay.textContent = '';
    photoPreview.innerHTML = '';
  }
}

function updateProfileDisplay() {
  profileName.textContent = userData.name;
  profileEmail.textContent = userData.email;
  profilePhone.textContent = userData.phone;
  
  if (userData.photoUrl) {
    profilePhoto.src = userData.photoUrl;
  }
}

// Сохранение профиля
async function saveProfile(event) {
  event.preventDefault();
  
  if (!validateForm()) {
    showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
    return;
  }
  
  const newName = nameInput.value.trim();
  const newEmail = emailInput.value.trim();
  const newPhone = phoneInput.value.trim();
  
  showNotification('Сохранение...', 'info');
  
  try {
    await mockSaveToServer(newName, newEmail, newPhone);
    updateProfileDisplay();
    closeModal();
    showNotification('Профиль успешно обновлен');
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    showNotification('Ошибка при сохранении профиля', 'error');
  }
}

// Имитация сохранения на сервер
function mockSaveToServer(name, email, phone) {
  return new Promise((resolve) => {
    setTimeout(() => {
      userData.name = name;
      userData.email = email;
      userData.phone = phone;
      
      if (selectedPhotoFile) {
        if (userData.photoUrl && userData.photoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(userData.photoUrl);
        }
        const mockPhotoUrl = URL.createObjectURL(selectedPhotoFile);
        userData.photoUrl = mockPhotoUrl;
      }
      
      resolve();
    }, 500);
  });
}

// Уведомления
function showNotification(message, type = 'success') {
  const oldNotification = document.querySelector('.notification-toast');
  if (oldNotification) oldNotification.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification-toast notification-${type}`;
  notification.textContent = message;
  
  if (type === 'error') {
    notification.style.backgroundColor = '#ff4444';
    notification.style.color = '#ffffff';
  } else if (type === 'info') {
    notification.style.backgroundColor = '#2a2a2a';
    notification.style.color = '#C0FF01';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Загрузка заказов
async function loadOrders() {
  try {
    const hasOrders = false;
    if (!hasOrders) {
      orderContent.innerHTML = '<p class="not-content">Вы пока ничего не заказали</p>';
    }
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    orderContent.innerHTML = '<p class="not-content">Ошибка загрузки заказов</p>';
  }
}

// Загрузка избранного
async function loadFavorites() {
  try {
    const hasFavorites = false;
    if (!hasFavorites) {
      orderContent.innerHTML = '<p class="not-content">Список избранного пуст</p>';
    }
  } catch (error) {
    console.error('Ошибка загрузки избранного:', error);
    orderContent.innerHTML = '<p class="not-content">Ошибка загрузки избранного</p>';
  }
}

// Переключение вкладок
function switchToOrders() {
  currentTab = 'orders';
  ordersTab.style.borderBottom = '2px solid #C0FF01';
  favoritesTab.style.borderBottom = '2px solid #2a2a2a';
  loadOrders();
}

function switchToFavorites() {
  currentTab = 'favorites';
  favoritesTab.style.borderBottom = '2px solid #C0FF01';
  ordersTab.style.borderBottom = '2px solid #2a2a2a';
  loadFavorites();
}

// Добавление стилей для уведомлений
function addNotificationStyles() {
  if (document.querySelector('#notification-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    .notification-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      padding: 12px 24px;
      border-radius: 40px;
      font-weight: 600;
      z-index: 1100;
      opacity: 0;
      transition: all 0.3s ease;
      white-space: nowrap;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    
    .notification-toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    
    @media (max-width: 700px) {
      .notification-toast {
        white-space: normal;
        max-width: 90%;
        text-align: center;
        font-size: 14px;
      }
    }
  `;
  document.head.appendChild(style);
}

// Настройка валидации в реальном времени
function setupLiveValidation() {
  nameInput.addEventListener('input', () => validateField(nameInput));
  nameInput.addEventListener('blur', () => validateField(nameInput));
  
  emailInput.addEventListener('input', () => validateField(emailInput));
  emailInput.addEventListener('blur', () => validateField(emailInput));
  
  phoneInput.addEventListener('input', handlePhoneInput);
  phoneInput.addEventListener('blur', () => validateField(phoneInput));
}

// Очистка blob URL при закрытии модалки
function cleanupBlobUrls() {
  if (userData.photoUrl && userData.photoUrl.startsWith('blob:')) {
    URL.revokeObjectURL(userData.photoUrl);
  }
}

// Инициализация
function init() {
  updateProfileDisplay();
  addNotificationStyles();
  loadOrders();
  setupLiveValidation();
  
  // Обработчики
  settingsBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', () => {
    closeModal();
    cleanupBlobUrls();
  });
  cancelBtn.addEventListener('click', () => {
    closeModal();
    cleanupBlobUrls();
  });
  profileForm.addEventListener('submit', saveProfile);
  photoInput.addEventListener('change', handlePhotoSelection);
  ordersTab.addEventListener('click', switchToOrders);
  favoritesTab.addEventListener('click', switchToFavorites);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
      cleanupBlobUrls();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
      cleanupBlobUrls();
    }
  });
}

// Запуск
document.addEventListener('DOMContentLoaded', init);