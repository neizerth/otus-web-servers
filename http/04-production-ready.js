const http = require("http");
const url = require("url");
const fs = require("fs");

// Конфигурация
const CONFIG = {
  PORT: process.env.PORT || 3003,
  LOG_FILE: "server.log",
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
};

// Простой логгер
const logger = {
  log: (level, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...data };
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
    fs.appendFileSync(CONFIG.LOG_FILE, JSON.stringify(logEntry) + "\n");
  },
  info: (msg, data) => logger.log("info", msg, data),
  warn: (msg, data) => logger.log("warn", msg, data),
  error: (msg, data) => logger.log("error", msg, data),
};

// Middleware для безопасности и CORS
const securityMiddleware = (req, res, next) => {
  if (req.headers["content-length"] > CONFIG.MAX_REQUEST_SIZE) {
    res.writeHead(413, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Request too large" }));
    return;
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  next();
};

// Middleware для парсинга JSON
const jsonParserMiddleware = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > CONFIG.MAX_REQUEST_SIZE) {
        req.destroy(new Error("Request too large"));
        return;
      }
    });
    req.on("end", () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        next();
      } catch (error) {
        logger.error("JSON parse error", { error: error.message });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON format" }));
      }
    });
  } else {
    next();
  }
};

// Middleware для логирования
const loggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  logger.info("Request started", { method: req.method, url: req.url });

  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;
    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
    originalEnd.call(this, chunk, encoding);
  };
  next();
};

// Роутер
const router = {
  GET: {
    "/": (req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <h1>🚀 Production-Ready HTTP Server</h1>
        <p>Компактная версия с основными функциями</p>
        <ul>
          <li><a href="/api/health">/api/health</a> - Проверка здоровья</li>
          <li><a href="/api/users">/api/users</a> - Пользователи</li>
          <li><a href="/api/error-test">/api/error-test</a> - Тест синхронных ошибок</li>
          <li><a href="/api/promise-error-test">/api/promise-error-test</a> - Тест ошибок в промисах</li>
        </ul>
      `);
    },
    "/api/health": (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        })
      );
    },
    "/api/users": (req, res) => {
      const users = [
        { id: 1, name: "Анна", email: "anna@example.com" },
        { id: 2, name: "Борис", email: "boris@example.com" },
      ];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ users, count: users.length }));
    },
    "/api/error-test": (req, res) => {
      throw new Error("Тестовая ошибка для проверки обработки исключений");
    },
    "/api/promise-error-test": (req, res) => {
      // Тест unhandledRejection - создаем промис который отклоняется
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error("Тестовая ошибка в промисе"));
        }, 100);
      });
      // Не обрабатываем ошибку - это вызовет unhandledRejection
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ message: "Промис с ошибкой создан, проверьте логи" })
      );
    },
  },
  POST: {
    "/api/users": (req, res) => {
      const { name, email } = req.body || {};
      if (!name || !email) {
        logger.warn("Validation failed", { body: req.body });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Name and email are required" }));
        return;
      }
      const newUser = {
        id: Date.now(),
        name,
        email,
        createdAt: new Date().toISOString(),
      };
      logger.info("User created", { userId: newUser.id, email });
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ message: "User created successfully", user: newUser })
      );
    },
  },
};

// Основной обработчик
const requestHandler = (req, res) => {
  const method = req.method;
  const path = url.parse(req.url).pathname;

  const middlewares = [
    securityMiddleware,
    loggingMiddleware,
    jsonParserMiddleware,
  ];
  let middlewareIndex = 0;

  const next = () => {
    if (middlewareIndex < middlewares.length) {
      middlewares[middlewareIndex++](req, res, next);
    } else {
      const handler = router[method]?.[path];
      if (handler) {
        try {
          handler(req, res);
        } catch (error) {
          logger.error("Handler error", {
            error: error.message,
            stack: error.stack,
          });
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      } else {
        logger.warn("Route not found", { method, path });
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Route not found", path }));
      }
    }
  };
  next();
};

// Создаем сервер
const server = http.createServer(requestHandler);

// Обработка ошибок HTTP сервера
server.on("error", (err) => {
  logger.error("Server error", { error: err.message, code: err.code });
  if (err.code === "EADDRINUSE") {
    logger.error("Port already in use", { port: CONFIG.PORT });
    process.exit(1); // Завершаем процесс если порт занят
  }
});

// Graceful shutdown - корректное завершение работы сервера
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0); // Успешное завершение
  });
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1); // Принудительное завершение с ошибкой
  }, 5000);
};

// SIGINT - сигнал прерывания (Ctrl+C в терминале)
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// SIGTERM - сигнал завершения (например, от systemd или Docker)
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// uncaughtException - необработанные исключения в синхронном коде
// Это критическая ошибка, которая может привести к нестабильности
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  setTimeout(() => process.exit(1), 1000); // Даем время на логирование
});

// unhandledRejection - необработанные отклонения промисов
// Это может указывать на проблемы с асинхронным кодом
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection", {
    reason: reason?.message || reason,
    promise: promise.toString(),
    stack: reason?.stack,
  });
});

// Запускаем сервер
server.listen(CONFIG.PORT, () => {
  logger.info("Server started", { port: CONFIG.PORT, pid: process.pid });
  console.log(`🚀 Production-Ready сервер запущен на порту ${CONFIG.PORT}`);
  console.log(`📱 Откройте: http://localhost:${CONFIG.PORT}`);
  console.log(`🔧 Health check: http://localhost:${CONFIG.PORT}/api/health`);
  console.log(`📝 Логи в файле: ${CONFIG.LOG_FILE}`);
});
