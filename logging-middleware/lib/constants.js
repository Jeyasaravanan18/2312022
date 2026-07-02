'use strict';

const DEFAULT_LOG_ENDPOINT = process.env.EVALUATION_LOG_URL || 'http://4.224.186.213/evaluation-service/logs';

const ALLOWED_STACKS = Object.freeze(['backend', 'frontend']);
const ALLOWED_LEVELS = Object.freeze(['debug', 'info', 'warn', 'error', 'fatal']);

const ALLOWED_PACKAGES = Object.freeze({
  backend: Object.freeze(['auth', 'cache', 'config', 'controller', 'cron_job', 'db', 'domain', 'handler', 'middleware', 'repository', 'route', 'service', 'utils']),
  frontend: Object.freeze(['api', 'auth', 'component', 'config', 'hook', 'middleware', 'page', 'state', 'utils']),
});

const REQUEST_HEADER_ALLOWLIST = Object.freeze([
  'content-type',
  'user-agent',
  'x-request-id',
  'x-correlation-id',
  'x-forwarded-for',
  'x-real-ip',
]);

const RESPONSE_HEADER_ALLOWLIST = Object.freeze([
  'content-type',
  'content-length',
  'x-request-id',
  'x-correlation-id',
]);

module.exports = {
  DEFAULT_LOG_ENDPOINT,
  ALLOWED_STACKS,
  ALLOWED_LEVELS,
  ALLOWED_PACKAGES,
  REQUEST_HEADER_ALLOWLIST,
  RESPONSE_HEADER_ALLOWLIST,
};
