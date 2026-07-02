'use strict';

const { sendSuccess } = require('../lib/http');

function createMaintenanceController(service, logger) {
  async function health(req, res, config) {
    await logger.info('route', 'health check ok', 'backend').catch(() => {});
    return sendSuccess(res, {
      status: 'ok',
      service: config.appName,
      timestamp: new Date().toISOString(),
    });
  }

  async function getMaintenancePlan(req, res) {
    const limit = req.query?.limit;
    const result = await service.buildMaintenancePlan(limit);
    await logger.info('route', `maintenance plan delivered count=${result.plans.length}`, 'backend').catch(() => {});
    return sendSuccess(res, result);
  }

  return {
    health,
    getMaintenancePlan,
  };
}

module.exports = {
  createMaintenanceController,
};
