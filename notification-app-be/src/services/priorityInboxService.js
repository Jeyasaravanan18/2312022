'use strict';

const { fetchNotifications, extractNotificationItems } = require('../lib/notificationClient');
const { rankNotifications } = require('../lib/priority');
const { createAppError } = require('../lib/http');

class PriorityInboxService {
  constructor({ notificationUrl, token, logger }) {
    this.notificationUrl = notificationUrl;
    this.token = token;
    this.logger = logger;
  }

  async safeLog(level, pkg, message) {
    try {
      await this.logger[level](pkg, message, 'backend');
    } catch {
      // Logging must never break the request flow.
    }
  }

  async getPriorityInbox(limit = 10) {
    const finalLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    await this.safeLog('info', 'service', `fetching notification feed limit=${finalLimit}`);

    const payload = await fetchNotifications(this.notificationUrl, this.token);
    const items = extractNotificationItems(payload);

    if (!Array.isArray(items)) {
      throw createAppError(502, 'Notification feed did not return a valid notification list');
    }

    const ranked = rankNotifications(items, finalLimit);
    await this.safeLog('info', 'service', `ranked notifications total=${ranked.total}`);

    return {
      limit: finalLimit,
      total: ranked.total,
      items: ranked.items,
    };
  }
}

module.exports = {
  PriorityInboxService,
};
