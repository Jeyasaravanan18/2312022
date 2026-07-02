'use strict';

const http = require('http');
const { URL } = require('url');
const { getConfig } = require('./config/env');
const { createAppLogger } = require('./config/logger');
const { enhanceResponse, makeRequestId, sendError, createAppError } = require('./lib/http');
const { MaintenancePlanner } = require('./services/maintenancePlanner');
const { createMaintenanceController } = require('./controllers/maintenanceController');

function route(method, pathname) {
  if (method === 'GET' && (pathname === '/' || pathname === '/api/v1')) return { name: 'root' };
  if (method === 'GET' && pathname === '/health') return { name: 'health' };
  if (method === 'GET' && pathname === '/api/v1/maintenance-plan') return { name: 'maintenancePlan' };
  return null;
}

function createApp() {
  const config = getConfig();
  const logger = createAppLogger();
  const service = new MaintenancePlanner({
    depotsUrl: config.depotsUrl,
    vehiclesUrl: config.vehiclesUrl,
    token: config.authToken,
    logger,
    timeoutMs: config.timeoutMs,
  });
  const controller = createMaintenanceController(service, logger);

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
              endpoints: ['/health', '/api/v1/maintenance-plan'],
            },
          });
        case 'health':
          return controller.health(req, res, config);
        case 'maintenancePlan':
          return controller.getMaintenancePlan(req, res);
        default:
          throw createAppError(404, 'Route not found');
      }
    } catch (error) {
      void logger.error('handler', `request failed ${error.message}`, 'backend').catch(() => {});
      return sendError(res, error);
    }
  });

  return { app, config, logger };
}

module.exports = {
  createApp,
};
