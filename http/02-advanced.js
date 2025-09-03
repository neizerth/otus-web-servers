const http = require("http");
const url = require("url");

// Middleware для логирования
const logger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
};

// Middleware для CORS
const cors = (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
};

// Middleware для парсинга JSON
const parseJson = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        req.body = JSON.parse(body);
        next();
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else {
    next();
  }
};

// Роутер
const router = {
  GET: {
    "/": (req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <h1>Продвинутый HTTP сервер</h1>
        <p>Доступные эндпоинты:</p>
        <ul>
          <li><a href="/api/status">/api/status</a> - Статус сервера</li>
          <li><a href="/api/users">/api/users</a> - Пользователи</li>
          <li><a href="/api/calc?x=5&y=3">/api/calc?x=5&y=3</a> - Калькулятор</li>
        </ul>
      `);
    },
    "/api/status": (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "running",
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        })
      );
    },
    "/api/users": (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify([
          { id: 1, name: "Анна", role: "admin" },
          { id: 2, name: "Борис", role: "user" },
        ])
      );
    },
    "/api/calc": (req, res) => {
      const { x, y } = url.parse(req.url, true).query;
      const numX = parseFloat(x) || 0;
      const numY = parseFloat(y) || 0;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          x: numX,
          y: numY,
          sum: numX + numY,
          diff: numX - numY,
          product: numX * numY,
          quotient: numY !== 0 ? numX / numY : "undefined",
        })
      );
    },
  },
  POST: {
    "/api/users": (req, res) => {
      const { name, email } = req.body || {};
      if (!name || !email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Name and email required" }));
        return;
      }

      const newUser = { id: Date.now(), name, email, createdAt: new Date() };
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "User created", user: newUser }));
    },
  },
};

// Основной обработчик
const requestHandler = (req, res) => {
  const method = req.method;
  const path = url.parse(req.url).pathname;

  // Применяем middleware
  let middlewareIndex = 0;
  const middlewares = [logger, cors, parseJson];

  const next = () => {
    if (middlewareIndex < middlewares.length) {
      middlewares[middlewareIndex++](req, res, next);
    } else {
      // Выполняем роутинг
      const handler = router[method]?.[path];
      if (handler) {
        handler(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found", path }));
      }
    }
  };

  next();
};

// Создаем сервер
const server = http.createServer(requestHandler);

// Запускаем
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Продвинутый сервер запущен на порту ${PORT}`);
  console.log(`📱 Откройте: http://localhost:${PORT}`);
});
