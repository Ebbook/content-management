var express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { createClient } = require("redis");

let redisClient;

(async () => {
  redisClient = await createClient({
    password: "pWlixZe53HMj4O3DWyzB2pjpG9X2LIdh",
    socket: {
      host: "redis-18064.c93.us-east-1-3.ec2.redns.redis-cloud.com",
      port: 18064,
    },
  }).connect();
})();

const proxyReq = async (req, res) => {
  const key = req.path;

  let pageCount = await redisClient.get(key);
  if (!pageCount) pageCount = 0;
  await redisClient.set(key, Number(pageCount) + 1);
};

const apiProxy = createProxyMiddleware({
  target: "https://indiahike.cdn.prismic.io/api/",
  changeOrigin: true,
  on: {
    proxyReq,
  },
});

var app = express();

app.use("/api", apiProxy);

module.exports = app;

// dev build - 2251 prismic calls
// prod build -

//dev build times - 165
//prod build times - 19

// total dev calls = 2251 * 165 = 371415
// total prod calls = 32589 * 19 = 619191

// total prismic calls = 9,90,606
