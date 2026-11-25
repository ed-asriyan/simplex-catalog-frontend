-- Simplify v_server_summaries to expose uuid references plus hourly uptime7/30/90.
-- v_inactive_servers depended ON the removed created_at column and has no consumers, so it is dropped.
DROP VIEW IF EXISTS v_inactive_servers;
DROP VIEW IF EXISTS v_server_summaries;

-- server_statuses had no index beyond its primary key, so every filter/lookup BY
-- server_uuid or created_at (the CTEs and the latest-status lookup below) was a full scan.
CREATE INDEX IF NOT EXISTS idx_server_statuses_server_uuid_created_at
    ON server_statuses (server_uuid, created_at DESC);

CREATE VIEW v_server_summaries
WITH (security_invoker = ON) AS
WITH
  -- created_at is timestamp without time zone, so bounds are built in that same naive space
  bounds AS (
    SELECT
      date_trunc('hour', now()::timestamp) + '1 hour'::interval AS window_end,
      date_trunc('hour', now()::timestamp) - '7 days'::interval AS start_7,
      date_trunc('hour', now()::timestamp) - '30 days'::interval AS start_30,
      date_trunc('hour', now()::timestamp) - '90 days'::interval AS start_90
  ),
  -- one row per hour that has checks, carrying the last check of that hour
  observed AS (
    SELECT DISTINCT ON (server_statuses.server_uuid, date_trunc('hour', server_statuses.created_at))
      server_statuses.server_uuid,
      date_trunc('hour', server_statuses.created_at) AS bucket,
      server_statuses.status
    FROM server_statuses, bounds
    WHERE server_statuses.created_at >= bounds.start_90
    ORDER BY
      server_statuses.server_uuid,
      date_trunc('hour', server_statuses.created_at),
      server_statuses.created_at DESC
  ),
  -- last status before the window, so hours at the start of the window inherit a real value
  seed AS (
    SELECT DISTINCT ON (server_statuses.server_uuid)
      server_statuses.server_uuid,
      date_trunc('hour', server_statuses.created_at) AS bucket,
      server_statuses.status
    FROM server_statuses, bounds
    WHERE server_statuses.created_at < bounds.start_90
    ORDER BY
      server_statuses.server_uuid,
      server_statuses.created_at DESC
  ),
  -- each observation holds until the next one, so an empty hour inherits the previous hour's status
  spans AS (
    SELECT
      hourly.server_uuid,
      hourly.bucket AS from_hour,
      COALESCE(
        lead(hourly.bucket) OVER (PARTITION BY hourly.server_uuid ORDER BY hourly.bucket),
        bounds.window_end
      ) AS to_hour,
      hourly.status
    FROM (
      SELECT server_uuid, bucket, status FROM observed
      UNION ALL
      SELECT server_uuid, bucket, status FROM seed
    ) hourly
    CROSS JOIN bounds
  ),
  -- how many whole hours of each window a span covers, once clipped to that window
  covered AS (
    SELECT
      spans.server_uuid,
      spans.status,
      GREATEST(0, EXTRACT(epoch FROM LEAST(spans.to_hour, bounds.window_end) - GREATEST(spans.from_hour, bounds.start_7)) / 3600) AS hours_7,
      GREATEST(0, EXTRACT(epoch FROM LEAST(spans.to_hour, bounds.window_end) - GREATEST(spans.from_hour, bounds.start_30)) / 3600) AS hours_30,
      GREATEST(0, EXTRACT(epoch FROM LEAST(spans.to_hour, bounds.window_end) - GREATEST(spans.from_hour, bounds.start_90)) / 3600) AS hours_90
    FROM spans, bounds
  ),
  uptime AS (
    SELECT
      covered.server_uuid,
      -- COALESCE keeps a server that was never up at 0 rather than NULL; only an empty denominator means "no data"
      (COALESCE(sum(covered.hours_7) FILTER (WHERE covered.status), 0) / nullif(sum(covered.hours_7), 0))::double precision AS uptime7,
      (COALESCE(sum(covered.hours_30) FILTER (WHERE covered.status), 0) / nullif(sum(covered.hours_30), 0))::double precision AS uptime30,
      (COALESCE(sum(covered.hours_90) FILTER (WHERE covered.status), 0) / nullif(sum(covered.hours_90), 0))::double precision AS uptime90
    FROM covered
    GROUP BY covered.server_uuid
  )
SELECT
  servers.uuid AS server_uuid,
  servers.host_uuid AS server_host_uuid,
  servers.identity_uuid AS server_identity_uuid,
  latest_status.uuid AS last_server_status_uuid,
  -- NULL (not 0) WHEN the server has no status rows at all — "no data" is not the same AS "always down"
  uptime.uptime7,
  uptime.uptime30,
  uptime.uptime90
FROM servers
  LEFT JOIN lateral (
    SELECT server_statuses.uuid
    FROM server_statuses
    WHERE server_statuses.server_uuid = servers.uuid
    ORDER BY server_statuses.created_at DESC
    LIMIT 1
  ) latest_status ON true
  LEFT JOIN uptime ON servers.uuid = uptime.server_uuid;
