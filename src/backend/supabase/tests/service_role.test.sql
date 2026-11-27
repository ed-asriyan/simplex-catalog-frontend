-- design rule 2 and 3: `service_role` (the secret key) does what the validators and the functions do:
-- read the lists, insert statuses, replace profiles, commands and greetings, insert servers,
-- identities, hosts, bots and relays; it reads bots whether approved or not.
begin;
select plan(28);

-- fixtures: a server, an unapproved bot with a profile, a relay with a profile
insert into server_hosts (uuid, host) values ('a1000000-0000-0000-0000-000000000005', 'service-role.test');
insert into server_identities (uuid, identity) values ('a2000000-0000-0000-0000-000000000005', 'service-role-identity');
insert into servers (uuid, protocol, host_uuid, identity_uuid)
  values ('a3000000-0000-0000-0000-000000000005', 1, 'a1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000005');
insert into bots (uuid, address) values ('b1000000-0000-0000-0000-000000000007', 'service-role-bot');
insert into bot_profiles (uuid, bot_uuid, name, description) values ('b2000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000007', 'Old name', 'old');
insert into bot_commands (uuid, bot_profile_uuid, keyword, label) values ('b3000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000007', '/old', 'Old');
insert into bot_greeting_messages (uuid, bot_uuid, text) values ('b4000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000007', 'old greeting');
insert into relays (uuid, url) values ('c1000000-0000-0000-0000-000000000005', 'service-role-relay');
insert into relay_profiles (uuid, relay_uuid, name) values ('c2000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'Old relay');

set local role service_role;

-- reads: the lists the validators ask for
select is((select count(*)::int from servers where uuid = 'a3000000-0000-0000-0000-000000000005'), 1, 'service_role reads servers');
select is((select count(*)::int from server_hosts where uuid = 'a1000000-0000-0000-0000-000000000005'), 1, 'service_role reads server_hosts');
select is((select count(*)::int from server_identities where uuid = 'a2000000-0000-0000-0000-000000000005'), 1, 'service_role reads server_identities');
select is((select count(*)::int from v_server_summaries where server_uuid = 'a3000000-0000-0000-0000-000000000005'), 1, 'service_role reads v_server_summaries');
select is((select count(*)::int from bots where uuid = 'b1000000-0000-0000-0000-000000000007'), 1, 'service_role reads a bot not approved');
select is((select count(*)::int from bots where approved is true and uuid = 'b1000000-0000-0000-0000-000000000007'), 0, 'service_role asks for approved bots only by the filter');
select is((select count(*)::int from relays where uuid = 'c1000000-0000-0000-0000-000000000005'), 1, 'service_role reads relays');

-- inserts: servers, identities, hosts, bots, relays
select lives_ok($$ insert into server_hosts (uuid, host) values ('a1000000-0000-0000-0000-000000000006', 'new-host.test') $$, 'service_role inserts a host');
select lives_ok($$ insert into server_identities (uuid, identity) values ('a2000000-0000-0000-0000-000000000006', 'new-identity') $$, 'service_role inserts an identity');
select lives_ok($$ insert into servers (uuid, protocol, host_uuid, identity_uuid) values ('a3000000-0000-0000-0000-000000000006', 2, 'a1000000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000006') $$, 'service_role inserts a server');
select lives_ok($$ insert into bots (uuid, address) values ('b1000000-0000-0000-0000-000000000008', 'new-bot') $$, 'service_role inserts a bot');
select is((select approved from bots where uuid = 'b1000000-0000-0000-0000-000000000008'), null, 'a bot inserted is not approved');
select lives_ok($$ insert into relays (uuid, url) values ('c1000000-0000-0000-0000-000000000006', 'new-relay') $$, 'service_role inserts a relay');

-- inserts: statuses
select lives_ok($$ insert into server_statuses (server_uuid, status, country, info_page_available) values ('a3000000-0000-0000-0000-000000000005', true, 'DE', true) $$, 'service_role inserts a server status');
select lives_ok($$ insert into bot_statuses (bot_uuid, is_online) values ('b1000000-0000-0000-0000-000000000007', false) $$, 'service_role inserts a bot status');
select lives_ok($$ insert into relay_statuses (relay_uuid, is_online) values ('c1000000-0000-0000-0000-000000000005', true) $$, 'service_role inserts a relay status');

-- replaces: a bot's profile, commands and greeting; a relay's profile
select lives_ok($$ insert into bot_profiles (bot_uuid, name, description, photo) values ('b1000000-0000-0000-0000-000000000007', 'New name', 'new', 'p')
                   on conflict (bot_uuid) do update set name = excluded.name, description = excluded.description, photo = excluded.photo $$, 'service_role replaces a bot profile');
select is((select name from bot_profiles where bot_uuid = 'b1000000-0000-0000-0000-000000000007'), 'New name', 'the profile is the new one');
select is((select count(*)::int from bot_profiles where bot_uuid = 'b1000000-0000-0000-0000-000000000007'), 1, 'a bot has one profile');
select lives_ok($$ delete from bot_commands where bot_profile_uuid = 'b2000000-0000-0000-0000-000000000007' $$, 'service_role deletes the old commands');
select lives_ok($$ insert into bot_commands (bot_profile_uuid, keyword, label) values ('b2000000-0000-0000-0000-000000000007', '/new', 'New') $$, 'service_role inserts the new commands');
select is((select array_agg(keyword) from bot_commands where bot_profile_uuid = 'b2000000-0000-0000-0000-000000000007'), array['/new'], 'the commands are the new ones');
select lives_ok($$ insert into bot_greeting_messages (bot_uuid, text) values ('b1000000-0000-0000-0000-000000000007', 'new greeting')
                   on conflict (bot_uuid) do update set text = excluded.text $$, 'service_role replaces a greeting');
select is((select text from bot_greeting_messages where bot_uuid = 'b1000000-0000-0000-0000-000000000007'), 'new greeting', 'the greeting is the new one');
select lives_ok($$ insert into relay_profiles (relay_uuid, name, photo) values ('c1000000-0000-0000-0000-000000000005', 'New relay', 'p')
                   on conflict (relay_uuid) do update set name = excluded.name, photo = excluded.photo $$, 'service_role replaces a relay profile');
select is((select name from relay_profiles where relay_uuid = 'c1000000-0000-0000-0000-000000000005'), 'New relay', 'the relay profile is the new one');

-- what was written is read back through the views
select is((select count(*)::int from v_server_summaries where server_uuid = 'a3000000-0000-0000-0000-000000000005' and last_server_status_uuid is not null), 1, 'the new server status is the server''s latest');
select is((select is_online from v_relays_summaries where uuid = 'c1000000-0000-0000-0000-000000000005'), true, 'the new relay status is its latest');

select * from finish();
rollback;
