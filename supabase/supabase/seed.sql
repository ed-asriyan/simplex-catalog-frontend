WITH
new_host AS (
    INSERT INTO server_hosts (host)
    VALUES ('smp1.asriyan.me')
    RETURNING uuid
),
new_identity AS (
    INSERT INTO server_identities (identity)
    VALUES ('64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E')
    RETURNING uuid
)
INSERT INTO servers (protocol, identity_uuid, host_uuid)
SELECT 1, ni.uuid, nh.uuid
FROM new_identity ni, new_host nh;

INSERT INTO bots (address) VALUES ('https://smp4.simplex.im/a#lXUjJW5vHYQzoLYgmi8GbxkGP41_kjefFvBrdwg-0Ok');
