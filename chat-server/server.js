/**
 * Защищённый WebSocket-сервер (WSS) чата «Служба поддержки» IVMAPC.
 * Запуск: cd chat-server && npm install && npm start
 * Адрес:  wss://localhost:8080 (самоподписанный TLS-сертификат в папке certs/)
 *
 * Реализованный функционал:
 *   1. Шифрование WSS (HTTPS + TLS с самоподписанным сертификатом).
 *   2. История последних 50 публичных сообщений в памяти сервера (отправляется при входе).
 *   3. Приватные сообщения командой /pm Имя текст.
 *   4. Список активных онлайн-пользователей (рассылается всем участникам).
 *   5. Проверка соединения Ping-Pong (ws.ping() / ws.on('pong')).
 *   6. Логирование кода и причины закрытия соединения в ws.on('close').
 */

const fs = require("fs");
const https = require("https");
const { WebSocketServer, WebSocket } = require("ws");
const { ensureCertificates } = require("./generate-cert");

const PORT = Number(process.env.PORT) || 8080;
const MAX_NAME_LENGTH = 30;
const MAX_TEXT_LENGTH = 1000;
const MAX_HISTORY = 50;
const HEARTBEAT_INTERVAL = 15000;

// 1. Подготавливаем самоподписанный сертификат и запускаем HTTPS-сервер для wss://
const { keyPath, certPath } = ensureCertificates();

