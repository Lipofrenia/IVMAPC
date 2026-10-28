/**
 * Клиент чата службы поддержки IVMAPC.
 * Подключается к WebSocket-серверу на Node.js (chat-server/server.js, порт 8080).
 */
(function () {
  "use strict";

  const TYPING_TIMEOUT = 2000; // индикатор исчезает через 2 с после окончания ввода

  const chatEl = document.getElementById("chat");
  const messagesEl = document.getElementById("chat-messages");
  const emptyEl = document.getElementById("chat-empty");
  const typingEl = document.getElementById("chat-typing");
  const formEl = document.getElementById("chat-form");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const statusEl = document.getElementById("chat-status");
  const statusDot = document.getElementById("chat-status-dot");
  const onlineEl = document.getElementById("chat-online");
  const meEl = document.getElementById("chat-me");
  const joinEl = document.getElementById("chat-join");
  const joinForm = document.getElementById("chat-join-form");
  const nameInput = document.getElementById("chat-name");
  const joinError = document.getElementById("chat-join-error");

  // Адрес сервера: из настроек Django или ws://<текущий хост>:8080
  const WS_URL = chatEl.dataset.wsUrl || `ws://${location.hostname || "localhost"}:8080`;

  let socket = null;
  let myId = null;
  let userName = "";
  let pageClosing = false; // страница закрывается — переподключаться не нужно

  // Кто сейчас печатает: id -> { name, timer }
  const typingUsers = new Map();

  // Состояние собственного набора текста
  let iAmTyping = false;
  let myTypingTimer = null;

  // ── Утилиты ────────────────────────────────────────────────

  function formatTime(iso) {
    const date = iso ? new Date(iso) : new Date();
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  function send(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusDot.classList.toggle("is-online", state === "online");
    statusDot.classList.toggle("is-connecting", state === "connecting");
  }

  function setInputEnabled(enabled) {
    inputEl.disabled = !enabled;
    sendBtn.disabled = !enabled;
    if (enabled) inputEl.focus();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideEmpty() {
    if (emptyEl) emptyEl.remove();
  }

  // ── Отрисовка сообщений ────────────────────────────────────
  // Текст вставляется через textContent — это защищает от XSS.

  function renderMessage(msg) {
    hideEmpty();
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";
    if (msg.id === myId) wrapper.classList.add("is-own");

    const meta = document.createElement("div");
    meta.className = "chat-message-meta";

    const name = document.createElement("span");
    name.className = "chat-message-name";
    name.textContent = msg.id === myId ? `${msg.name} (вы)` : msg.name;

    const time = document.createElement("time");
    time.className = "chat-message-time";
    time.dateTime = msg.time;
    time.textContent = formatTime(msg.time);

    const text = document.createElement("p");
    text.className = "chat-message-text";
    text.textContent = msg.text;

    meta.append(name, time);
    wrapper.append(meta, text);
    messagesEl.append(wrapper);
    scrollToBottom();
  }

  function renderSystem(text, iso) {
    hideEmpty();
    const el = document.createElement("div");
    el.className = "chat-system";
    el.textContent = text;

    const time = document.createElement("time");
    time.textContent = formatTime(iso);
    el.append(time);

    messagesEl.append(el);
    scrollToBottom();
  }

  function updateOnline(count, users) {
    if (typeof count !== "number") return;
    onlineEl.hidden = false;
    onlineEl.textContent = `Онлайн: ${count}`;
    // При наведении на счётчик показываем, кто именно в чате
    if (Array.isArray(users)) onlineEl.title = users.join("\n");
  }

  // ── Индикатор «Пользователь N печатает…» ───────────────────

  function renderTyping() {
    const names = Array.from(typingUsers.values()).map((u) => u.name);
    if (names.length === 0) {
      typingEl.textContent = "";
    } else if (names.length === 1) {
      typingEl.textContent = `Пользователь ${names[0]} печатает…`;
    } else {
      typingEl.textContent = `Пользователи ${names.join(", ")} печатают…`;
    }
  }

  function removeTyping(id) {
    const entry = typingUsers.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      typingUsers.delete(id);
      renderTyping();
    }
  }

  function handleTyping(data) {
    if (!data.isTyping) {
      removeTyping(data.id);
      return;
    }
    const prev = typingUsers.get(data.id);
    if (prev) clearTimeout(prev.timer);
    // Страховка: если сигнал «перестал печатать» не придёт, скрываем через 2 с
    const timer = setTimeout(() => removeTyping(data.id), TYPING_TIMEOUT);
    typingUsers.set(data.id, { name: data.name, timer });
    renderTyping();
  }

  // Вызывается при каждом вводе символа в поле сообщения
  function onUserInput() {
    if (!iAmTyping) {
      iAmTyping = true;
      send({ type: "typing", isTyping: true });
    }
    clearTimeout(myTypingTimer);
    myTypingTimer = setTimeout(stopTyping, TYPING_TIMEOUT);
  }

  function stopTyping() {
    clearTimeout(myTypingTimer);
    if (iAmTyping) {
      iAmTyping = false;
      send({ type: "typing", isTyping: false });
    }
  }

  // ── Работа с WebSocket ─────────────────────────────────────

  function connect() {
    setStatus("Подключение…", "connecting");
    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => {
      setStatus("Подключено", "online");
      send({ type: "join", name: userName });
    });

    socket.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case "welcome":
          myId = data.id;
          userName = data.name;
          meEl.hidden = false;
          meEl.textContent = `Вы: ${userName}`;
          updateOnline(data.online, data.users);
          setInputEnabled(true);
          break;
        case "message":
          removeTyping(data.id); // отправитель закончил печатать
          renderMessage(data);
          break;
        case "system":
          renderSystem(data.text, data.time);
          updateOnline(data.online, data.users);
          break;
        case "typing":
          if (data.id !== myId) handleTyping(data);
          break;
      }
    });

    socket.addEventListener("close", () => {
      if (pageClosing) return;
      setStatus("Соединение потеряно. Переподключение через 3 с…", "offline");
      setInputEnabled(false);
      typingUsers.forEach((u) => clearTimeout(u.timer));
      typingUsers.clear();
      renderTyping();
      iAmTyping = false;
      setTimeout(connect, 3000); // автоматическое переподключение
    });

    socket.addEventListener("error", () => {
      setStatus("Сервер чата недоступен (ws://…:8080)", "offline");
    });
  }

  // ── Обработчики интерфейса ─────────────────────────────────

  // Вход в чат: пользователь вводит имя
  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      joinError.textContent = "Введите имя";
      return;
    }
    userName = name;
    joinEl.hidden = true;
    connect();
  });

  // Отправка сообщения (кнопка «Отправить» или Enter — submit формы)
  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    send({ type: "message", text });
    stopTyping();
    inputEl.value = "";
    inputEl.focus();
  });

  inputEl.addEventListener("input", () => {
    if (inputEl.value.trim()) {
      onUserInput();
    } else {
      stopTyping();
    }
  });

  // Явная обработка Enter (Shift+Enter игнорируем)
  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formEl.requestSubmit();
    }
  });

  // Пользователь закрыл вкладку или ушёл на другую страницу сайта —
  // явно закрываем соединение, чтобы сервер сразу отправил «покинул чат».
  window.addEventListener("pagehide", () => {
    pageClosing = true;
    stopTyping();
    if (socket) socket.close(1000, "Страница закрыта");
  });

  // Возврат на страницу кнопкой «Назад» (страница восстановлена из кэша браузера)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && userName) {
      pageClosing = false;
      connect();
    }
  });

  // Авторизованный пользователь сайта входит сразу под своим логином,
  // гостю показываем форму ввода имени.
  const autoName = chatEl.dataset.autoName;
  if (autoName) {
    userName = autoName;
    joinEl.hidden = true;
    connect();
  } else {
    nameInput.focus();
  }
})();

