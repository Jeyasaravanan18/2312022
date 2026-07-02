'use strict';

const { createAppError } = require('./http');

async function fetchJson(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      throw createAppError(response.status, 'Upstream request failed', {
        status: response.status,
        body,
      });
    }

    return body;
  } finally {
    clearTimeout(timer);
  }
}

function bearerHeader(token) {
  if (!token) return {};
  return {
    Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`,
  };
}

function extractArrayPayload(payload, candidates) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of candidates) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  if (payload.data && typeof payload.data === 'object') {
    for (const key of candidates) {
      const value = payload.data[key];
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

async function fetchDepots(url, token, timeoutMs) {
  return fetchJson(url, { headers: bearerHeader(token) }, timeoutMs);
}

async function fetchVehicles(url, token, timeoutMs) {
  return fetchJson(url, { headers: bearerHeader(token) }, timeoutMs);
}

module.exports = {
  fetchJson,
  bearerHeader,
  extractArrayPayload,
  fetchDepots,
  fetchVehicles,
};
