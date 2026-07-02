'use strict';

const { createLoggingClient } = require('./client');
const { DEFAULT_LOG_ENDPOINT } = require('./constants');

function getEnvConfig(env = process.env) {
  return {
    baseUrl: env.EVALUATION_LOG_URL || DEFAULT_LOG_ENDPOINT,
    authToken: env.EVALUATION_ACCESS_TOKEN || '',
    timeoutMs: Number.isFinite(Number(env.EVALUATION_LOG_TIMEOUT_MS)) ? Number(env.EVALUATION_LOG_TIMEOUT_MS) : 8000,
    retries: Number.isFinite(Number(env.EVALUATION_LOG_RETRIES)) ? Number(env.EVALUATION_LOG_RETRIES) : 1,
  };
}

function createLoggerFromEnv(env = process.env) {
  return createLoggingClient(getEnvConfig(env));
}

module.exports = {
  getEnvConfig,
  createLoggerFromEnv,
};
