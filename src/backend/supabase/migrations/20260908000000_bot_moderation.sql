ALTER TABLE bots
    ADD COLUMN approved BOOLEAN DEFAULT NULL;

UPDATE bots
SET approved = TRUE
WHERE approved IS NULL;

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_greeting_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "[bots] Enable read access for all users" ON bots;
DROP POLICY IF EXISTS "[bot_commands] Enable read access for all users" ON bot_commands;
DROP POLICY IF EXISTS "[bot_profiles] Enable read access for all users" ON bot_profiles;
DROP POLICY IF EXISTS "[bot_statuses] Enable read access for all users" ON bot_statuses;
DROP POLICY IF EXISTS "[bot_reply_messages] Enable read access for all users" ON bot_greeting_messages;
DROP POLICY IF EXISTS "[bot_greeting_messages] Enable read access for all users" ON bot_greeting_messages;
DROP POLICY IF EXISTS "[bot_command_reply_messages] Enable read access for all users" ON bot_command_reply_messages;

CREATE POLICY "[bots] Read approved bots"
ON bots
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (approved IS TRUE);

CREATE POLICY "[bot_profiles] Read profiles of approved bots"
ON bot_profiles
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM bots
        WHERE bots.uuid = bot_profiles.bot_uuid
          AND bots.approved IS TRUE
    )
);

CREATE POLICY "[bot_commands] Read commands of approved bots"
ON bot_commands
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM bot_profiles
        JOIN bots ON bots.uuid = bot_profiles.bot_uuid
        WHERE bot_profiles.uuid = bot_commands.bot_profile_uuid
          AND bots.approved IS TRUE
    )
);

CREATE POLICY "[bot_statuses] Read statuses of approved bots"
ON bot_statuses
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM bots
        WHERE bots.uuid = bot_statuses.bot_uuid
          AND bots.approved IS TRUE
    )
);

CREATE POLICY "[bot_greeting_messages] Read greetings of approved bots"
ON bot_greeting_messages
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM bots
        WHERE bots.uuid = bot_greeting_messages.bot_uuid
          AND bots.approved IS TRUE
    )
);

CREATE OR REPLACE VIEW v_bot_summaries
WITH (security_invoker = ON) AS
    WITH bots_all AS (
        SELECT
            bots.uuid AS uuid,
            bots.address AS address,
            bots.created_at AS created_at,
            bot_profiles.name AS name,
            bot_profiles.description AS description,
            bot_profiles.photo AS photo
        FROM bots
        JOIN bot_profiles ON bots.uuid = bot_profiles.bot_uuid
        WHERE bots.approved IS TRUE
    ),
    latest_status AS (
        SELECT
            bot_uuid,
            is_online,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY bot_uuid ORDER BY created_at DESC) AS rn
        FROM bot_statuses
    ),
    uptime_data_7 AS (
        SELECT bot_uuid, COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM bot_statuses
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY bot_uuid
    ),
    uptime_data_30 AS (
        SELECT bot_uuid, COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM bot_statuses
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY bot_uuid
    ),
    uptime_data_90 AS (
        SELECT bot_uuid, COUNT(*) AS total_statuses,
            COUNT(CASE WHEN is_online THEN 1 END) AS up_statuses
        FROM bot_statuses
        WHERE created_at >= NOW() - INTERVAL '90 days'
        GROUP BY bot_uuid
    )
    SELECT
        bots_all.uuid AS uuid,
        bots_all.address AS address,
        bots_all.created_at AS created_at,
        bots_all.photo AS photo,
        bots_all.name AS name,
        bots_all.description AS description,
        latest_status.is_online AS is_online,
        latest_status.created_at AS last_check,
        COALESCE(uptime_data_7.up_statuses::float / uptime_data_7.total_statuses, 0) AS uptime7,
        COALESCE(uptime_data_30.up_statuses::float / uptime_data_30.total_statuses, 0) AS uptime30,
        COALESCE(uptime_data_90.up_statuses::float / uptime_data_90.total_statuses, 0) AS uptime90
    FROM bots_all
    LEFT JOIN latest_status
        ON bots_all.uuid = latest_status.bot_uuid AND latest_status.rn = 1
    LEFT JOIN uptime_data_7 ON bots_all.uuid = uptime_data_7.bot_uuid
    LEFT JOIN uptime_data_30 ON bots_all.uuid = uptime_data_30.bot_uuid
    LEFT JOIN uptime_data_90 ON bots_all.uuid = uptime_data_90.bot_uuid;

GRANT SELECT ON v_bot_summaries, bots, bot_profiles, bot_commands,
    bot_statuses, bot_greeting_messages TO anon, authenticated;
GRANT SELECT ON bots TO service_role;
REVOKE INSERT, UPDATE, DELETE ON bots, bot_profiles, bot_commands,
    bot_statuses, bot_greeting_messages FROM anon, authenticated;
