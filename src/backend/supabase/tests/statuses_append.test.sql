-- design rule 3: a check is appended and no component deletes a status; removing what has been
-- inactive for 90 days is the maintainer's act in the Supabase project (role postgres).
-- Neither `anon` nor `service_role` (what the validators write with) may delete a status.
begin;
select plan(17);

create function public.rows_changed_by(statement text) returns int language plpgsql as $$
declare n int;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
exception when insufficient_privilege then
  return 0;
end $$;

insert into server_hosts (uuid, host) values ('a1000000-0000-0000-0000-000000000004', 'statuses.test');
insert into server_identities (uuid, identity) values ('a2000000-0000-0000-0000-000000000004', 'statuses-identity');
insert into servers (uuid, protocol, host_uuid, identity_uuid)
  values ('a3000000-0000-0000-0000-000000000004', 1, 'a1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000004');
insert into server_statuses (uuid, server_uuid, status, country, info_page_available)
  values ('a4000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000004', true, 'DE', false);
insert into bots (uuid, address, approved) values ('b1000000-0000-0000-0000-000000000006', 'statuses-bot', true);
insert into bot_statuses (uuid, bot_uuid, is_online) values ('b5000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', true);
insert into relays (uuid, url) values ('c1000000-0000-0000-0000-000000000004', 'statuses-relay');
insert into relay_statuses (uuid, relay_uuid, is_online) values ('c3000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', true);

set local role anon;
select is(public.rows_changed_by($$ delete from server_statuses where uuid = 'a4000000-0000-0000-0000-000000000004' $$), 0, 'anon deletes no server status');
select is(public.rows_changed_by($$ delete from bot_statuses where uuid = 'b5000000-0000-0000-0000-000000000006' $$), 0, 'anon deletes no bot status');
select is(public.rows_changed_by($$ delete from relay_statuses where uuid = 'c3000000-0000-0000-0000-000000000004' $$), 0, 'anon deletes no relay status');

-- service_role bypasses row level security, so only its privileges can stop it
reset role;
select is((select count(*)::int from information_schema.role_table_grants
           where table_name in ('server_statuses', 'bot_statuses', 'relay_statuses')
             and grantee in ('anon', 'authenticated', 'service_role')
             and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE')), 0,
  'no role the components use may update, delete or truncate a status');
select is(has_table_privilege('service_role', 'server_statuses', 'DELETE'), false, 'service_role has no DELETE on server_statuses');
select is(has_table_privilege('service_role', 'bot_statuses', 'DELETE'), false, 'service_role has no DELETE on bot_statuses');
select is(has_table_privilege('service_role', 'relay_statuses', 'DELETE'), false, 'service_role has no DELETE on relay_statuses');

set local role service_role;
select is(public.rows_changed_by($$ delete from server_statuses where uuid = 'a4000000-0000-0000-0000-000000000004' $$), 0, 'service_role deletes no server status');
select is(public.rows_changed_by($$ delete from bot_statuses where uuid = 'b5000000-0000-0000-0000-000000000006' $$), 0, 'service_role deletes no bot status');
select is(public.rows_changed_by($$ delete from relay_statuses where uuid = 'c3000000-0000-0000-0000-000000000004' $$), 0, 'service_role deletes no relay status');
select is(public.rows_changed_by($$ update bot_statuses set is_online = false where uuid = 'b5000000-0000-0000-0000-000000000006' $$), 0, 'service_role changes no status');

-- what the validators do to a server, bot or relay they check leaves its statuses
reset role;
select is((select count(*)::int from server_statuses where uuid = 'a4000000-0000-0000-0000-000000000004'), 1, 'the server status is still there');
select is((select count(*)::int from bot_statuses where uuid = 'b5000000-0000-0000-0000-000000000006'), 1, 'the bot status is still there');
select is((select count(*)::int from relay_statuses where uuid = 'c3000000-0000-0000-0000-000000000004'), 1, 'the relay status is still there');

-- removing what has been inactive is the maintainer's, as postgres in the project's dashboard, which owns the tables
select is(public.rows_changed_by($$ delete from server_statuses where uuid = 'a4000000-0000-0000-0000-000000000004' $$), 1, 'the maintainer deletes a server status');
select is(public.rows_changed_by($$ delete from bot_statuses where uuid = 'b5000000-0000-0000-0000-000000000006' $$), 1, 'and a bot status');
select is(public.rows_changed_by($$ delete from relay_statuses where uuid = 'c3000000-0000-0000-0000-000000000004' $$), 1, 'and a relay status');

select * from finish();
rollback;
