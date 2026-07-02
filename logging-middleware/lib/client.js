'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { DEFAULT_LOG_ENDPOINT, ALLOWED_STACKS, ALLOWED_LEVELS, ALLOWED_PACKAGES } = require('./constants');

function normalizeBearer(token) {
  if (!token) return '';
  const trimmed = String(token).trim();
  return /^bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`;
}

function validateLogInput(stack, level, pkg, message) {
  if (!ALLOWED_STACKS.includes(stack)) {
    throw new Error(`Invalid stack "${stack}". Allowed values: ${ALLOWED_STACKS.join(', ')}`);
  }

  if (!ALLOWED_LEVELS.includes(level)) {
    throw new Error(`Invalid level "${level}". Allowed values: ${ALLOWED_LEVELS.join(', ')}`);
  }

  const allowedPackages = ALLOWED_PACKAGES[stack] || [];
  if (!allowedPackages.includes(pkg)) {
    throw new Error(`Invalid package "${pkg}" for stack "${stack}". Allowed values: ${allowedPackages.join(', ')}`);
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Message must be a non-empty string.');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(urlString, body, headers = {}, timeoutMs = 8000) {
  const url = new URL(urlString);
  const payload = JSON.stringify(body);
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (response) => {
        let responseText = '';
        response.setEncoding('utf8');

        response.on('data', (chunk) => {
          responseText += chunk;
        });

        response.on('end', () => {
          let parsed = responseText;
          try {
            parsed = responseText ? JSON.parse(responseText) : {};
          } catch {
            // Keep raw text when the API returns plain text or malformed JSON.
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ statusCode: response.statusCode, body: parsed });
            return;
          }

          const error = new Error(`Log API request failed with status ${response.statusCode}`);
          error.statusCode = response.statusCode;
          error.body = parsed;
          reject(error);
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Log API request timed out after ${timeoutMs}ms`));
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

class LoggingClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_LOG_ENDPOINT;
    this.authToken = options.authToken || process.env.EVALUATION_ACCESS_TOKEN || '';
    this.timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000;
    this.retries = Number.isFinite(options.retries) ? options.retries : 1;
  }

  setAuthToken(token) {
    this.authToken = typeof token === 'string' ? token.trim() : '';
    return this;
  }

  setBaseUrl(url) {
    this.baseUrl = url || DEFAULT_LOG_ENDPOINT;
    return this;
  }

  setTimeout(timeoutMs) {
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      this.timeoutMs = timeoutMs;
    }
    return this;
  }

  setRetries(retries) {
    if (Number.isFinite(retries) && retries >= 0) {
      this.retries = retries;
    }
    return this;
  }

  async log(stack, level, pkg, message, options = {}) {
    validateLogInput(stack, level, pkg, message);

    const body = {
      stack,
      level,
      package: pkg,
      message: message.trim(),
    };

    const headers = {};
    const bearer = normalizeBearer(options.authToken || this.authToken);
    if (bearer) {
      headers.Authorization = bearer;
    }

    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : this.timeoutMs;
    const maxAttempts = Number.isFinite(options.retries) ? options.retries + 1 : this.retries + 1;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await requestJson(options.baseUrl || this.baseUrl, body, headers, timeoutMs);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await sleep(250 * attempt);
        }
      }
    }

    throw lastError;
  }

  debug(pkg, message, stack = 'backend', options = {}) {
    return this.log(stack, 'debug', pkg, message, options);
  }

  info(pkg, message, stack = 'backend', options = {}) {
    return this.log(stack, 'info', pkg, message, options);
  }

  warn(pkg, message, stack = 'backend', options = {}) {
    return this.log(stack, 'warn', pkg, message, options);
  }

  error(pkg, message, stack = 'backend', options = {}) {
    return this.log(stack, 'error', pkg, message, options);
  }

  fatal(pkg, message, stack = 'backend', options = {}) {
    return this.log(stack, 'fatal', pkg, message, options);
  }
}

function createLoggingClient(options = {}) {
  return new LoggingClient(options);
}

module.exports = {
  LoggingClient,
  createLoggingClient,
  normalizeBearer,
  validateLogInput,
  requestJson,
};
