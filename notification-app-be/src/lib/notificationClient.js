'use strict';

const { createAppError } = require('./http');

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
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
    throw createAppError(response.status, 'Failed to fetch notification feed', {
      status: response.status,
      body,
    });
  }

  return body;
}

async function fetchNotifications(url, token) {
  const headers = {};
  if (token) {
    headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  }

  return fetchJson(url, { headers });
}

function extractNotificationItems(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.notifications)) return payload.notifications;
  if (Array.isArray(payload.data?.notifications)) return payload.data.notifications;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  return [];
}

module.exports = {
  fetchJson,
  fetchNotifications,
  extractNotificationItems,
};
