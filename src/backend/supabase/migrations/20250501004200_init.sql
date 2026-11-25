CREATE TABLE parse_queue (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uri TEXT UNIQUE CHECK (uri ~* '^(smp|xftp)://.+@.+$') NOT NULL,
    status INT8 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE server_identity (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE server_host (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE server (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol INT8 NOT NULL,
    host_uuid UUID NOT NULL,
    identity_uuid UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_host_identity UNIQUE (host_uuid, identity_uuid),
    CONSTRAINT fk_host FOREIGN KEY (host_uuid) REFERENCES server_host (uuid) ON DELETE CASCADE,
    CONSTRAINT fk_identity FOREIGN KEY (identity_uuid) REFERENCES server_identity (uuid) ON DELETE CASCADE
);

CREATE TABLE server_status (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_uuid UUID NOT NULL,
    status BOOLEAN NOT NULL,
    country TEXT NOT NULL,
    info_page_available BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_server FOREIGN KEY (server_uuid) REFERENCES server (uuid) ON DELETE CASCADE
);


CREATE POLICY "[server] Enable read access for all users"
ON server
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[server_host] Enable read access for all users"
ON server_host
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[server_identity] Enable read access for all users"
ON server_identity
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[server_status] Enable read access for all users"
ON server_status
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[parse_queue] Enable insert for all users"
ON parse_queue
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  true
);

-- all servers with the latest status. 1 row per server with its the latest status
CREATE VIEW servers_view WITH (security_invoker = ON) AS
    WITH servers_all AS (
        SELECT 
            server.uuid AS uuid,
            server.protocol AS protocol,
            server_host.host AS host,
            server_identity.identity AS identity,
            server_identity.created_at AS created_at
        FROM 
            server
        JOIN 
            server_host ON server.host_uuid = server_host.uuid
        JOIN 
            server_identity ON server.identity_uuid = server_identity.uuid
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
            server_status
    ),
    uptime_data_7 AS (
        SELECT 
            server_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN status THEN 1 END) AS up_statuses
        FROM 
            server_status
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
            server_status
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
            server_status
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


CREATE OR REPLACE FUNCTION process_parse_queue_insert()
RETURNS TRIGGER AS $$
DECLARE
    _protocol TEXT;
    _identity TEXT;
    _host TEXT;
    _host_uuid UUID;
    _identity_uuid UUID;
    _server_uuid UUID;
    _protocol_id INT8;
    _host_list TEXT[];
    _single_host TEXT;
BEGIN
    -- Extract protocol, identity, and hosts from the uri
    IF NEW.uri !~* '^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)\@([A-Za-z0-9.-]+(:\d{1,5})?(,[A-Za-z0-9.-]+(:\d{1,5})?)*)$' THEN
        NEW.status := 1; -- Invalid URI format
        RETURN NEW;
    END IF;

    -- Extract components using regex
    SELECT regexp_replace(NEW.uri, '^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)\@([A-Za-z0-9.-]+(:\d{1,5})?(,[A-Za-z0-9.-]+(:\d{1,5})?)*)$', '\1') INTO _protocol;
    SELECT regexp_replace(NEW.uri, '^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)\@([A-Za-z0-9.-]+(:\d{1,5})?(,[A-Za-z0-9.-]+(:\d{1,5})?)*)$', '\2') INTO _identity;
    SELECT regexp_replace(NEW.uri, '^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)\@([A-Za-z0-9.-]+(:\d{1,5})?(,[A-Za-z0-9.-]+(:\d{1,5})?)*)$', '\3') INTO _host;

    -- Assign protocol ID
    IF _protocol = 'smp' THEN
        _protocol_id := 1;
    ELSIF _protocol = 'xftp' THEN
        _protocol_id := 2;
    ELSE
        NEW.status := 2; -- Should never happen due to regex check
        RETURN NEW;
    END IF;

    -- Find or insert identity
    SELECT uuid INTO _identity_uuid FROM server_identity WHERE identity = _identity;
    IF _identity_uuid IS NULL THEN
        INSERT INTO server_identity (identity) VALUES (_identity) RETURNING uuid INTO _identity_uuid;
    END IF;

    -- Split hosts and process each
    _host_list := string_to_array(_host, ',');
    FOREACH _single_host IN ARRAY _host_list LOOP
        -- Find or insert host
        SELECT uuid INTO _host_uuid FROM server_host WHERE host = _single_host;
        IF _host_uuid IS NULL THEN
            INSERT INTO server_host (host) VALUES (_single_host) RETURNING uuid INTO _host_uuid;
        END IF;

        -- Find or insert server
        SELECT uuid INTO _server_uuid FROM server
        WHERE protocol = _protocol_id AND host_uuid = _host_uuid AND identity_uuid = _identity_uuid;

        IF _server_uuid IS NULL THEN
            INSERT INTO server (protocol, host_uuid, identity_uuid)
            VALUES (_protocol_id, _host_uuid, _identity_uuid);
        END IF;
    END LOOP;

    NEW.status := 0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER before_insert_parse_queue
BEFORE INSERT ON parse_queue
FOR EACH ROW EXECUTE FUNCTION process_parse_queue_insert();
