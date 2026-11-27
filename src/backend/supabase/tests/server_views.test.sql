-- US-B51: what v_server_summaries computes on statuses inserted with set times: the latest status
-- of a server and its uptime over 7, 30 and 90 days, the share of the hours of those last days it
-- was online, what a check found holding from its hour until the next check's, the latest's until
-- now; null (shown N/A) while it has never been checked.
begin;
select plan(25);

-- the hour the view counts from, and the nth server of this test
create function public.h() returns timestamp language sql as $$ select date_trunc('hour', now()::timestamp) $$;
create function public.sid(n int) returns uuid language sql as
  $$ select ('a3000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid $$;

insert into server_hosts (uuid, host)
  select ('a1000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, 'views-' || n || '.test' from generate_series(1, 11) n;
insert into server_identities (uuid, identity)
  select ('a2000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, 'views-identity-' || n from generate_series(1, 11) n;
insert into servers (uuid, protocol, host_uuid, identity_uuid)
  select public.sid(n), 1, ('a1000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, ('a2000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid
  from generate_series(1, 11) n;

-- server 1 has no check; 2 is always online; 3 has one online check 20 days ago; 4 one offline check 60 days ago
-- 5..8 have an offline and an online check across the edge of a period (the offline one a minute outside it)
-- 9 has online and offline checks mixed; 10 got its checks in another order than they were made; 11 was never online
insert into server_statuses (server_uuid, status, country, info_page_available, created_at) values
  (public.sid(2), true, 'DE', false, public.h() - interval '30 hours'),
  (public.sid(2), true, 'DE', false, public.h() - interval '2 hours'),
  (public.sid(3), true, 'DE', false, public.h() - interval '20 days'),
  (public.sid(4), false, 'DE', false, public.h() - interval '60 days'),
  (public.sid(5), false, 'DE', false, public.h() - interval '7 days' - interval '1 minute'),
  (public.sid(5), true, 'DE', false, public.h() - interval '7 days'),
  (public.sid(6), true, 'DE', false, public.h() - interval '7 days' - interval '1 minute'),
  (public.sid(6), false, 'DE', false, public.h() - interval '7 days'),
  (public.sid(7), false, 'DE', false, public.h() - interval '30 days' - interval '1 minute'),
  (public.sid(7), true, 'DE', false, public.h() - interval '30 days'),
  (public.sid(8), false, 'DE', false, public.h() - interval '90 days' - interval '1 minute'),
  (public.sid(8), true, 'DE', false, public.h() - interval '90 days'),
  (public.sid(9), true, 'DE', false, public.h() - interval '6 hours'),
  (public.sid(9), false, 'DE', false, public.h() - interval '5 hours'),
  (public.sid(9), true, 'DE', false, public.h() - interval '4 hours'),
  (public.sid(9), true, 'DE', false, public.h() - interval '3 hours'),
  (public.sid(11), false, 'DE', false, public.h() - interval '3 hours'),
  (public.sid(11), false, 'DE', false, public.h() - interval '2 hours');
insert into server_statuses (uuid, server_uuid, status, country, info_page_available, created_at) values
  ('a4000000-0000-0000-0001-000000000002', public.sid(10), true, 'DE', false, public.h() - interval '1 hour'),
  ('a4000000-0000-0000-0001-000000000001', public.sid(10), false, 'DE', false, public.h() - interval '5 hours');

set local role anon;

-- a server with no check: no status and no uptime, not 0
select is((select last_server_status_uuid from v_server_summaries where server_uuid = public.sid(1)), null, 'a server with no check has no latest status');
select is((select uptime7 from v_server_summaries where server_uuid = public.sid(1)), null, 'and no uptime over 7 days');
select is((select uptime30 from v_server_summaries where server_uuid = public.sid(1)), null, 'and no uptime over 30 days');
select is((select uptime90 from v_server_summaries where server_uuid = public.sid(1)), null, 'and no uptime over 90 days');

-- always online: 100 % in every period
select is((select uptime7 from v_server_summaries where server_uuid = public.sid(2)), 1::float8, 'a server found online at each check has uptime 1 over 7 days');
select is((select uptime30 from v_server_summaries where server_uuid = public.sid(2)), 1::float8, 'and over 30 days');
select is((select uptime90 from v_server_summaries where server_uuid = public.sid(2)), 1::float8, 'and over 90 days');

-- a period with no check: what the check before it found holds through it
select is((select uptime7 from v_server_summaries where server_uuid = public.sid(3)), 1::float8, 'a server last found online 20 days ago has uptime 1 over 7 days');
select is((select uptime30 from v_server_summaries where server_uuid = public.sid(3)), 1::float8, 'and its check is in its 30 days');
select is((select uptime90 from v_server_summaries where server_uuid = public.sid(3)), 1::float8, 'and in its 90 days');
select is((select uptime30 from v_server_summaries where server_uuid = public.sid(4)), 0::float8, 'a server last found offline 60 days ago has uptime 0 over 30 days');
select is((select uptime90 from v_server_summaries where server_uuid = public.sid(4)), 0::float8, 'and 0 over 90 days, as its check found it offline');

-- the edge of a period: a check just inside counts, one just outside does not
select is((select uptime7 from v_server_summaries where server_uuid = public.sid(5)), 1::float8, 'an offline check just outside 7 days and an online one at its edge: uptime 1');
select is((select uptime7 from v_server_summaries where server_uuid = public.sid(6)), 0::float8, 'an online check just outside 7 days and an offline one at its edge: uptime 0');
select is((select uptime30 from v_server_summaries where server_uuid = public.sid(7)), 1::float8, 'the same at the edge of 30 days');
select is((select uptime90 from v_server_summaries where server_uuid = public.sid(8)), 1::float8, 'the same at the edge of 90 days');

-- online and offline mixed: online 6 hours ago, offline 5, online 4 and 3 hours ago, so of the 7 hours
-- from its first check to the end of this hour it was online 6
select ok(abs((select uptime7 from v_server_summaries where server_uuid = public.sid(9)) - 6.0 / 7) < 1e-9, 'online 6 of the 7 hours since its first check: uptime 6/7 over 7 days');
select ok(abs((select uptime30 from v_server_summaries where server_uuid = public.sid(9)) - 6.0 / 7) < 1e-9, 'and over 30 days');
select ok(abs((select uptime90 from v_server_summaries where server_uuid = public.sid(9)) - 6.0 / 7) < 1e-9, 'and over 90 days');

-- the latest status is the latest by its time, not the last inserted
select is((select last_server_status_uuid from v_server_summaries where server_uuid = public.sid(10)), 'a4000000-0000-0000-0001-000000000002'::uuid, 'the latest status of a server is its newest check');
select is((select last_server_status_uuid from v_server_summaries where server_uuid = public.sid(2)), (select uuid from server_statuses where server_uuid = public.sid(2) order by created_at desc limit 1), 'the same for a server with several checks');

-- never online: 0, not no data
select is((select uptime7 from v_server_summaries where server_uuid = public.sid(11)), 0::float8, 'a server found offline at each check has uptime 0 over 7 days');
select is((select uptime90 from v_server_summaries where server_uuid = public.sid(11)), 0::float8, 'and over 90 days');

-- one row per server
select is((select count(*)::int from v_server_summaries where server_uuid = public.sid(9)), 1, 'a server has one row, however many checks');
select is((select count(*)::int from v_server_summaries where server_uuid in (select public.sid(n) from generate_series(1, 11) n)), 11, 'every server has a row');

select * from finish();
rollback;
