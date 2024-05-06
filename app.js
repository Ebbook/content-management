var express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { createClient } = require("redis");
require("dotenv").config();

let redisClient;

(async () => {
  redisClient = await createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  }).connect();
})();

const proxyReq = async (req, res) => {
  const key = req.path;

  try {
    let pageCount = await redisClient.get(key);
    if (!pageCount) pageCount = 0;
    await redisClient.set(key, Number(pageCount) + 1);
  } catch (err) {
    console.log(err);
  }
};

const apiProxy = createProxyMiddleware({
  target: process.env.PRISMIC_TARGET,
  changeOrigin: true,
  on: {
    proxyReq,
  },
});

var app = express();

app.get("/", (req, res) => {
  res.send("Server is running");
});
app.use("/api", apiProxy);

module.exports = app;

// dev build - 2251 prismic calls
// prod build -

//dev build times - 165
//prod build times - 19

// total dev calls = 2251 * 165 = 371415
// total prod calls = 32589 * 19 = 619191

// total prismic calls = 9,90,606
