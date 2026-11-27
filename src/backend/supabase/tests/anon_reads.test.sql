-- US-B1, US-C1, US-D1 and design rule 2: as `anon` (the public key) a visitor reads
-- what the website reads: the tables and views its queries use, with an approved bot.
begin;
select plan(23);

insert into server_hosts (uuid, host) values ('a1000000-0000-0000-0000-000000000001', 'anon-reads.test');
insert into server_identities (uuid, identity) values ('a2000000-0000-0000-0000-000000000001', 'anon-reads-identity');
insert into servers (uuid, protocol, host_uuid, identity_uuid)
  values ('a3000000-0000-0000-0000-000000000001', 1, 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001');
insert into server_statuses (uuid, server_uuid, status, country, info_page_available)
  values ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', true, 'DE', false);

insert into bots (uuid, address, approved) values ('b1000000-0000-0000-0000-000000000001', 'anon-reads-bot', true);
insert into bot_profiles (uuid, bot_uuid, name, description)
  values ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Reads bot', 'about');
insert into bot_commands (uuid, bot_profile_uuid, keyword, label)
  values ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '/help', 'Help');
insert into bot_greeting_messages (uuid, bot_uuid, text)
  values ('b4000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'hello');
insert into bot_statuses (uuid, bot_uuid, is_online)
  values ('b5000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', true);

insert into relays (uuid, url) values ('c1000000-0000-0000-0000-000000000001', 'anon-reads-relay');
insert into relay_profiles (uuid, relay_uuid, name)
  values ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Reads relay');
insert into relay_statuses (uuid, relay_uuid, is_online)
  values ('c3000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', true);

set local role anon;

select is((select count(*)::int from servers where uuid = 'a3000000-0000-0000-0000-000000000001'), 1, 'anon reads servers');
select is((select count(*)::int from server_hosts where uuid = 'a1000000-0000-0000-0000-000000000001'), 1, 'anon reads server_hosts');
select is((select count(*)::int from server_identities where uuid = 'a2000000-0000-0000-0000-000000000001'), 1, 'anon reads server_identities');
select is((select count(*)::int from server_statuses where uuid = 'a4000000-0000-0000-0000-000000000001'), 1, 'anon reads server_statuses');
select is((select count(*)::int from v_server_summaries where server_uuid = 'a3000000-0000-0000-0000-000000000001'), 1, 'anon reads v_server_summaries');

select is((select count(*)::int from bots where uuid = 'b1000000-0000-0000-0000-000000000001'), 1, 'anon reads an approved bot');
select is((select count(*)::int from bot_profiles where uuid = 'b2000000-0000-0000-0000-000000000001'), 1, 'anon reads its profile');
select is((select count(*)::int from bot_commands where uuid = 'b3000000-0000-0000-0000-000000000001'), 1, 'anon reads its commands');
select is((select count(*)::int from bot_greeting_messages where uuid = 'b4000000-0000-0000-0000-000000000001'), 1, 'anon reads its greeting');
select is((select count(*)::int from bot_statuses where uuid = 'b5000000-0000-0000-0000-000000000001'), 1, 'anon reads its statuses');
select is((select count(*)::int from v_bot_summaries where uuid = 'b1000000-0000-0000-0000-000000000001'), 1, 'anon reads v_bot_summaries');

select is((select count(*)::int from relays where uuid = 'c1000000-0000-0000-0000-000000000001'), 1, 'anon reads relays');
select is((select count(*)::int from relay_profiles where uuid = 'c2000000-0000-0000-0000-000000000001'), 1, 'anon reads relay_profiles');
select is((select count(*)::int from relay_statuses where uuid = 'c3000000-0000-0000-0000-000000000001'), 1, 'anon reads relay_statuses');
select is((select count(*)::int from v_relays_summaries where uuid = 'c1000000-0000-0000-0000-000000000001'), 1, 'anon reads v_relays_summaries');

-- the columns the website selects from the views
reset role;
select columns_are('public', 'v_server_summaries',
  array['server_uuid', 'server_host_uuid', 'server_identity_uuid', 'last_server_status_uuid', 'uptime7', 'uptime30', 'uptime90'],
  'v_server_summaries has the columns the website reads');
select columns_are('public', 'v_bot_summaries',
  array['uuid', 'address', 'created_at', 'photo', 'name', 'description', 'is_online', 'last_check', 'uptime7', 'uptime30', 'uptime90'],
  'v_bot_summaries has the columns the website reads');
select columns_are('public', 'v_relays_summaries',
  array['uuid', 'url', 'created_at', 'photo', 'name', 'is_online', 'last_check', 'uptime7', 'uptime30', 'uptime90'],
  'v_relays_summaries has the columns the website reads');

-- what the website joins: a server with its host, identity and latest status, as anon
set local role anon;
select results_eq(
  $$ select h.host, i.identity, st.country from servers s
       join server_hosts h on h.uuid = s.host_uuid
       join server_identities i on i.uuid = s.identity_uuid
       join server_statuses st on st.server_uuid = s.uuid
      where s.uuid = 'a3000000-0000-0000-0000-000000000001' $$,
  $$ values ('anon-reads.test', 'anon-reads-identity', 'DE') $$,
  'anon reads a server with its host, identity and status');
select results_eq(
  $$ select p.name, c.keyword, g.text from bots b
       join bot_profiles p on p.bot_uuid = b.uuid
       join bot_commands c on c.bot_profile_uuid = p.uuid
       join bot_greeting_messages g on g.bot_uuid = b.uuid
      where b.uuid = 'b1000000-0000-0000-0000-000000000001' $$,
  $$ values ('Reads bot', '/help', 'hello') $$,
  'anon reads a bot with its profile, commands and greeting');

-- the lists are readable by the role the website's key is
reset role;
select is((select has_table_privilege('anon', 'v_server_summaries', 'SELECT')), true, 'anon may select v_server_summaries');
select is((select has_table_privilege('anon', 'v_bot_summaries', 'SELECT')), true, 'anon may select v_bot_summaries');
select is((select has_table_privilege('anon', 'v_relays_summaries', 'SELECT')), true, 'anon may select v_relays_summaries');

select * from finish();
rollback;
