'use strict';

const path = require('path');
const loggingMiddlewarePath = path.join(__dirname, '..', '..', '..', 'logging-middleware');
const { createLoggingClient } = require(loggingMiddlewarePath);
const { getConfig } = require('./env');

function createAppLogger() {
  const config = getConfig();
  return createLoggingClient({
    authToken: config.authToken,
    baseUrl: config.logUrl,
    timeoutMs: config.timeoutMs,
    retries: config.retries,
  });
}

module.exports = {
  createAppLogger,
};
