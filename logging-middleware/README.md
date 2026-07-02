# Logging Middleware

Production-oriented logging package for the campus evaluation backend track.

## What it provides

- `Log(stack, level, package, message)` for direct event logging
- a reusable `LoggingClient` with timeout and retry support
- environment-based configuration
- an HTTP request logging middleware
- safe header allowlisting
- request and response lifecycle logging hooks
- convenience methods for severity-based logging

## Environment

Copy `.env.example` to your project env file and set:

```env
EVALUATION_ACCESS_TOKEN=your_access_token_here
EVALUATION_LOG_URL=http://4.224.186.213/evaluation-service/logs
EVALUATION_LOG_TIMEOUT_MS=8000
EVALUATION_LOG_RETRIES=1
```

## Direct usage

```js
const { Log, setAuthToken } = require('./logging-middleware');

setAuthToken(process.env.EVALUATION_ACCESS_TOKEN);

await Log('backend', 'info', 'service', 'service started');
await Log('backend', 'error', 'handler', 'failed to process request');
```

## Client usage

```js
const { createLoggingClient } = require('./logging-middleware');

const logger = createLoggingClient({
  authToken: process.env.EVALUATION_ACCESS_TOKEN,
  timeoutMs: 8000,
  retries: 1,
});

await logger.info('service', 'startup complete');
```

## Middleware usage

```js
const express = require('express');
const { createMiddleware, createLoggingClient } = require('./logging-middleware');

const app = express();
const logger = createLoggingClient({ authToken: process.env.EVALUATION_ACCESS_TOKEN });

app.use(express.json());
app.use(createMiddleware({ logger, stack: 'backend', packageName: 'middleware' }));
```

## Allowed values

- stack: `backend`, `frontend`
- level: `debug`, `info`, `warn`, `error`, `fatal`
- backend package: `auth`, `cache`, `config`, `controller`, `cron_job`, `db`, `domain`, `handler`, `middleware`, `repository`, `route`, `service`, `utils`
- frontend package: `api`, `auth`, `component`, `config`, `hook`, `middleware`, `page`, `state`, `utils`
