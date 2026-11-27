COMMENT ON TABLE server_identity IS 'Stores unique server identities (usernames, etc.).';
COMMENT ON COLUMN server_identity.uuid IS 'Primary key, unique identifier for the server identity.';
COMMENT ON COLUMN server_identity.identity IS 'The identity string (e.g., username).';
COMMENT ON COLUMN server_identity.created_at IS 'Timestamp when the identity was created.';

COMMENT ON TABLE server_host IS 'Stores unique server hosts.';
COMMENT ON COLUMN server_host.uuid IS 'Primary key, unique identifier for the server host.';
COMMENT ON COLUMN server_host.host IS 'The host string (domain or IP, possibly with port).';
COMMENT ON COLUMN server_host.created_at IS 'Timestamp when the host was created.';

COMMENT ON TABLE server IS 'Represents a unique server (protocol + host + identity).';
COMMENT ON COLUMN server.uuid IS 'Primary key, unique identifier for the server.';
COMMENT ON COLUMN server.protocol IS 'Protocol ID (1=smp, 2=xftp).';
COMMENT ON COLUMN server.host_uuid IS 'Foreign key to server_host.';
COMMENT ON COLUMN server.identity_uuid IS 'Foreign key to server_identity.';
COMMENT ON COLUMN server.created_at IS 'Timestamp when the server was created.';

COMMENT ON TABLE server_status IS 'Status checks for servers, including uptime and country.';
COMMENT ON COLUMN server_status.uuid IS 'Primary key, unique identifier for the server status entry.';
COMMENT ON COLUMN server_status.server_uuid IS 'Foreign key to server.';
COMMENT ON COLUMN server_status.status IS 'Boolean status (true=up, false=down).';
COMMENT ON COLUMN server_status.country IS 'Country code or name where the server is located.';
COMMENT ON COLUMN server_status.info_page_available IS 'Whether an info page is available for the server.';
COMMENT ON COLUMN server_status.created_at IS 'Timestamp when the status was recorded.';

CREATE VIEW servers_inactive_for_while WITH (security_invoker = ON) AS
SELECT * 
FROM servers_view 
WHERE created_at < NOW() - INTERVAL '90 days' 
AND uptime90 = 0;

CREATE VIEW server_identity_orphans WITH (security_invoker = ON) AS
SELECT server_identity.* FROM server_identity LEFT JOIN server ON server_identity.uuid = server.identity_uuid WHERE server.uuid IS NULL;

CREATE VIEW server_host_orphans WITH (security_invoker = ON) AS
SELECT server_host.* FROM server_host LEFT JOIN server ON server_host.uuid = server.host_uuid WHERE server.uuid IS NULL;

