# Stage 1

## REST API Design

The notification platform should expose a small, predictable REST surface for client applications that need to render student notifications quickly and consistently.

### Core resources

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/:id`
- `GET /api/v1/priority-inbox?limit=10`
- `GET /health`

### Data shape

Each notification should at minimum contain:

- `id`
- `type` with values such as `event`, `result`, or `placement`
- `message`
- `timestamp`
- optional `studentId`
- optional `isRead`
- optional `metadata`

### Design principles

- Keep response shapes stable and explicit.
- Use lowercase, predictable field names in the API contract.
- Prefer pagination or limited top-N views for user inbox rendering.
- Keep the priority computation server-side so clients receive ready-to-render results.

### Priority inbox response

The priority inbox endpoint should return:

- the selected top notifications
- the ranking score used
- the applied limit
- metadata about total candidates and fetch time

This keeps the frontend simple and avoids duplicated ranking logic.

# Stage 2

## Database Choice

For a notification platform at moderate to large scale, PostgreSQL is a strong default choice because:

- it supports relational integrity
- it handles indexing well
- it supports flexible JSON metadata
- it is reliable for transactional writes
- it makes filtered and sorted inbox queries efficient

### Suggested schema

`students`

- `id` UUID primary key
- `roll_no` text unique
- `name` text
- `email` text unique
- `created_at` timestamp

`notifications`

- `id` UUID primary key
- `student_id` UUID foreign key
- `type` enum or text check constraint: `event`, `result`, `placement`
- `message` text
- `timestamp` timestamp
- `is_read` boolean default false
- `priority_weight` integer generated or stored
- `metadata` JSONB
- `created_at` timestamp
- `updated_at` timestamp

### Indexes

- `(student_id, is_read, timestamp DESC)`
- `(student_id, priority_weight DESC, timestamp DESC)`
- `(type, timestamp DESC)`

### Why this schema works

- inbox queries stay fast
- unread notifications can be filtered efficiently
- priority and recency sorting can use indexes
- JSONB allows extra event-specific fields without schema churn

### Scaling concerns

- Inbox reads can become far more common than writes.
- If notifications grow into millions of rows, read patterns must be optimized with proper indexes and selective projections.
- Partitioning by time may help if retention is long.
- Archived notifications should be moved out of the active read path.

# Stage 3

## Query Analysis

The query shown in the prompt is:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Accuracy

The query is logically valid if the column names exist and are indexed, but it is not optimal for a large notifications table because:

- `SELECT *` fetches more columns than needed
- the sort may be expensive without a composite index
- filtering on `studentID` and `isRead` needs an index aligned with the order by clause

### Likely performance issue

As the number of unread notifications grows, the database must scan more rows and sort more candidates.

### Better query

```sql
SELECT id, student_id, type, message, timestamp
FROM notifications
WHERE student_id = $1
  AND is_read = false
ORDER BY timestamp DESC
LIMIT 10;
```

### Recommended index

```sql
CREATE INDEX idx_notifications_student_read_ts
ON notifications (student_id, is_read, timestamp DESC);
```

### Why not index every column

Indexing every column is not effective because:

- it increases write cost
- it increases storage
- it does not necessarily match query patterns
- too many indexes slow down inserts and updates

### Query for placement notifications in last 7 days

```sql
SELECT id, student_id, type, message, timestamp
FROM notifications
WHERE type = 'placement'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

### Recommended index for this pattern

```sql
CREATE INDEX idx_notifications_type_timestamp
ON notifications (type, timestamp DESC);
```

# Stage 4

## Performance Strategy

If notifications are fetched on every page load, the DB can get overwhelmed. The main goals are:

- reduce repeated reads
- avoid fetching more data than necessary
- cache stable inbox results
- keep the client response small

### Suggested strategy

1. Cache the ranked inbox for a short TTL.
2. Use invalidation when a notification is read or a new one arrives.
3. Return only the top N notifications needed by the UI.
4. Fetch lightweight projection fields instead of full rows.
5. Paginate older notifications separately.

### Tradeoffs

- Caching improves response time but may show slightly stale data.
- Strong consistency lowers stale reads but increases database load.
- Short TTL caching is a good compromise for notification inboxes.

### Additional optimization

- materialized views for computed inbox summaries
- async precomputation for expensive ranking logic
- background refresh for popular inboxes

# Stage 5

## Notify-All Redesign

The naive implementation:

```text
for each student:
  send_email(student_id, message)
  save_to_db(student_id, message)
  push_to_app(student_id, message)
```

### Problems

- the loop is slow
- a single failure can block the whole operation
- duplicate sends are likely on retries
- DB writes and email sends should not be tightly coupled

### Better design

Use an event-driven pipeline:

1. Create a notification job record.
2. Persist the notification once.
3. Fan out delivery tasks asynchronously.
4. Use queues for email and push delivery.
5. Track per-channel delivery status.

### Revised pseudocode

```text
function notify_all(student_ids, message):
  job_id = create_notification_job(message)
  save_notification_batch(job_id, student_ids, message)
  enqueue_delivery_tasks(job_id, student_ids)
  return job_id
```

### Why this is better

- DB writes happen once
- delivery can retry independently
- the request returns faster
- failures are isolated to a single channel or recipient

### Reliability features

- idempotency keys
- retry with backoff
- dead-letter queue
- delivery status tracking
- observability logs for each stage

# Stage 6

## Priority Inbox Implementation

The implementation should fetch notifications from the provided protected Notification API, rank unread items, and return the top 10 most important entries.

### Priority rule

The weight order is:

1. `placement`
2. `result`
3. `event`

Then, within the same weight, sort by recency descending.

### Implementation notes

- use the provided evaluation API
- do not hard-code notification fixtures
- do not use a database for this stage
- keep the logic in code so it is easy to reason about and test

### Suggested output

Return:

- `limit`
- `total`
- `items`
- each item enriched with `priorityWeight` and `rank`

