'use strict';

const http = require('http');
const { URL } = require('url');
const { getConfig } = require('./config/env');
const { createAppLogger } = require('./config/logger');
const { enhanceResponse, makeRequestId, sendError, createAppError } = require('./lib/http');
const { PriorityInboxService } = require('./services/priorityInboxService');
const { createPriorityInboxController } = require('./controllers/priorityInboxController');

function route(method, pathname) {
  if (method === 'GET' && (pathname === '/' || pathname === '/api/v1')) return { name: 'root' };
  if (method === 'GET' && pathname === '/health') return { name: 'health' };
  if (method === 'GET' && pathname === '/api/v1/priority-inbox') return { name: 'priorityInbox' };
  return null;
}

function createApp() {
  const config = getConfig();
  const logger = createAppLogger();
  const service = new PriorityInboxService({
    notificationUrl: config.notificationUrl,
    token: config.authToken,
    logger,
  });
  const controller = createPriorityInboxController(service, logger);

  const app = http.createServer(async (req, res) => {
    enhanceResponse(res);
    const requestId = makeRequestId();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());
      req.originalUrl = `${parsedUrl.pathname}${parsedUrl.search}`;
      const matched = route(req.method || 'GET', parsedUrl.pathname);

      if (!matched) {
        throw createAppError(404, 'Route not found');
      }

      switch (matched.name) {
        case 'root':
          return res.status(200).json({
            success: true,
            data: {
              name: config.appName,
              endpoints: ['/health', '/api/v1/priority-inbox'],
            },
          });
        case 'health':
          return controller.health(req, res, config);
        case 'priorityInbox':
          return controller.getPriorityInbox(req, res);
        default:
          throw createAppError(404, 'Route not found');
      }
    } catch (error) {
      await logger.error('handler', `request failed ${error.message}`, 'backend').catch(() => {});
      return sendError(res, error);
    }
  });

  return { app, config, logger };
}

module.exports = {
  createApp,
};
