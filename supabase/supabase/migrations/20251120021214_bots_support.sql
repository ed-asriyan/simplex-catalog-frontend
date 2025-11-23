CREATE TABLE bots (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (address)
);

CREATE TABLE bot_profiles (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_uuid UUID NOT NULL UNIQUE REFERENCES bots(uuid) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    photo TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bot_commands (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_profile_uuid UUID NOT NULL REFERENCES bot_profiles(uuid) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (bot_profile_uuid, keyword)
);

CREATE TABLE bot_reply_messages (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_uuid UUID NOT NULL UNIQUE REFERENCES bots(uuid) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bot_statuses (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_uuid UUID NOT NULL REFERENCES bots(uuid) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE POLICY "[bots] Enable read access for all users"
ON bots
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[bot_commands] Enable read access for all users"
ON bot_commands
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[bot_profiles] Enable read access for all users"
ON bot_profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[bot_statuses] Enable read access for all users"
ON bot_statuses
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE POLICY "[bot_reply_messages] Enable read access for all users"
ON bot_reply_messages
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);

CREATE VIEW v_bot_summaries WITH (security_invoker = ON) AS
    WITH bots_all AS (
        SELECT
            bots.uuid AS uuid,
            bots.address AS address,
            bots.created_at AS created_at,
            bot_profiles.name AS name,
            bot_profiles.description AS description,
            bot_profiles.photo AS photo
        FROM
            bots
        JOIN
            bot_profiles ON bots.uuid = bot_profiles.bot_uuid
    ),
    latest_status AS (
        SELECT
            bot_uuid,
            is_online,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY bot_uuid ORDER BY created_at DESC) AS rn
        FROM
            bot_statuses
    ),
    uptime_data_7 AS (
        SELECT 
            bot_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM 
            bot_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '7 days'
        GROUP BY 
            bot_uuid
    ),
    uptime_data_30 AS (
        SELECT 
            bot_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM 
            bot_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 
            bot_uuid
    ),
    uptime_data_90 AS (
        SELECT 
            bot_uuid,
            COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM 
            bot_statuses
        WHERE 
            created_at >= NOW() - INTERVAL '90 days'
        GROUP BY 
            bot_uuid
    )

    SELECT
        bots_all.uuid AS uuid,
        bots_all.address AS address,
        bots_all.created_at AS created_at,
        bots_all.photo AS photo,
        latest_status.is_online AS is_online,
        latest_status.created_at AS last_check,
        COALESCE(uptime_data_7.up_statuses::float / uptime_data_7.total_statuses, 0) AS uptime7,
        COALESCE(uptime_data_30.up_statuses::float / uptime_data_30.total_statuses, 0) AS uptime30,
        COALESCE(uptime_data_90.up_statuses::float / uptime_data_90.total_statuses, 0) AS uptime90
    FROM
        bots_all
    LEFT JOIN
        latest_status ON bots_all.uuid = latest_status.bot_uuid AND latest_status.rn = 1
    LEFT JOIN 
        uptime_data_7 ON bots_all.uuid = uptime_data_7.bot_uuid
    LEFT JOIN 
        uptime_data_30 ON bots_all.uuid = uptime_data_30.bot_uuid
    LEFT JOIN 
        uptime_data_90 ON bots_all.uuid = uptime_data_90.bot_uuid;
