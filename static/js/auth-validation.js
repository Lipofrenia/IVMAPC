const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── Ошибки ───────────────────────────────────────────────────────────────────

function showError(input, message) {
  const wrapper = input.closest(".input");
  if (!wrapper) return;

  let errEl = wrapper.nextElementSibling;
  if (!errEl || !errEl.classList.contains("field-error")) {
    errEl = document.createElement("p");
    errEl.className = "field-error";
    wrapper.after(errEl);
  }

  if (errEl.textContent !== message) {
    errEl.classList.remove("field-error--visible");
    requestAnimationFrame(() => {
      errEl.textContent = message;
      errEl.classList.add("field-error--visible");
    });
  }

  wrapper.classList.add("input--error");
  input.setAttribute("aria-invalid", "true");
}

function clearError(input) {
  const wrapper = input.closest(".input");
  if (!wrapper) return;

  const errEl = wrapper.nextElementSibling;
  if (errEl && errEl.classList.contains("field-error")) {
    errEl.classList.remove("field-error--visible");
    errEl.textContent = "";
  }

  wrapper.classList.remove("input--error");
  input.removeAttribute("aria-invalid");
}

// ─── Валидаторы ───────────────────────────────────────────────────────────────

function isEmailValid(input) {
  const val = input.value.trim();
  if (!val) { showError(input, "Введите электронную почту"); return false; }
  if (!EMAIL_RE.test(val)) { showError(input, "Некорректный e-mail — например, user@mail.ru"); return false; }
  clearError(input);
  return true;
}

function isPasswordValid(input) {
  const val = input.value;
  if (!val) { showError(input, "Введите пароль"); return false; }
  if (val.length < 6) { showError(input, `Минимум 6 символов (сейчас ${val.length})`); return false; }
  clearError(input);
  return true;
}

function isMatchValid(passInput, confirmInput) {
  if (!confirmInput.value) { showError(confirmInput, "Подтвердите пароль"); return false; }
  if (passInput.value !== confirmInput.value) { showError(confirmInput, "Пароли не совпадают"); return false; }
  clearError(confirmInput);
  return true;
}

// ─── Кнопка: активна / неактивна ─────────────────────────────────────────────

function setButtonState(btn, enabled) {
  btn.disabled = !enabled;
  btn.classList.toggle("authorize--disabled", !enabled);
}

// ─── Авторизация ──────────────────────────────────────────────────────────────

function initLoginForm() {
  const emailInput = document.querySelector("#inp-email");
  const passInput  = document.querySelector("#inp-password");
  const btn        = document.querySelector(".authorize");
  if (!emailInput || !passInput || !btn) return;

  setButtonState(btn, false);

  function check() {
    const ok = EMAIL_RE.test(emailInput.value.trim()) && passInput.value.length >= 6;
    setButtonState(btn, ok);
  }

  emailInput.addEventListener("input", () => { clearError(emailInput); check(); });
  passInput.addEventListener("input",  () => { clearError(passInput);  check(); });

  emailInput.addEventListener("blur", () => { if (emailInput.value) isEmailValid(emailInput); });
  passInput.addEventListener("blur",  () => { if (passInput.value)  isPasswordValid(passInput); });

  btn.addEventListener("click", () => {
    if (isEmailValid(emailInput) && isPasswordValid(passInput)) {
      document.location = "profile.html";
    }
  });
}

// ─── Регистрация ──────────────────────────────────────────────────────────────

function initRegisterForm() {
  const emailInput   = document.querySelector("input[name='email']");
  const passInput    = document.querySelector("input[name='password']");
  const confirmInput = document.querySelector("input[name='password-confirm']");
  const btn          = document.querySelector(".authorize");
  if (!emailInput || !passInput || !confirmInput || !btn) return;

  setButtonState(btn, false);

  function check() {
    const ok =
      EMAIL_RE.test(emailInput.value.trim()) &&
      passInput.value.length >= 6 &&
      confirmInput.value === passInput.value;
    setButtonState(btn, ok);
  }

  emailInput.addEventListener("input",   () => { clearError(emailInput); check(); });
  passInput.addEventListener("input",    () => { clearError(passInput);  check(); if (confirmInput.value) isMatchValid(passInput, confirmInput); });
  confirmInput.addEventListener("input", () => { check(); if (confirmInput.value) isMatchValid(passInput, confirmInput); });

  emailInput.addEventListener("blur",   () => { if (emailInput.value)   isEmailValid(emailInput); });
  passInput.addEventListener("blur",    () => { if (passInput.value)    isPasswordValid(passInput); });
  confirmInput.addEventListener("blur", () => { if (confirmInput.value) isMatchValid(passInput, confirmInput); });

  btn.addEventListener("click", () => {
    // Используем & (не &&) чтобы все ошибки показались разом
    const ok = isEmailValid(emailInput) & isPasswordValid(passInput) & isMatchValid(passInput, confirmInput);
    if (ok) document.location = "profile.html";
  });
}

// ─── Восстановление пароля ────────────────────────────────────────────────────

function initForgotForm() {
  const contactInput = document.querySelector("input[name='contact']");
  const btn          = document.querySelector(".authorize");
  if (!contactInput || !btn) return;

  setButtonState(btn, false);

  contactInput.addEventListener("input", () => {
    clearError(contactInput);
    setButtonState(btn, EMAIL_RE.test(contactInput.value.trim()));
  });

  contactInput.addEventListener("blur", () => { if (contactInput.value) isEmailValid(contactInput); });

  btn.addEventListener("click", () => {
    if (isEmailValid(contactInput)) {
      btn.textContent = "Письмо отправлено ✓";
      btn.disabled = true;
      btn.classList.remove("authorize--disabled");
      btn.classList.add("authorize--sent");
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initRegisterForm();
  initForgotForm();
});