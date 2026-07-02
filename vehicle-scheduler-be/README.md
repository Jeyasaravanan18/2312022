# Vehicle Scheduler Backend

Stage 6 backend for the vehicle maintenance scheduling task.

## What it does

- fetches depots from the protected evaluation API
- fetches vehicles/tasks from the protected evaluation API
- computes the highest-impact maintenance plan per depot
- uses a 0/1 knapsack optimizer to maximize impact within mechanic hours
- logs major steps through the reusable logging middleware

## Run

```bash
cd vehicle-scheduler-be
npm start
```

## Endpoints

- `GET /health`
- `GET /api/v1/maintenance-plan`

## Environment

Copy `.env.example` to `.env` and set your access token.
