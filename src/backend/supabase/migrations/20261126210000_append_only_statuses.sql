-- A check is appended (design rule 3): no role the components use may change or delete a status.
-- service_role bypasses row level security, so only its privileges can stop it. Removing what has
-- been inactive for 90 days is the maintainer's, as postgres in the project, which keeps them.
REVOKE UPDATE, DELETE, TRUNCATE ON server_statuses, bot_statuses, relay_statuses FROM anon, authenticated, service_role;
