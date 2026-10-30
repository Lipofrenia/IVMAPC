/**
 * Генерация самоподписанного SSL/TLS-сертификата для WSS-сервера чата (порт 8080).
 * Создаёт файлы certs/key.pem и certs/cert.pem с поддержкой localhost и 127.0.0.1.
 * Запуск вручную: npm run cert (также вызывается автоматически при старте server.js, если сертификатов ещё нет).
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const certsDir = path.join(__dirname, "certs");
const keyPath = path.join(certsDir, "key.pem");
const certPath = path.join(certsDir, "cert.pem");
const cnfPath = path.join(certsDir, "openssl.cnf");

const OPENSSL_CONFIG = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Orel
L = Orel
O = IVMAPC Support Chat
CN = localhost

[v3_req]
basicConstraints = CA:TRUE
keyUsage = digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

function findOpenSSL() {
  const candidates = [
    "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
    "openssl",
  ];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["version"], { stdio: "ignore" });
      return bin;
    } catch {
      // пробуем следующий вариант
    }
  }
  throw new Error(
    "Утилита OpenSSL не найдена. Установите Git for Windows или OpenSSL для генерации сертификата."
  );
}

function ensureCertificates(force = false) {
  if (!force && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return { keyPath, certPath };
  }

  fs.mkdirSync(certsDir, { recursive: true });
  fs.writeFileSync(cnfPath, OPENSSL_CONFIG, "utf8");

  const openssl = findOpenSSL();
  execFileSync(
    openssl,
    [
      "req",
      "-x509",
      "-nodes",
      "-days",
      "365",
      "-newkey",
      "rsa:2048",
      "-sha256",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-config",
      cnfPath,
      "-extensions",
      "v3_req",
    ],
    { stdio: "pipe" }
  );

  try {
    fs.unlinkSync(cnfPath);
  } catch {
    // игнорируем, если временный конфиг уже удалён
  }

  console.log(`[cert] Самоподписанный TLS-сертификат создан: ${certPath}`);
  return { keyPath, certPath };
}

if (require.main === module) {
  ensureCertificates(true);
}

module.exports = { ensureCertificates };

