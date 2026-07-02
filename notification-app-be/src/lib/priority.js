'use strict';

const PRIORITY_WEIGHT = Object.freeze({
  placement: 3,
  result: 2,
  event: 1,
});

function normalizeType(type) {
  return String(type || '').trim().toLowerCase();
}

function getPriorityWeight(notification) {
  const type = normalizeType(notification.type || notification.Type);
  return PRIORITY_WEIGHT[type] || 0;
}

function parseTimestamp(value) {
  if (!value) return 0;
  const raw = String(value).trim().replace(' ', 'T');
  const parsed = new Date(raw);
  const epoch = parsed.getTime();
  return Number.isFinite(epoch) ? epoch : 0;
}

function isUnreadNotification(notification) {
  const markers = [
    notification.isRead,
    notification.read,
    notification.seen,
    notification.readAt,
    notification.viewedAt,
  ];

  if (markers.some((value) => value === true)) return false;
  if (markers.some((value) => value === false)) return true;
  return true;
}

function rankNotifications(items, limit = 10) {
  const normalized = items
    .filter(Boolean)
    .filter(isUnreadNotification)
    .map((notification) => {
      const priorityWeight = getPriorityWeight(notification);
      const timestamp = notification.timestamp || notification.Timestamp || notification.createdAt || notification.CreatedAt || '';
      return {
        ...notification,
        type: normalizeType(notification.type || notification.Type),
        message: notification.message || notification.Message || '',
        timestamp,
        priorityWeight,
        priorityRank: priorityWeight,
        sortTimestamp: parseTimestamp(timestamp),
      };
    })
    .sort((a, b) => {
      if (b.priorityWeight !== a.priorityWeight) return b.priorityWeight - a.priorityWeight;
      if (b.sortTimestamp !== a.sortTimestamp) return b.sortTimestamp - a.sortTimestamp;
      return String(a.id || a.ID || '').localeCompare(String(b.id || b.ID || ''));
    })
    .slice(0, limit)
    .map((notification, index) => ({
      ...notification,
      rank: index + 1,
    }));

  return {
    items: normalized,
    total: normalized.length,
  };
}

module.exports = {
  PRIORITY_WEIGHT,
  normalizeType,
  getPriorityWeight,
  parseTimestamp,
  isUnreadNotification,
  rankNotifications,
};
