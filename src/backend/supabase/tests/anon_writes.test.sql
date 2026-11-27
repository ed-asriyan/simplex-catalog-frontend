-- design rule 2: every table has row level security with a policy for reading and none for
-- anything else, so `anon` (the public key) inserts, updates and deletes nothing in any table.
begin;
select plan(40);

-- runs a statement as the caller and tells how many rows it changed: a refusal is 0 changed
create function public.rows_changed_by(statement text) returns int language plpgsql as $$
declare n int;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
exception when insufficient_privilege then
  return 0;
end $$;

insert into server_hosts (uuid, host) values ('a1000000-0000-0000-0000-000000000002', 'anon-writes.test');
insert into server_identities (uuid, identity) values ('a2000000-0000-0000-0000-000000000002', 'anon-writes-identity');
insert into servers (uuid, protocol, host_uuid, identity_uuid)
  values ('a3000000-0000-0000-0000-000000000002', 1, 'a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002');
insert into server_statuses (uuid, server_uuid, status, country, info_page_available)
  values ('a4000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', true, 'DE', false);
insert into bots (uuid, address, approved) values ('b1000000-0000-0000-0000-000000000002', 'anon-writes-bot', true);
insert into bot_profiles (uuid, bot_uuid, name) values ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Writes bot');
insert into bot_commands (uuid, bot_profile_uuid, keyword, label) values ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', '/x', 'X');
insert into bot_command_reply_messages (uuid, bot_command_uuid, text) values ('b6000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000002', 'reply');
insert into bot_greeting_messages (uuid, bot_uuid, text) values ('b4000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'hi');
insert into bot_statuses (uuid, bot_uuid, is_online) values ('b5000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', true);
insert into relays (uuid, url) values ('c1000000-0000-0000-0000-000000000002', 'anon-writes-relay');
insert into relay_profiles (uuid, relay_uuid, name) values ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Writes relay');
insert into relay_statuses (uuid, relay_uuid, is_online) values ('c3000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', true);

-- every table has row level security on
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 0,
          'every table in public has row level security');

set local role anon;

select is(public.rows_changed_by($$ insert into server_hosts (host) values ('x.test') $$), 0, 'anon inserts no server_hosts');
select is(public.rows_changed_by($$ insert into server_identities (identity) values ('x') $$), 0, 'anon inserts no server_identities');
select is(public.rows_changed_by($$ insert into servers (protocol, host_uuid, identity_uuid) values (1, 'a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002') $$), 0, 'anon inserts no servers');
select is(public.rows_changed_by($$ insert into server_statuses (server_uuid, status, country, info_page_available) values ('a3000000-0000-0000-0000-000000000002', true, 'DE', false) $$), 0, 'anon inserts no server_statuses');
select is(public.rows_changed_by($$ insert into bots (address, approved) values ('x', true) $$), 0, 'anon inserts no bots');
select is(public.rows_changed_by($$ insert into bot_profiles (bot_uuid, name) values ('b1000000-0000-0000-0000-000000000002', 'x') $$), 0, 'anon inserts no bot_profiles');
select is(public.rows_changed_by($$ insert into bot_commands (bot_profile_uuid, keyword, label) values ('b2000000-0000-0000-0000-000000000002', '/y', 'Y') $$), 0, 'anon inserts no bot_commands');
select is(public.rows_changed_by($$ insert into bot_command_reply_messages (bot_command_uuid, text) values ('b3000000-0000-0000-0000-000000000002', 'x') $$), 0, 'anon inserts no bot_command_reply_messages');
select is(public.rows_changed_by($$ insert into bot_greeting_messages (bot_uuid, text) values ('b1000000-0000-0000-0000-000000000002', 'x') $$), 0, 'anon inserts no bot_greeting_messages');
select is(public.rows_changed_by($$ insert into bot_statuses (bot_uuid, is_online) values ('b1000000-0000-0000-0000-000000000002', true) $$), 0, 'anon inserts no bot_statuses');
select is(public.rows_changed_by($$ insert into relays (url) values ('x') $$), 0, 'anon inserts no relays');
select is(public.rows_changed_by($$ insert into relay_profiles (relay_uuid, name) values ('c1000000-0000-0000-0000-000000000002', 'x') $$), 0, 'anon inserts no relay_profiles');
select is(public.rows_changed_by($$ insert into relay_statuses (relay_uuid, is_online) values ('c1000000-0000-0000-0000-000000000002', true) $$), 0, 'anon inserts no relay_statuses');

select is(public.rows_changed_by($$ update server_hosts set host = 'y.test' where uuid = 'a1000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no server_hosts');
select is(public.rows_changed_by($$ update server_identities set identity = 'y' where uuid = 'a2000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no server_identities');
select is(public.rows_changed_by($$ update servers set protocol = 2 where uuid = 'a3000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no servers');
select is(public.rows_changed_by($$ update server_statuses set status = false where uuid = 'a4000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no server_statuses');
select is(public.rows_changed_by($$ update bots set approved = false where uuid = 'b1000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no bots');
select is(public.rows_changed_by($$ update bot_profiles set name = 'y' where uuid = 'b2000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no bot_profiles');
select is(public.rows_changed_by($$ update bot_commands set label = 'y' where uuid = 'b3000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no bot_commands');
select is(public.rows_changed_by($$ update bot_command_reply_messages set text = 'y' where uuid = 'b6000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no bot_command_reply_messages');
select is(public.rows_changed_by($$ update bot_greeting_messages set text = 'y' where uuid = 'b4000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no bot_greeting_messages');
select is(public.rows_changed_by($$ update bot_statuses set is_online = false where uuid = 'b5000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no bot_statuses');
select is(public.rows_changed_by($$ update relays set url = 'y' where uuid = 'c1000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no relays');
select is(public.rows_changed_by($$ update relay_profiles set name = 'y' where uuid = 'c2000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no relay_profiles');
select is(public.rows_changed_by($$ update relay_statuses set is_online = false where uuid = 'c3000000-0000-0000-0000-000000000002' $$), 0, 'anon updates no relay_statuses');

select is(public.rows_changed_by($$ delete from server_hosts where uuid = 'a1000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no server_hosts');
select is(public.rows_changed_by($$ delete from server_identities where uuid = 'a2000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no server_identities');
select is(public.rows_changed_by($$ delete from servers where uuid = 'a3000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no servers');
select is(public.rows_changed_by($$ delete from server_statuses where uuid = 'a4000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no server_statuses');
select is(public.rows_changed_by($$ delete from bots where uuid = 'b1000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no bots');
select is(public.rows_changed_by($$ delete from bot_profiles where uuid = 'b2000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no bot_profiles');
select is(public.rows_changed_by($$ delete from bot_commands where uuid = 'b3000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no bot_commands');
select is(public.rows_changed_by($$ delete from bot_command_reply_messages where uuid = 'b6000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no bot_command_reply_messages');
select is(public.rows_changed_by($$ delete from bot_greeting_messages where uuid = 'b4000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no bot_greeting_messages');
select is(public.rows_changed_by($$ delete from bot_statuses where uuid = 'b5000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no bot_statuses');
select is(public.rows_changed_by($$ delete from relays where uuid = 'c1000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no relays');
select is(public.rows_changed_by($$ delete from relay_profiles where uuid = 'c2000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no relay_profiles');
select is(public.rows_changed_by($$ delete from relay_statuses where uuid = 'c3000000-0000-0000-0000-000000000002' $$), 0, 'anon deletes no relay_statuses');

select * from finish();
rollback;
