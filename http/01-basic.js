const http = require("http");

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  // routing
  if (req.url === "/") {
    res.writeHead(200);
    res.end("Привет! Это простой HTTP сервер на Node.js");
  } else if (req.url === "/api/hello") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        message: "Hello World!",
        time: new Date().toISOString(),
      })
    );
  } else if (req.url === "/api/users") {
    res.writeHead(200);
    res.end(
      JSON.stringify([
        { id: 1, name: "Анна" },
        { id: 2, name: "Борис" },
      ])
    );
  } else {
    res.writeHead(404);
    res.end("Страница не найдена");
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте: http://localhost:${PORT}`);
});
