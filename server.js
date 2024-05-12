import express from "express";
import axios from "axios";
import { config } from "dotenv";
import { createClient } from "redis";

config();

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

const app = express();
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

app.use("/api", async (req, res) => {
  const urlObj = new URL(process.env.PRISMIC_TARGET + req.originalUrl);

  try {
    const cacheResult = await fetchContentFromCache(urlObj);

    if (cacheResult) {
      return res.status(200).send(cacheResult);
    }

    const result = await fetchContentFromSource(urlObj);

    if (!result) {
      throw Error({ message: "Page not found" });
    }
    res.status(200).send(result);
  } catch (err) {
    res.status(404).send({ message: err.message || "Page not found" });
  }
});

app.use("/revalidate", async (req, res) => {
  const urlObj = new URL(process.env.PRISMIC_TARGET + req.url);

  try {
    const result = await fetchContentFromSource(urlObj);

    if (!result) {
      throw Error({ message: "Page not found" });
    }
    res.status(200).send(result);
  } catch (err) {
    res.status(404).send({ message: err.message || "Page not found" });
  }
});

const makeRedisKey = (urlObj) => {
  const searchParams = new URLSearchParams(urlObj.search);

  if (searchParams.has("ref")) {
    searchParams.delete("ref");
  }

  return urlObj.pathname + "?" + searchParams.toString();
};

export async function fetchContentFromSource(urlObj) {
  const response = await axios.get(urlObj.href);

  const key = makeRedisKey(urlObj);
  await redisClient.set(key, JSON.stringify(response.data));

  console.log("result from source");
  return response.data;
}

export async function fetchContentFromCache(urlObj) {
  const key = makeRedisKey(urlObj);

  const cacheResult = await redisClient.get(key);

  if (cacheResult) {
    console.log("result from cache");
    return JSON.parse(cacheResult);
  }
}
