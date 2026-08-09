TRUNCATE TABLE servers, server_identities, server_hosts, bots, relays CASCADE;

-- ===============
-- SERVERS
-- ===============

-- Hosts
INSERT INTO server_hosts (uuid, host, created_at) VALUES
('11111111-1111-1111-1111-100000000001', 'smp1.asriyan.me', NOW() - INTERVAL '100 days'),
('11111111-1111-1111-1111-100000000002', 'smp2.example.com', NOW() - INTERVAL '2 days'),
('11111111-1111-1111-1111-100000000003', 'xftp.example.com', NOW() - INTERVAL '50 days'),
('11111111-1111-1111-1111-100000000004', 'dead.server.xyz', NOW() - INTERVAL '120 days'),
('11111111-1111-1111-1111-100000000005', 'statusless.server.xyz', NOW() - INTERVAL '1 day');

-- Identities
INSERT INTO server_identities (uuid, identity, created_at) VALUES
('22222222-2222-2222-2222-200000000001', '64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E', NOW() - INTERVAL '100 days'),
('22222222-2222-2222-2222-200000000002', 'xyz1_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E', NOW() - INTERVAL '50 days'),
('22222222-2222-2222-2222-200000000003', 'abc2_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E', NOW() - INTERVAL '120 days'),
('22222222-2222-2222-2222-200000000004', 'statusless_identity_Sfg93KT6jSkJV7slVswcWNyNp', NOW() - INTERVAL '1 day');

-- Servers
INSERT INTO servers (uuid, protocol, host_uuid, identity_uuid, created_at) VALUES
-- srv1: Active SMP
('33333333-3333-3333-3333-300000000001', 1, '11111111-1111-1111-1111-100000000001', '22222222-2222-2222-2222-200000000001', NOW() - INTERVAL '100 days'),
-- srv2: XFTP currently offline
('33333333-3333-3333-3333-300000000002', 2, '11111111-1111-1111-1111-100000000003', '22222222-2222-2222-2222-200000000002', NOW() - INTERVAL '50 days'),
-- srv3: Dead server (inactive)
('33333333-3333-3333-3333-300000000003', 1, '11111111-1111-1111-1111-100000000004', '22222222-2222-2222-2222-200000000003', NOW() - INTERVAL '120 days'),
-- srv4: New discovery, same identity, different host
('33333333-3333-3333-3333-300000000004', 1, '11111111-1111-1111-1111-100000000002', '22222222-2222-2222-2222-200000000001', NOW() - INTERVAL '2 days'),
-- srv5: Same host, different identity
('33333333-3333-3333-3333-300000000005', 1, '11111111-1111-1111-1111-100000000001', '22222222-2222-2222-2222-200000000002', NOW() - INTERVAL '10 days'),
-- srv6: Statusless server
('33333333-3333-3333-3333-300000000006', 1, '11111111-1111-1111-1111-100000000005', '22222222-2222-2222-2222-200000000004', NOW() - INTERVAL '1 day');

-- Server Statuses
DO $$
DECLARE
    i INT;
BEGIN
    -- srv1: High uptime
    FOR i IN 1..90 LOOP
        INSERT INTO server_statuses (server_uuid, status, country, info_page_available, created_at)
        VALUES ('33333333-3333-3333-3333-300000000001', true, 'US', true, NOW() - i * INTERVAL '1 day');
    END LOOP;

    -- srv2: Good uptime but recently offline
    FOR i IN 5..30 LOOP
        INSERT INTO server_statuses (server_uuid, status, country, info_page_available, created_at)
        VALUES ('33333333-3333-3333-3333-300000000002', true, 'DE', false, NOW() - i * INTERVAL '1 day');
    END LOOP;
    FOR i IN 1..4 LOOP
        INSERT INTO server_statuses (server_uuid, status, country, info_page_available, created_at)
        VALUES ('33333333-3333-3333-3333-300000000002', false, 'DE', false, NOW() - i * INTERVAL '1 day');
    END LOOP;

    -- srv3: Completely offline for long time
    FOR i IN 95..110 LOOP
        INSERT INTO server_statuses (server_uuid, status, country, info_page_available, created_at)
        VALUES ('33333333-3333-3333-3333-300000000003', false, 'RU', false, NOW() - i * INTERVAL '1 day');
    END LOOP;
    
    -- srv5: Started checking a few days ago
    FOR i IN 1..5 LOOP
        INSERT INTO server_statuses (server_uuid, status, country, info_page_available, created_at)
        VALUES ('33333333-3333-3333-3333-300000000005', true, 'US', true, NOW() - i * INTERVAL '1 day');
    END LOOP;
END $$;

