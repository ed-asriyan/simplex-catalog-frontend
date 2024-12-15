-- all servers
CREATE TABLE servers (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uri TEXT UNIQUE CHECK (uri ~* '^(smp|xftp)://.+@.+$'),
    created_at TIMESTAMP DEFAULT NOW(),
);

CREATE POLICY "[servers] Enable read access for all users"
ON servers
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[servers] Enable insert for all users"
ON servers
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  true
);


-- all servers statuses records. 1 row per server per check in time
CREATE TABLE servers_statuses (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_uuid UUID NOT NULL,
    info_page_available BOOLEAN,
    countries TEXT,
    status BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (server_uuid) REFERENCES servers (uuid) ON DELETE CASCADE
);

CREATE POLICY "[servers_statuses] Enable read access for all users"
ON servers_statuses
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);


-- all servers with the latest status. 1 row per server with its the latest status
CREATE VIEW servers_quick_view AS
    WITH latest_status AS (
        SELECT 
            server_uuid,
            countries,
            status,
            created_at,
            info_page_available,
            ROW_NUMBER() OVER (PARTITION BY server_uuid ORDER BY created_at DESC) AS rn
        FROM 
            servers_statuses
    ),
    uptime_data_7 AS (
        SELECT 
            server_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN status THEN 1 END) AS up_statuses
        FROM 
            servers_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '7 days'
        GROUP BY 
            server_uuid
    ),
    uptime_data_30 AS (
        SELECT 
            server_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN status THEN 1 END) AS up_statuses
        FROM 
            servers_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 
            server_uuid
    ),
    uptime_data_90 AS (
        SELECT 
            server_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN status THEN 1 END) AS up_statuses
        FROM 
            servers_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '90 days'
        GROUP BY 
            server_uuid
    )

    SELECT 
        servers.uuid AS uuid,
        servers.uri AS uri,
        latest_status.countries AS countries,
        latest_status.status AS status,
        latest_status.created_at AS last_check,
        latest_status.info_page_available as info_page_available,
        COALESCE(uptime_data_7.up_statuses::float / uptime_data_7.total_statuses, 0) AS uptime7,
        COALESCE(uptime_data_30.up_statuses::float / uptime_data_30.total_statuses, 0) AS uptime30,
        COALESCE(uptime_data_90.up_statuses::float / uptime_data_90.total_statuses, 0) AS uptime90
    FROM 
        servers
    LEFT JOIN
        latest_status ON servers.uuid = latest_status.server_uuid AND latest_status.rn = 1
    LEFT JOIN 
        uptime_data_7 ON servers.uuid = uptime_data_7.server_uuid
    LEFT JOIN 
        uptime_data_30 ON servers.uuid = uptime_data_30.server_uuid
    LEFT JOIN 
        uptime_data_90 ON servers.uuid = uptime_data_90.server_uuid;