const httpsServer = https.createServer(
  {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
  (req, res) => {
    // Страница подтверждения самоподписанного сертификата при открытии https://localhost:8080 в браузере
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>IVMAPC WSS — Сертификат подтверждён</title>
  <style>
    body { background:#121212; color:#fff; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { background:#181818; border:1px solid #2a2a2a; border-radius:20px; padding:32px; max-width:460px; text-align:center; }
    h2 { margin:0 0 12px; color:#C0FF01; }
    p { color:#b6b6b6; line-height:1.5; margin:0 0 20px; }
    button { background:#C0FF01; color:#000; border:none; border-radius:12px; padding:12px 24px; font-weight:600; cursor:pointer; font-size:15px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Сертификат принят!</h2>
    <p>Защищённый сервер чата <b>WSS (порт ${PORT})</b> работает.<br/>Вернитесь на вкладку чата — подключение установится автоматически.</p>
    <button onclick="window.close()">Закрыть вкладку</button>
  </div>
</body>
</html>`);
  }
);

const wss = new WebSocketServer({ server: httpsServer });

let nextId = 1;

// Хранилище последних 50 публичных сообщений в памяти сервера
const messageHistory = [];

function saveToHistory(message) {
  messageHistory.push(message);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift();
  }
}

/** Отправить JSON-пакет одному клиенту. */
function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/** Разослать JSON-пакет всем вошедшим в чат клиентам (кроме except). */
function broadcast(payload, except = null) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== except && client.name && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

/** Список уникальных имён активных участников чата. */
function onlineUsers() {
  const names = new Set();
  for (const client of wss.clients) {
    if (client.name && client.readyState === WebSocket.OPEN) {
      names.add(client.name);
    }
  }
  return Array.from(names);
}

/** Общее число активных участников в чате. */
function onlineCount() {
  return onlineUsers().length;
}

function now() {
  return new Date().toISOString();
}

/**
 * Разбор команды приватного сообщения: /pm Имя текст
 * Сначала проверяет точное совпадение с именами тех, кто онлайн (поддерживает имена с пробелом, например «Гость 1»),
 * а затем стандартное разбиение по первому слову.
 */
function parsePrivateCommand(rawText) {
  const body = rawText.slice(3).trim(); // всё после "/pm"
  if (!body) return null;

  const activeNames = onlineUsers().sort((a, b) => b.length - a.length);
  const lowerBody = body.toLowerCase();

  for (const candidate of activeNames) {
    const prefix = candidate.toLowerCase() + " ";
    if (lowerBody.startsWith(prefix)) {
      const msgText = body.slice(candidate.length).trim();
      if (msgText) {
        return { targetName: candidate, text: msgText };
      }
    }
  }

  const match = body.match(/^(\S+)\s+([\s\S]+)$/);
  if (!match) return null;
  return { targetName: match[1], text: match[2].trim() };
}

wss.on("connection", (ws) => {
  ws.id = nextId++;
  ws.name = null;

  // Ping-Pong для проверки живости соединения
  ws.isAlive = true;
  ws.on("pong", function () {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (data.type) {
      case "join": {
        if (ws.name) return;
        const name = String(data.name || "").trim().slice(0, MAX_NAME_LENGTH);
        ws.name = name || `Гость ${ws.id}`;

        // Отправляем новому участнику подтверждение входа, список онлайн и историю последних 50 сообщений
        send(ws, {
          type: "welcome",
          id: ws.id,
          name: ws.name,
          online: onlineCount(),
          users: onlineUsers(),
          history: messageHistory,
        });

        broadcast({
          type: "system",
          text: `Пользователь ${ws.name} вошёл в чат`,
          time: now(),
          online: onlineCount(),
          users: onlineUsers(),
        });
        console.log(`[+] ${ws.name} (id=${ws.id}) вошёл. Онлайн: ${onlineCount()}`);
        break;
      }

      case "message": {
        if (!ws.name) return;
        const text = String(data.text || "").trim().slice(0, MAX_TEXT_LENGTH);
        if (!text) return;

        // Проверка на команду приватного сообщения: /pm Имя текст
        if (/^\/pm(\s|$)/i.test(text)) {
          const parsed = parsePrivateCommand(text);
          if (!parsed || !parsed.text) {
            send(ws, {
              type: "system",
              text: "Формат личного сообщения: /pm Имя текст",
              time: now(),
            });
            return;
          }

          const targetLower = parsed.targetName.toLowerCase();
          const recipients = [];
          for (const client of wss.clients) {
            if (
              client.name &&
              client.readyState === WebSocket.OPEN &&
              client.name.toLowerCase() === targetLower
            ) {
              recipients.push(client);
            }
          }

          if (recipients.length === 0) {
            send(ws, {
              type: "system",
              text: `Пользователь «${parsed.targetName}» не найден в сети`,
              time: now(),
            });
            return;
          }

          if (recipients.every((c) => c === ws)) {
            send(ws, {
              type: "system",
              text: "Нельзя отправить личное сообщение самому себе",
              time: now(),
            });
            return;
          }

          const canonicalTo = recipients[0].name;
          const privatePayload = {
            type: "private",
            fromId: ws.id,
            from: ws.name,
            to: canonicalTo,
            text: parsed.text,
            time: now(),
          };

          // Отправляем отправителю и всем открытым вкладкам получателя (не сохраняя в общую историю)
          const targets = new Set([ws, ...recipients]);
          for (const targetClient of targets) {
            send(targetClient, privatePayload);
          }

          console.log(`[pm] ${ws.name} -> ${canonicalTo}: ${parsed.text}`);
          return;
        }

        // Обычное публичное сообщение: сохраняем в историю (до 50 шт.) и рассылаем всем
        const msgPayload = {
          type: "message",
          id: ws.id,
          name: ws.name,
          text,
          time: now(),
        };
        saveToHistory(msgPayload);
        broadcast(msgPayload);
        console.log(`[msg] ${ws.name}: ${text}`);
        break;
      }

      case "typing": {
        if (!ws.name) return;
        broadcast(
          { type: "typing", id: ws.id, name: ws.name, isTyping: Boolean(data.isTyping) },
          ws
        );
        break;
      }
    }
  });

  ws.on("close", function (code, reason) {
    console.log(`Клиент отключился. Код: ${code}, причина: ${reason}`);
    if (!ws.name) return;

    const leftName = ws.name;
    ws.name = null;

    broadcast({ type: "typing", id: ws.id, name: leftName, isTyping: false });
    broadcast({
      type: "system",
      text: `Пользователь ${leftName} покинул чат`,
      time: now(),
      online: onlineCount(),
      users: onlineUsers(),
    });
    console.log(`[-] ${leftName} (id=${ws.id}) вышел. Онлайн: ${onlineCount()}`);
  });

  ws.on("error", (err) => console.error("Ошибка соединения:", err.message));
});

// Периодическая проверка соединения с помощью ws.ping() и ws.on('pong')
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      console.log(`[ping] Клиент ${ws.name || ws.id} не ответил на pong — отключаем`);
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL);

wss.on("close", () => clearInterval(heartbeat));

httpsServer.listen(PORT, () => {
  console.log(`Защищённый WebSocket-сервер (WSS) запущен: wss://localhost:${PORT}`);
  console.log(
    `Для принятия самоподписанного сертификата в браузере откройте: https://127.0.0.1:${PORT} (или https://localhost:${PORT})`
  );
});
