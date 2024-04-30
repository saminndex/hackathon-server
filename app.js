const express = require("express");
const { generate } = require("./ai");
const app = express();
const port = process.env.PORT || 3001;

if (process.env.NODE_ENV === "dev") {
  require("dotenv").config();
}

app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigins = ["https://the-infinite-story.netlify.app", "http://localhost:4200"];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

app.post("/ai/generate", generate);

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
