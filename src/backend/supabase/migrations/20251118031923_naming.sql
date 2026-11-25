-- Recreate the servers_view with updated table names
DROP VIEW IF EXISTS servers_inactive_for_while;
DROP VIEW IF EXISTS server_identity_orphans;
DROP VIEW IF EXISTS server_host_orphans;
DROP VIEW IF EXISTS servers_view;

-- Rename tables to plural form
ALTER TABLE server_identity RENAME TO server_identities;
ALTER TABLE server_host RENAME TO server_hosts;
ALTER TABLE server RENAME TO servers;
ALTER TABLE server_status RENAME TO server_statuses;

-- Update RLS policy names to match new table names
ALTER POLICY "[server] Enable read access for all users" ON servers RENAME TO "[servers] Enable read access for all users";
ALTER POLICY "[server_host] Enable read access for all users" ON server_hosts RENAME TO "[server_hosts] Enable read access for all users";
ALTER POLICY "[server_identity] Enable read access for all users" ON server_identities RENAME TO "[server_identities] Enable read access for all users";
ALTER POLICY "[server_status] Enable read access for all users" ON server_statuses RENAME TO "[server_statuses] Enable read access for all users";


CREATE VIEW v_server_summaries WITH (security_invoker = ON) AS
    WITH servers_all AS (
        SELECT 
            servers.uuid AS uuid,
            servers.protocol AS protocol,
            server_hosts.host AS host,
            server_identities.identity AS identity,
            server_identities.created_at AS created_at
        FROM 
            servers
        JOIN 
            server_hosts ON servers.host_uuid = server_hosts.uuid
        JOIN 
            server_identities ON servers.identity_uuid = server_identities.uuid
    ),
    latest_status AS (
        SELECT 
            server_uuid,
            country,
            status,
            created_at,
            info_page_available,
            ROW_NUMBER() OVER (PARTITION BY server_uuid ORDER BY created_at DESC) AS rn
        FROM 
            server_statuses
    ),
    uptime_data_7 AS (
        SELECT 
            server_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN status THEN 1 END) AS up_statuses
        FROM 
            server_statuses
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
            server_statuses
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
            server_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '90 days'
        GROUP BY 
            server_uuid
    )

    SELECT 
        servers_all.uuid AS uuid,
        servers_all.protocol AS protocol,
        servers_all.host AS host,
        servers_all.identity AS identity,
        servers_all.created_at AS created_at,
        latest_status.country AS country,
        latest_status.status AS status,
        latest_status.created_at AS last_check,
        latest_status.info_page_available as info_page_available,
        COALESCE(uptime_data_7.up_statuses::float / uptime_data_7.total_statuses, 0) AS uptime7,
        COALESCE(uptime_data_30.up_statuses::float / uptime_data_30.total_statuses, 0) AS uptime30,
        COALESCE(uptime_data_90.up_statuses::float / uptime_data_90.total_statuses, 0) AS uptime90
    FROM 
        servers_all
    LEFT JOIN
        latest_status ON servers_all.uuid = latest_status.server_uuid AND latest_status.rn = 1
    LEFT JOIN 
        uptime_data_7 ON servers_all.uuid = uptime_data_7.server_uuid
    LEFT JOIN 
        uptime_data_30 ON servers_all.uuid = uptime_data_30.server_uuid
    LEFT JOIN 
        uptime_data_90 ON servers_all.uuid = uptime_data_90.server_uuid;

-- Recreate dependent views with updated table names
CREATE VIEW v_inactive_servers WITH (security_invoker = ON) AS
SELECT * 
FROM v_server_summaries
WHERE created_at < NOW() - INTERVAL '90 days' 
AND uptime90 = 0;

CREATE VIEW v_orphaned_server_identities WITH (security_invoker = ON) AS
SELECT server_identities.* FROM server_identities LEFT JOIN servers ON server_identities.uuid = servers.identity_uuid WHERE servers.uuid IS NULL;

CREATE VIEW v_orphaned_server_hosts WITH (security_invoker = ON) AS
SELECT server_hosts.* FROM server_hosts LEFT JOIN servers ON server_hosts.uuid = servers.host_uuid WHERE servers.uuid IS NULL;