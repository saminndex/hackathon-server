const express = require("express");
const { generate } = require("./ai");
const app = express();
const port = process.env.PORT || 3001;

if (process.env.NODE_ENV === "dev") {
  require("dotenv").config();
}

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

app.post("/ai/generate", generate);

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
