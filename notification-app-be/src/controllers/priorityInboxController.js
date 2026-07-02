'use strict';

const { sendSuccess } = require('../lib/http');

function createPriorityInboxController(service, logger) {
  async function health(req, res, config) {
    await logger.info('route', 'health check ok', 'backend').catch(() => {});
    return sendSuccess(res, {
      status: 'ok',
      service: config.appName,
      timestamp: new Date().toISOString(),
    });
  }

  async function getPriorityInbox(req, res) {
    const limit = req.query?.limit;
    const result = await service.getPriorityInbox(limit);
    await logger.info('route', `priority inbox delivered count=${result.items.length}`, 'backend').catch(() => {});
    return sendSuccess(res, result);
  }

  return {
    health,
    getPriorityInbox,
  };
}

module.exports = {
  createPriorityInboxController,
};
