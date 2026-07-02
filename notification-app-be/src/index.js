'use strict';

const { createApp } = require('./server');

const { app, config, logger } = createApp();

const server = app.listen(config.port, config.host, async () => {
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : config.port;
  await logger.info('route', `notification priority inbox started on ${config.host}:${boundPort}`, 'backend').catch(() => {});
  process.stdout.write(`Notification Priority Inbox listening on http://${config.host}:${boundPort}\n`);
});

function shutdown(signal) {
  return async () => {
    await logger.warn('route', `received ${signal}, shutting down`, 'backend').catch(() => {});
    server.close(() => process.exit(0));
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

process.on('unhandledRejection', async (error) => {
  await logger.error('route', `unhandledRejection ${error.message}`, 'backend').catch(() => {});
});

process.on('uncaughtException', async (error) => {
  await logger.fatal('route', `uncaughtException ${error.message}`, 'backend').catch(() => {});
  process.exit(1);
});
