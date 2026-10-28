/**
 * WebSocket-сервер чата «Служба поддержки» IVMAPC.
 * Запуск: cd chat-server && npm install && npm start
 * Адрес:  ws://localhost:8080
 *
 * Протокол (JSON):
 *   клиент -> сервер:
 *     { type: "join",    name: "Иван" }          — вход в чат с именем
 *     { type: "message", text: "Привет" }        — сообщение
 *     { type: "typing",  isTyping: true|false }  — индикатор набора текста
 *   сервер -> клиент:
 *     { type: "welcome", id, name, online, users }       — подтверждение входа
 *     { type: "message", id, name, text, time }          — сообщение участника
 *     { type: "system",  text, time, online, users }     — сервисное сообщение
 *     { type: "typing",  id, name, isTyping }            — кто-то печатает
 */

const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.PORT) || 8080;
const MAX_NAME_LENGTH = 30;
const MAX_TEXT_LENGTH = 1000;

const wss = new WebSocketServer({ port: PORT });

let nextId = 1;

/** Отправить объект одному клиенту. */
function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/** Разослать объект всем вошедшим в чат клиентам (кроме except). */
function broadcast(payload, except = null) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== except && client.name && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

/** Количество пользователей, которые ввели имя и находятся в чате. */
function onlineCount() {
  return onlineUsers().length;
}

/** Имена всех пользователей в чате. */
function onlineUsers() {
  const names = [];
  for (const client of wss.clients) {
    if (client.name) names.push(client.name);
  }
  return names;
}

function now() {
  return new Date().toISOString();
}

wss.on("connection", (ws) => {
  ws.id = nextId++;
  ws.name = null; // имя появится после сообщения "join"

  // Heartbeat: клиент «жив», пока отвечает pong на наши ping
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return; // игнорируем некорректные данные
    }

    switch (data.type) {
      case "join": {
        if (ws.name) return; // повторный вход не нужен
        const name = String(data.name || "").trim().slice(0, MAX_NAME_LENGTH);
        ws.name = name || `Гость ${ws.id}`;

        send(ws, { type: "welcome", id: ws.id, name: ws.name, online: onlineCount(), users: onlineUsers() });
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

        broadcast({ type: "message", id: ws.id, name: ws.name, text, time: now() });
        console.log(`[msg] ${ws.name}: ${text}`);
        break;
      }

      case "typing": {
        if (!ws.name) return;
        // Пересылаем всем, кроме самого печатающего
        broadcast({ type: "typing", id: ws.id, name: ws.name, isTyping: Boolean(data.isTyping) }, ws);
        break;
      }
    }
  });

  ws.on("close", () => {
    if (!ws.name) return; // клиент так и не вошёл в чат
    broadcast({ type: "typing", id: ws.id, name: ws.name, isTyping: false });
    broadcast({
      type: "system",
      text: `Пользователь ${ws.name} покинул чат`,
      time: now(),
      online: onlineCount(),
      users: onlineUsers(),
    });
    console.log(`[-] ${ws.name} (id=${ws.id}) вышел. Онлайн: ${onlineCount()}`);
  });

  ws.on("error", (err) => console.error("Ошибка соединения:", err.message));
});

/**
 * Проверка «мёртвых» соединений.
 * Обычно при закрытии вкладки браузер сам закрывает WebSocket и сервер сразу
 * получает событие "close". Но если связь оборвалась без закрытия (сон ноутбука,
 * пропал интернет, браузер «убит»), сервер об этом не узнает. Поэтому каждые
 * 10 секунд шлём ping: кто не ответил pong с прошлой проверки — отключаем.
 * terminate() вызывает событие "close" → в чат уходит «Пользователь N покинул чат».
 */
const HEARTBEAT_INTERVAL = 10000;
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL);

wss.on("close", () => clearInterval(heartbeat));

console.log(`WebSocket-сервер чата поддержки запущен: ws://localhost:${PORT}`);