-- ===============
-- BOTS
-- ===============
INSERT INTO bots (uuid, address, created_at) VALUES
-- Complete Bot
('44444444-4444-4444-4444-400000000001', 'https://smp1.example.com/a#bot_complete', NOW() - INTERVAL '30 days'),
-- Just address Bot
('44444444-4444-4444-4444-400000000002', 'https://smp2.example.com/a#bot_just_address', NOW() - INTERVAL '1 day'),
-- One command, no statuses Bot
('44444444-4444-4444-4444-400000000003', 'https://smp1.example.com/a#bot_one_command', NOW() - INTERVAL '10 days'),
-- Offline Bot
('44444444-4444-4444-4444-400000000004', 'https://smp1.example.com/a#bot_offline', NOW() - INTERVAL '60 days'),
-- Statusless Bot
('44444444-4444-4444-4444-400000000005', 'https://smp1.example.com/a#bot_statusless', NOW() - INTERVAL '1 day');

-- Bot Profiles
INSERT INTO bot_profiles (uuid, bot_uuid, name, description, photo, created_at) VALUES
('b0100000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-400000000001', 'Complete Bot', 'A fully featured bot', 'base64photo...', NOW() - INTERVAL '30 days'),
('b0100000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-400000000003', 'Simple Bot', 'Just one command', NULL, NOW() - INTERVAL '10 days'),
('b0100000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-400000000004', 'Offline Bot', 'I am currently dead', NULL, NOW() - INTERVAL '60 days');

-- Bot Greeting Messages
INSERT INTO bot_greeting_messages (uuid, bot_uuid, text, created_at) VALUES
('b0200000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-400000000001', 'Hello! I am a complete bot.', NOW() - INTERVAL '30 days'),
('b0200000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-400000000004', 'Farewell!', NOW() - INTERVAL '60 days');

-- Bot Commands
INSERT INTO bot_commands (uuid, bot_profile_uuid, keyword, label, created_at) VALUES
('b0300000-0000-0000-0000-000000000001', 'b0100000-0000-0000-0000-000000000001', '/help', 'Show help', NOW() - INTERVAL '30 days'),
('b0300000-0000-0000-0000-000000000002', 'b0100000-0000-0000-0000-000000000001', '/settings', 'Change settings', NOW() - INTERVAL '30 days'),
('b0300000-0000-0000-0000-000000000003', 'b0100000-0000-0000-0000-000000000003', '/start', 'Start the bot', NOW() - INTERVAL '10 days');

-- Bot Command Reply Messages
INSERT INTO bot_command_reply_messages (uuid, bot_command_uuid, text, created_at) VALUES
('b0400000-0000-0000-0000-000000000001', 'b0300000-0000-0000-0000-000000000001', 'Here is your help text.', NOW()),
('b0400000-0000-0000-0000-000000000002', 'b0300000-0000-0000-0000-000000000003', 'Bot started.', NOW());

-- Bot Statuses
DO $$
DECLARE
    i INT;
BEGIN
    -- Complete bot is mostly online
    FOR i IN 1..30 LOOP
        INSERT INTO bot_statuses (bot_uuid, is_online, created_at)
        VALUES ('44444444-4444-4444-4444-400000000001', true, NOW() - i * INTERVAL '1 day');
    END LOOP;
    
    -- Offline bot is offline
    FOR i IN 1..10 LOOP
        INSERT INTO bot_statuses (bot_uuid, is_online, created_at)
        VALUES ('44444444-4444-4444-4444-400000000004', false, NOW() - i * INTERVAL '1 day');
    END LOOP;
END $$;


-- ===============
-- RELAYS
-- ===============
INSERT INTO relays (uuid, url, created_at) VALUES
('55555555-5555-5555-5555-500000000001', 'tcp://relay1.example.com', NOW() - INTERVAL '40 days'),
('55555555-5555-5555-5555-500000000002', 'tcp://relay2.example.com:443', NOW() - INTERVAL '2 days'),
('55555555-5555-5555-5555-500000000003', 'tcp://dead.relay.xyz', NOW() - INTERVAL '80 days'),
('55555555-5555-5555-5555-500000000004', 'tcp://statusless.relay.xyz', NOW() - INTERVAL '1 day');

-- Relay Profiles
INSERT INTO relay_profiles (uuid, relay_uuid, name, photo, created_at) VALUES
('f0100000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-500000000001', 'Main Relay', 'base64photo...', NOW() - INTERVAL '40 days'),
('f0100000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-500000000003', 'Failing Relay', NULL, NOW() - INTERVAL '80 days');

-- Relay Statuses
DO $$
DECLARE
    i INT;
BEGIN
    -- Main relay is online and stable
    FOR i IN 1..30 LOOP
        INSERT INTO relay_statuses (relay_uuid, is_online, created_at)
        VALUES ('55555555-5555-5555-5555-500000000001', true, NOW() - i * INTERVAL '1 day');
    END LOOP;
    
    -- Dead relay is offline
    FOR i IN 1..15 LOOP
        INSERT INTO relay_statuses (relay_uuid, is_online, created_at)
        VALUES ('55555555-5555-5555-5555-500000000003', false, NOW() - i * INTERVAL '1 day');
    END LOOP;
END $$;

