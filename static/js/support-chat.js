/**
 * Клиент чата службы поддержки IVMAPC.
 * Подключается по защищённому протоколу WSS к Node.js серверу (chat-server/server.js, порт 8080).
 *
 * Возможности:
 *   - Подключение по wss:// (с подсказкой принятия самоподписанного сертификата)
 *   - Получение истории последних 50 сообщений при входе
 *   - Публичные и приватные сообщения (/pm Имя текст или клик по имени в шапке)
 *   - Живой список активных онлайн-пользователей в шапке чата
 *   - Индикатор «Пользователь N печатает…» (гаснет через 2 с после окончания ввода)
 */
(function () {
  "use strict";

  const TYPING_TIMEOUT = 2000;

  const chatEl = document.getElementById("chat");
  const messagesEl = document.getElementById("chat-messages");
  const typingEl = document.getElementById("chat-typing");
  const formEl = document.getElementById("chat-form");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const statusEl = document.getElementById("chat-status");
  const statusDot = document.getElementById("chat-status-dot");
  const onlineEl = document.getElementById("chat-online");
  const meEl = document.getElementById("chat-me");
  const usersBarEl = document.getElementById("chat-users-bar");
  const usersListEl = document.getElementById("chat-users-list");
  const certBannerEl = document.getElementById("chat-cert-banner");
  const certLinkEl = document.getElementById("chat-cert-link");
  const joinEl = document.getElementById("chat-join");
  const joinForm = document.getElementById("chat-join-form");
  const nameInput = document.getElementById("chat-name");
  const joinError = document.getElementById("chat-join-error");

  // Защищённое соединение WSS по умолчанию: wss://<текущий хост>:8080
  const WS_URL = chatEl.dataset.wsUrl || `wss://${location.hostname || "localhost"}:8080`;
  const HTTPS_CERT_URL = WS_URL.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
  certLinkEl.href = HTTPS_CERT_URL;

  let socket = null;
  let myId = null;
  let userName = "";
  let pageClosing = false;
  let manualRename = false;
  let reconnectTimer = null;

  // Кто сейчас печатает: id -> { name, timer }
  const typingUsers = new Map();

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
    const empty = document.getElementById("chat-empty");
    if (empty) empty.remove();
  }

  function resetMessagesContainer() {
    messagesEl.innerHTML =
      '<p class="chat-empty" id="chat-empty">Сообщений пока нет. Напишите первым!</p>';
  }

  // ── Отрисовка сообщений (через textContent для защиты от XSS) ──

  function renderMessage(msg, isFromHistory = false) {
    hideEmpty();
    const isOwn = isFromHistory
      ? msg.name === userName
      : msg.id === myId || msg.name === userName;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";
    if (isOwn) wrapper.classList.add("is-own");

    const meta = document.createElement("div");
    meta.className = "chat-message-meta";

    const name = document.createElement("span");
    name.className = "chat-message-name";
    name.textContent = isOwn ? `${msg.name} (вы)` : msg.name;

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

  function renderPrivateMessage(msg) {
    hideEmpty();
    const isOwn = msg.fromId === myId || msg.from === userName;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message is-private";
    if (isOwn) wrapper.classList.add("is-own");

    const meta = document.createElement("div");
    meta.className = "chat-message-meta";

    const badge = document.createElement("span");
    badge.className = "chat-pm-badge";
    badge.textContent = "Лично";

    const name = document.createElement("span");
    name.className = "chat-message-name";
    name.textContent = isOwn ? `Вы → ${msg.to}` : `${msg.from} → Вам`;

    const time = document.createElement("time");
    time.className = "chat-message-time";
    time.dateTime = msg.time;
    time.textContent = formatTime(msg.time);

    const text = document.createElement("p");
    text.className = "chat-message-text";
    text.textContent = msg.text;

    meta.append(badge, name, time);
    wrapper.append(meta, text);
    messagesEl.append(wrapper);
    scrollToBottom();
  }

  function renderSystem(text, iso) {
    hideEmpty();
    const el = document.createElement("div");
    el.className = "chat-system";
    el.textContent = text;

    if (iso) {
      const time = document.createElement("time");
      time.textContent = formatTime(iso);
      el.append(time);
    }

    messagesEl.append(el);
    scrollToBottom();
  }

  // ── Список онлайн-пользователей в шапке ────────────────────

  function updateOnline(count, users) {
    if (typeof count === "number") {
      onlineEl.hidden = false;
      onlineEl.textContent = `Онлайн: ${count}`;
    }

    if (!Array.isArray(users)) return;

    usersListEl.innerHTML = "";
    if (users.length === 0) {
      usersBarEl.hidden = true;
      return;
    }

    usersBarEl.hidden = false;
    for (const uName of users) {
      const isMe = uName === userName;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chat-user-chip" + (isMe ? " is-me" : "");
      chip.textContent = isMe ? `${uName} (вы)` : uName;

      if (!isMe) {
        chip.title = `Написать личное сообщение пользователю ${uName}`;
        chip.addEventListener("click", () => {
          inputEl.value = `/pm ${uName} `;
          inputEl.focus();
        });
      }
      usersListEl.append(chip);
    }
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
    const timer = setTimeout(() => removeTyping(data.id), TYPING_TIMEOUT);
    typingUsers.set(data.id, { name: data.name, timer });
    renderTyping();
  }

  function onUserInput() {
    // Для личных команд (/pm ...) не рассылаем индикатор набора всем в общий чат
    if (/^\/pm(\s|$)/i.test(inputEl.value.trim())) {
      stopTyping();
      return;
    }
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

  // ── Работа с защищённым WebSocket (WSS) ────────────────────

  function connect() {
    clearTimeout(reconnectTimer);
    setStatus("Защищённое подключение (WSS)…", "connecting");
    socket = new WebSocket(WS_URL);

    let opened = false;

    socket.addEventListener("open", () => {
      opened = true;
      certBannerEl.hidden = true;
      setStatus("Подключено (шифрование WSS)", "online");
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
          meEl.textContent = `Вы: ${userName} ✎`;

          // Отрисовываем историю последних 50 сообщений с сервера
          resetMessagesContainer();
          if (Array.isArray(data.history) && data.history.length > 0) {
            for (const item of data.history) {
              renderMessage(item, true);
            }
            renderSystem(`Загружена история сообщений (${data.history.length})`);
          }

          updateOnline(data.online, data.users);
          setInputEnabled(true);
          break;

        case "message":
          removeTyping(data.id);
          renderMessage(data);
          break;

        case "private":
          removeTyping(data.fromId);
          renderPrivateMessage(data);
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
      if (pageClosing || manualRename) return;
      setStatus("Соединение потеряно. Переподключение через 3 с…", "offline");
      setInputEnabled(false);
      typingUsers.forEach((u) => clearTimeout(u.timer));
      typingUsers.clear();
      renderTyping();
      iAmTyping = false;
      reconnectTimer = setTimeout(connect, 3000);
    });

    socket.addEventListener("error", () => {
      if (!opened && WS_URL.toLowerCase().startsWith("wss://")) {
        certBannerEl.hidden = false;
      }
      setStatus(`Сервер недоступен или не принят сертификат (${WS_URL})`, "offline");
    });
  }

  // ── Обработчики интерфейса ─────────────────────────────────

  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      joinError.textContent = "Введите имя";
      return;
    }
    joinError.textContent = "";
    manualRename = false;
    userName = name;
    joinEl.hidden = true;
    connect();
  });

  // Смена имени по клику на «Вы: Имя ✎» (удобно при проверке в нескольких вкладках)
  meEl.addEventListener("click", () => {
    manualRename = true;
    clearTimeout(reconnectTimer);
    stopTyping();
    if (socket) socket.close(1000, "Смена имени");
    setInputEnabled(false);
    setStatus("Не подключено", "offline");
    usersBarEl.hidden = true;
    onlineEl.hidden = true;
    meEl.hidden = true;
    nameInput.value = userName;
    joinEl.hidden = false;
    nameInput.focus();
    nameInput.select();
  });

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

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formEl.requestSubmit();
    }
  });

  window.addEventListener("pagehide", () => {
    pageClosing = true;
    clearTimeout(reconnectTimer);
    stopTyping();
    if (socket) socket.close(1000, "Страница закрыта");
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted && userName) {
      pageClosing = false;
      connect();
    }
  });

  const autoName = chatEl.dataset.autoName;
  if (autoName) {
    userName = autoName;
    joinEl.hidden = true;
    connect();
  } else {
    nameInput.focus();
  }
})();
