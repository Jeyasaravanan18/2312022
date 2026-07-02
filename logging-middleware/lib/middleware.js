'use strict';

const { REQUEST_HEADER_ALLOWLIST, RESPONSE_HEADER_ALLOWLIST } = require('./constants');

function toPlainObjectHeaders(headers = {}, allowlist = REQUEST_HEADER_ALLOWLIST) {
  const result = {};
  const allowed = new Set(allowlist.map((name) => String(name).toLowerCase()));

  for (const [key, value] of Object.entries(headers || {})) {
    if (!allowed.has(String(key).toLowerCase())) {
      continue;
    }

    if (typeof value === 'undefined') continue;
    result[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  return result;
}

function safeJson(value, limit = 4000) {
  if (typeof value === 'undefined') return undefined;

  try {
    const json = JSON.stringify(value);
    if (typeof json === 'string') {
      return json.length > limit ? `${json.slice(0, limit)}...<truncated>` : json;
    }
  } catch {
    // fall through
  }

  const text = String(value);
  return text.length > limit ? `${text.slice(0, limit)}...<truncated>` : text;
}

function createRequestLoggingMiddleware(options = {}) {
  const logger = options.logger;
  const stack = options.stack || 'backend';
  const packageName = options.packageName || 'middleware';
  const logRequestBody = options.logRequestBody !== false;
  const logResponseBody = Boolean(options.logResponseBody);
  const maskHeaders = options.maskHeaders !== false;
  const skip = typeof options.skip === 'function' ? options.skip : () => false;

  if (!logger || typeof logger.log !== 'function') {
    throw new Error('A valid logger instance is required.');
  }

  return function requestLogger(req, res, next) {
    if (skip(req, res)) {
      if (typeof next === 'function') next();
      return;
    }

    const start = Date.now();
    const requestHeaders = maskHeaders ? toPlainObjectHeaders(req.headers, REQUEST_HEADER_ALLOWLIST) : req.headers;
    const requestBody = logRequestBody ? safeJson(req.body) : undefined;

    logger.info(
      packageName,
      `request started ${req.method || 'GET'} ${req.originalUrl || req.url || '/'}`,
      stack,
      {
        metadata: {
          requestHeaders,
          requestBody,
        },
      }
    ).catch(() => {});

    const originalJson = res.json ? res.json.bind(res) : null;
    const originalSend = res.send ? res.send.bind(res) : null;
    let responsePayload;

    if (originalJson) {
      res.json = function patchedJson(payload) {
        responsePayload = payload;
        return originalJson(payload);
      };
    }

    if (originalSend) {
      res.send = function patchedSend(payload) {
        responsePayload = payload;
        return originalSend(payload);
      };
    }

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const status = res.statusCode || 200;
      const responseHeaders = maskHeaders ? toPlainObjectHeaders(res.getHeaders ? res.getHeaders() : {}, RESPONSE_HEADER_ALLOWLIST) : (res.getHeaders ? res.getHeaders() : {});
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      const message = `request completed ${req.method || 'GET'} ${req.originalUrl || req.url || '/'} ${status} in ${durationMs}ms`;

      logger[level](
        packageName,
        message,
        stack,
        {
          metadata: {
            statusCode: status,
            durationMs,
            responseHeaders,
            responseBody: logResponseBody ? safeJson(responsePayload) : undefined,
          },
        }
      ).catch(() => {});
    });

    res.on('close', () => {
      if (res.writableEnded) return;
      logger.warn(
        packageName,
        `request closed early ${req.method || 'GET'} ${req.originalUrl || req.url || '/'} after ${Date.now() - start}ms`,
        stack,
        {
          metadata: {
            aborted: true,
          },
        }
      ).catch(() => {});
    });

    if (typeof next === 'function') next();
  };
}

module.exports = {
  createRequestLoggingMiddleware,
  toPlainObjectHeaders,
  safeJson,
};
