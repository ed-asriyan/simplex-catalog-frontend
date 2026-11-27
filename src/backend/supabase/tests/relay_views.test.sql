-- US-D24: what v_relays_summaries computes on statuses inserted with set times: the latest status and
-- last_check of a relay, and its uptime over 7, 30 and 90 days, the share of the checks of those
-- last days that found it online. A period with no check is 0 here (design rule 4).
begin;
select plan(23);

create function public.t(ago interval) returns timestamp language sql as $$ select now()::timestamp - ago $$;
create function public.rid(n int) returns uuid language sql as
  $$ select ('c1000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid $$;

insert into relays (uuid, url)
  select public.rid(n), 'views-relay-' || n from generate_series(1, 9) n;
insert into relay_profiles (relay_uuid, name)
  select public.rid(n), 'Views relay ' || n from generate_series(1, 9) n;

-- 1: no check; 2: online 3 hours ago, offline 1 hour ago; 3: checks over 100 days;
-- 4..6: an offline check a minute outside a period and an online one at its edge; 7: reverse for 7 days;
-- 8: never online; 9: a relay whose profile is deleted below
insert into relay_statuses (relay_uuid, is_online, created_at) values
  (public.rid(2), true, public.t('3 hours')),
  (public.rid(2), false, public.t('1 hour')),
  (public.rid(3), true, public.t('1 day')),
  (public.rid(3), false, public.t('2 days')),
  (public.rid(3), true, public.t('10 days')),
  (public.rid(3), false, public.t('40 days')),
  (public.rid(3), false, public.t('100 days')),
  (public.rid(4), false, public.t('7 days 1 minute')),
  (public.rid(4), true, public.t('7 days')),
  (public.rid(5), false, public.t('30 days 1 minute')),
  (public.rid(5), true, public.t('30 days')),
  (public.rid(6), false, public.t('90 days 1 minute')),
  (public.rid(6), true, public.t('90 days')),
  (public.rid(7), true, public.t('7 days 1 minute')),
  (public.rid(7), false, public.t('7 days')),
  (public.rid(8), false, public.t('2 hours')),
  (public.rid(8), false, public.t('1 hour'));
delete from relay_profiles where relay_uuid = public.rid(9);

set local role anon;

select is((select is_online from v_relays_summaries where uuid = public.rid(1)), null, 'a relay with no check has no latest status');
select is((select last_check from v_relays_summaries where uuid = public.rid(1)), null, 'and no last check');
select is((select uptime7 from v_relays_summaries where uuid = public.rid(1)), 0::float8, 'and uptime 0 over 7 days');
select is((select uptime90 from v_relays_summaries where uuid = public.rid(1)), 0::float8, 'and over 90 days');

select is((select is_online from v_relays_summaries where uuid = public.rid(2)), false, 'the latest status of a relay is its newest check');
select is((select last_check from v_relays_summaries where uuid = public.rid(2)), public.t('1 hour'), 'and its last check is that check''s time');
select is((select uptime7 from v_relays_summaries where uuid = public.rid(2)), 0.5::float8, 'one online check of two: uptime 0.5');

-- online and offline mixed over several periods
select is((select is_online from v_relays_summaries where uuid = public.rid(3)), true, 'the latest status is the newest even when the older ones differ');
select is((select uptime7 from v_relays_summaries where uuid = public.rid(3)), 0.5::float8, 'over 7 days: 1 online of 2 checks');
select is((select uptime30 from v_relays_summaries where uuid = public.rid(3)), (2.0 / 3)::float8, 'over 30 days: 2 online of 3 checks');
select is((select uptime90 from v_relays_summaries where uuid = public.rid(3)), 0.5::float8, 'over 90 days: 2 online of 4 checks, the one of 100 days ago not counted');
select is((select last_check from v_relays_summaries where uuid = public.rid(3)), public.t('1 day'), 'its last check is the newest check''s time');

-- the edge of a period: a check just inside counts, one just outside does not
select is((select uptime7 from v_relays_summaries where uuid = public.rid(4)), 1::float8, 'an offline check just outside 7 days and an online one at its edge: uptime 1');
select is((select uptime30 from v_relays_summaries where uuid = public.rid(5)), 1::float8, 'the same at the edge of 30 days');
select is((select uptime90 from v_relays_summaries where uuid = public.rid(6)), 1::float8, 'the same at the edge of 90 days');
select is((select uptime7 from v_relays_summaries where uuid = public.rid(7)), 0::float8, 'an online check just outside 7 days and an offline one at its edge: uptime 0');
select is((select uptime30 from v_relays_summaries where uuid = public.rid(4)), 0.5::float8, 'a check at the edge of 7 days and one just outside are both in 30 days');

-- a period with no check
select is((select uptime7 from v_relays_summaries where uuid = public.rid(5)), 0::float8, 'a relay checked only 30 days ago has uptime 0 over 7 days');

-- never online
select is((select uptime7 from v_relays_summaries where uuid = public.rid(8)), 0::float8, 'a relay found offline at each check has uptime 0');
select is((select is_online from v_relays_summaries where uuid = public.rid(8)), false, 'and is offline');

-- one row per bot, with a profile only
select is((select count(*)::int from v_relays_summaries where uuid = public.rid(3)), 1, 'a relay has one row, however many checks');
select is((select count(*)::int from v_relays_summaries where uuid = public.rid(9)), 0, 'a relay without a profile is not listed');
select is((select count(*)::int from v_relays_summaries where uuid in (select public.rid(n) from generate_series(1, 9) n)), 8, 'the relays with a profile are listed');

select * from finish();
rollback;
