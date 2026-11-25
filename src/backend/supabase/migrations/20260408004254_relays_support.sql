CREATE TABLE relays (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE relay_profiles (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relay_uuid UUID NOT NULL UNIQUE REFERENCES relays(uuid) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE relay_statuses (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relay_uuid UUID NOT NULL REFERENCES relays(uuid) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);



CREATE POLICY "[relays] Enable read access for all users"
ON relays
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[relay_profiles] Enable read access for all users"
ON relay_profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[relay_statuses] Enable read access for all users"
ON relay_statuses
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);


CREATE VIEW v_relays_summaries WITH (security_invoker = ON) AS
    WITH relays_all AS (
        SELECT
            relays.uuid AS uuid,
            relays.url AS url,
            relays.created_at AS created_at,
            relay_profiles.name AS name,
            relay_profiles.photo AS photo
        FROM
            relays
        JOIN
            relay_profiles ON relays.uuid = relay_profiles.relay_uuid
    ),
    latest_status AS (
        SELECT
            relay_uuid,
            is_online,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY relay_uuid ORDER BY created_at DESC) AS rn
        FROM
            relay_statuses
    ),
    uptime_data_7 AS (
        SELECT 
            relay_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM 
            relay_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '7 days'
        GROUP BY 
            relay_uuid
    ),
    uptime_data_30 AS (
        SELECT 
            relay_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM 
            relay_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 
            relay_uuid
    ),
    uptime_data_90 AS (
        SELECT 
            relay_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM 
            relay_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '90 days'
        GROUP BY 
            relay_uuid
    )

    SELECT
        relays_all.uuid AS uuid,
        relays_all.url AS url,
        relays_all.created_at AS created_at,
        relays_all.photo AS photo,
        relays_all.name AS name,
        latest_status.is_online AS is_online,
        latest_status.created_at AS last_check,
        COALESCE(uptime_data_7.up_statuses::float / uptime_data_7.total_statuses, 0) AS uptime7,
        COALESCE(uptime_data_30.up_statuses::float / uptime_data_30.total_statuses, 0) AS uptime30,
        COALESCE(uptime_data_90.up_statuses::float / uptime_data_90.total_statuses, 0) AS uptime90
    FROM
        relays_all
    LEFT JOIN
        latest_status ON relays_all.uuid = latest_status.relay_uuid AND latest_status.rn = 1
    LEFT JOIN 
        uptime_data_7 ON relays_all.uuid = uptime_data_7.relay_uuid
    LEFT JOIN 
        uptime_data_30 ON relays_all.uuid = uptime_data_30.relay_uuid
    LEFT JOIN 
        uptime_data_90 ON relays_all.uuid = uptime_data_90.relay_uuid;
