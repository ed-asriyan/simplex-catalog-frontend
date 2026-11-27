-- US-C23, design rule 5: a bot not approved, and its profile, commands, greeting and statuses,
-- are in no table or view `anon` can read. A view runs as its owner and passes by the policies
-- unless it is made to run as the caller.
begin;
select plan(24);

-- the unapproved bots: approved is false, or null (what a bot added by a visitor starts as)
insert into bots (uuid, address, approved) values
  ('b1000000-0000-0000-0000-000000000003', 'unapproved-false', false),
  ('b1000000-0000-0000-0000-000000000004', 'unapproved-null', null),
  ('b1000000-0000-0000-0000-000000000005', 'approved', true);
insert into bot_profiles (uuid, bot_uuid, name, description) values
  ('b2000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'False bot', 'd'),
  ('b2000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'Null bot', 'd'),
  ('b2000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'Approved bot', 'd');
insert into bot_commands (uuid, bot_profile_uuid, keyword, label) values
  ('b3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', '/a', 'A'),
  ('b3000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000004', '/a', 'A'),
  ('b3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000005', '/a', 'A');
insert into bot_command_reply_messages (bot_command_uuid, text) values
  ('b3000000-0000-0000-0000-000000000003', 'r'),
  ('b3000000-0000-0000-0000-000000000004', 'r'),
  ('b3000000-0000-0000-0000-000000000005', 'r');
insert into bot_greeting_messages (bot_uuid, text) values
  ('b1000000-0000-0000-0000-000000000003', 'hi'),
  ('b1000000-0000-0000-0000-000000000004', 'hi'),
  ('b1000000-0000-0000-0000-000000000005', 'hi');
insert into bot_statuses (bot_uuid, is_online) values
  ('b1000000-0000-0000-0000-000000000003', true),
  ('b1000000-0000-0000-0000-000000000004', true),
  ('b1000000-0000-0000-0000-000000000005', true);

set local role anon;

select is((select count(*)::int from bots where uuid in ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004')), 0, 'anon reads no bot not approved');
select is((select count(*)::int from bot_profiles where bot_uuid in ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004')), 0, 'anon reads no profile of a bot not approved');
select is((select count(*)::int from bot_commands where bot_profile_uuid in ('b2000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000004')), 0, 'anon reads no command of a bot not approved');
select is((select count(*)::int from bot_command_reply_messages where bot_command_uuid in ('b3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000004')), 0, 'anon reads no command reply of a bot not approved');
select is((select count(*)::int from bot_greeting_messages where bot_uuid in ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004')), 0, 'anon reads no greeting of a bot not approved');
select is((select count(*)::int from bot_statuses where bot_uuid in ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004')), 0, 'anon reads no status of a bot not approved');
select is((select count(*)::int from v_bot_summaries where uuid in ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004')), 0, 'anon reads no bot not approved in v_bot_summaries');

-- the approved one beside them is read
select is((select count(*)::int from bots where uuid = 'b1000000-0000-0000-0000-000000000005'), 1, 'anon reads the approved bot');
select is((select count(*)::int from bot_profiles where bot_uuid = 'b1000000-0000-0000-0000-000000000005'), 1, 'anon reads the approved bot''s profile');
select is((select count(*)::int from bot_commands where bot_profile_uuid = 'b2000000-0000-0000-0000-000000000005'), 1, 'anon reads the approved bot''s commands');
select is((select count(*)::int from bot_greeting_messages where bot_uuid = 'b1000000-0000-0000-0000-000000000005'), 1, 'anon reads the approved bot''s greeting');
select is((select count(*)::int from bot_statuses where bot_uuid = 'b1000000-0000-0000-0000-000000000005'), 1, 'anon reads the approved bot''s statuses');
select is((select count(*)::int from v_bot_summaries where uuid = 'b1000000-0000-0000-0000-000000000005'), 1, 'anon reads the approved bot in v_bot_summaries');

-- the command replies are in no policy for anon: not even an approved bot's is read
select is((select count(*)::int from bot_command_reply_messages where bot_command_uuid = 'b3000000-0000-0000-0000-000000000005'), 0, 'anon reads no command reply, not an approved bot''s either');

-- a bot is seen by its address, its name and by joins through the views and tables alike
select is((select count(*)::int from bots b join bot_profiles p on p.bot_uuid = b.uuid
             where b.address in ('unapproved-false', 'unapproved-null')), 0, 'no join gives anon a bot not approved');
select is((select count(*)::int from v_bot_summaries where name in ('False bot', 'Null bot') or address in ('unapproved-false', 'unapproved-null')), 0, 'no name or address of a bot not approved is in v_bot_summaries');

-- approving shows it, taking the approval back hides it again, as the maintainer does in the project
reset role;
update bots set approved = true where uuid = 'b1000000-0000-0000-0000-000000000003';
set local role anon;
select is((select count(*)::int from v_bot_summaries where uuid = 'b1000000-0000-0000-0000-000000000003'), 1, 'an approved bot is listed');
select is((select count(*)::int from bot_statuses where bot_uuid = 'b1000000-0000-0000-0000-000000000003'), 1, 'and its statuses are read');
reset role;
update bots set approved = false where uuid = 'b1000000-0000-0000-0000-000000000003';
set local role anon;
select is((select count(*)::int from v_bot_summaries where uuid = 'b1000000-0000-0000-0000-000000000003'), 0, 'a bot whose approval is taken back is not listed');
select is((select count(*)::int from bot_greeting_messages where bot_uuid = 'b1000000-0000-0000-0000-000000000003'), 0, 'and its greeting is not read');

-- every view of the schema runs as the caller, so none passes by the policies as its owner
reset role;
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'v'
              and not coalesce('security_invoker=on' = any (c.reloptions) or 'security_invoker=true' = any (c.reloptions), false)),
          0, 'every view in public runs as its caller');

-- no view lists a column of a bot not approved by another way: anon may select no other relation holding bots
select is((select count(*)::int from information_schema.view_table_usage u
            where u.table_schema = 'public' and u.table_name = 'bots'
              and u.view_name <> 'v_bot_summaries'), 0, 'v_bot_summaries is the only view of bots');

-- the policies read the approval: each table that hangs on a bot has a policy for anon that names it
select is((select count(*)::int from pg_policies
            where schemaname = 'public' and tablename in ('bots', 'bot_profiles', 'bot_commands', 'bot_statuses', 'bot_greeting_messages')
              and 'anon' = any (roles) and cmd = 'SELECT' and qual ilike '%approved IS TRUE%'), 5, 'the five tables of a bot have a policy that reads the approval');
select is((select count(*)::int from pg_policies
            where schemaname = 'public' and tablename in ('bots', 'bot_profiles', 'bot_commands', 'bot_statuses', 'bot_greeting_messages', 'bot_command_reply_messages')
              and cmd <> 'SELECT'), 0, 'no policy of the bot tables is for anything but reading');

select * from finish();
rollback;
