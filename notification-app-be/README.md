# Notification Priority Inbox

Stage 6 backend for the campus evaluation notification task.

## What it does

- fetches notifications from the provided protected Notification API
- filters unread items when possible
- ranks notifications by `placement > result > event`
- breaks ties by recency
- returns the top 10 priority notifications
- uses the reusable logging middleware for observability

## Run

```bash
cd notification-app-be
npm start
```

## Endpoints

- `GET /health`
- `GET /api/v1/priority-inbox`

## Environment

Copy `.env.example` to `.env` and set your access token.
