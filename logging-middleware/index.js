'use strict';

const { LoggingClient, createLoggingClient, normalizeBearer, validateLogInput } = require('./lib/client');
const {
  DEFAULT_LOG_ENDPOINT,
  ALLOWED_STACKS,
  ALLOWED_LEVELS,
  ALLOWED_PACKAGES,
  REQUEST_HEADER_ALLOWLIST,
  RESPONSE_HEADER_ALLOWLIST,
} = require('./lib/constants');
const { createRequestLoggingMiddleware } = require('./lib/middleware');
const { createLoggerFromEnv, getEnvConfig } = require('./lib/env');

let defaultClient = createLoggerFromEnv();

function configure(options = {}) {
  defaultClient = createLoggingClient(options);
  return defaultClient;
}

function setAuthToken(token) {
  defaultClient.setAuthToken(token);
  return defaultClient;
}

function setBaseUrl(url) {
  defaultClient.setBaseUrl(url);
  return defaultClient;
}

function setTimeout(timeoutMs) {
  defaultClient.setTimeout(timeoutMs);
  return defaultClient;
}

function setRetries(retries) {
  defaultClient.setRetries(retries);
  return defaultClient;
}

function Log(stack, level, pkg, message, options = {}) {
  return defaultClient.log(stack, level, pkg, message, options);
}

function createHttpLogger(defaultStack = 'backend', defaultPackage = 'middleware') {
  return function logHttpEvent(level, message, stack = defaultStack, pkg = defaultPackage, options = {}) {
    return Log(stack, level, pkg, message, options);
  };
}

function createMiddleware(options = {}) {
  return createRequestLoggingMiddleware({
    logger: options.logger || defaultClient,
    stack: options.stack || 'backend',
    packageName: options.packageName || 'middleware',
    logRequestBody: options.logRequestBody,
    logResponseBody: options.logResponseBody,
    maskHeaders: options.maskHeaders,
    skip: options.skip,
  });
}

module.exports = {
  DEFAULT_LOG_ENDPOINT,
  ALLOWED_STACKS,
  ALLOWED_LEVELS,
  ALLOWED_PACKAGES,
  REQUEST_HEADER_ALLOWLIST,
  RESPONSE_HEADER_ALLOWLIST,
  LoggingClient,
  createLoggingClient,
  createLoggerFromEnv,
  getEnvConfig,
  normalizeBearer,
  validateLogInput,
  configure,
  setAuthToken,
  setBaseUrl,
  setTimeout,
  setRetries,
  Log,
  createHttpLogger,
  createRequestLoggingMiddleware,
  createMiddleware,
};
