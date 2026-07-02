'use strict';

const fs = require('fs');
const path = require('path');

function parseDotEnv(text) {
  const result = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnvironment() {
  const candidates = [
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '..', '..', '.env'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const vars = parseDotEnv(fs.readFileSync(filePath, 'utf8'));
    for (const [key, value] of Object.entries(vars)) {
      if (typeof process.env[key] === 'undefined') {
        process.env[key] = value;
      }
    }
  }
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getConfig() {
  loadEnvironment();

  return Object.freeze({
    port: num(process.env.PORT, 3001),
    host: process.env.HOST || '127.0.0.1',
    appName: process.env.APP_NAME || 'vehicle-scheduler-be',
    nodeEnv: process.env.NODE_ENV || 'development',
    depotsUrl: process.env.EVALUATION_DEPOTS_URL || 'http://4.224.186.213/evaluation-service/depots',
    vehiclesUrl: process.env.EVALUATION_VEHICLES_URL || 'http://4.224.186.213/evaluation-service/vehicles',
    logUrl: process.env.EVALUATION_LOG_URL || 'http://4.224.186.213/evaluation-service/logs',
    authToken: process.env.EVALUATION_ACCESS_TOKEN || '',
    timeoutMs: num(process.env.EVALUATION_LOG_TIMEOUT_MS, 8000),
    retries: num(process.env.EVALUATION_LOG_RETRIES, 1),
    maxPlanSize: num(process.env.MAX_PLAN_SIZE, 10),
  });
}

module.exports = {
  parseDotEnv,
  loadEnvironment,
  getConfig,
};
