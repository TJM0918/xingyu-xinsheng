"use strict";

const mongoose = require("mongoose");
const config = require("./index");

async function connectDatabase(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (error) => {
    console.error("[mongo] connection error:", error.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });
  mongoose.connection.on("reconnected", () => {
    console.info("[mongo] reconnected");
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
  });

  console.info(`[mongo] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDatabase, disconnectDatabase };
