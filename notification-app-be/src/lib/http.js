'use strict';

const { randomUUID } = require('crypto');

class AppError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function createAppError(statusCode, message, details) {
  return new AppError(statusCode, message, details);
}

function enhanceResponse(res) {
  if (typeof res.status !== 'function') {
    res.status = function status(code) {
      this.statusCode = code;
      return this;
    };
  }

  if (typeof res.json !== 'function') {
    res.json = function json(payload) {
      if (!this.headersSent) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      this.end(JSON.stringify(payload));
      return this;
    };
  }

  if (typeof res.send !== 'function') {
    res.send = function send(payload) {
      if (Buffer.isBuffer(payload) || typeof payload === 'string') {
        this.end(payload);
      } else {
        this.json(payload);
      }
      return this;
    };
  }

  return res;
}

function makeRequestId() {
  return randomUUID();
}

function sendSuccess(res, data, meta = undefined, statusCode = 200) {
  const body = { success: true, data };
  if (typeof meta !== 'undefined') body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendError(res, error) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Internal Server Error';
  const body = { success: false, error: { message } };
  if (error instanceof AppError && typeof error.details !== 'undefined') {
    body.error.details = error.details;
  }
  return res.status(statusCode).json(body);
}

module.exports = {
  AppError,
  createAppError,
  enhanceResponse,
  makeRequestId,
  sendSuccess,
  sendError,
};
