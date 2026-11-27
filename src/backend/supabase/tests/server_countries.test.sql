-- US-B1, US-B2, US-B3, US-B4: the summary of the servers per country, which the website reads from
-- the servers and the latest status of each: the servers found online at their latest check, and
-- those found offline, in each country.
begin;
select plan(7);

insert into server_hosts (uuid, host)
  select ('a1000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid, 'countries-' || n || '.test' from generate_series(1, 6) n;
insert into server_identities (uuid, identity)
  select ('a2000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid, 'countries-identity-' || n from generate_series(1, 6) n;
insert into servers (uuid, protocol, host_uuid, identity_uuid)
  select ('a3000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid, 1,
         ('a1000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid, ('a2000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid
  from generate_series(1, 6) n;

-- 1: DE, offline then online; 2: DE, online; 3: DE, online then offline; 4: JP, online;
-- 5: JP then DE, online (its latest check is in DE); 6: no check
insert into server_statuses (server_uuid, status, country, info_page_available, created_at)
  select ('a3000000-0000-0000-0002-' || lpad(s::text, 12, '0'))::uuid, st, c, false, now()::timestamp - (ago || ' hours')::interval
  from (values (1, false, 'DE', 5), (1, true, 'DE', 1), (2, true, 'DE', 1), (3, true, 'DE', 5), (3, false, 'DE', 1),
               (4, true, 'JP', 1), (5, true, 'JP', 5), (5, true, 'DE', 1)) v (s, st, c, ago);

set local role anon;

create temp view per_country as
  select country, count(*) filter (where status)::int as active, count(*) filter (where not status)::int as inactive
  from (
    select distinct on (server_uuid) server_uuid, country, status
    from server_statuses
    where server_uuid in (select uuid from servers where host_uuid::text like 'a1000000-0000-0000-0002-%')
    order by server_uuid, created_at desc
  ) latest
  group by country;
grant select on per_country to anon;

select is((select active from per_country where country = 'DE'), 3, 'Germany has the 3 servers found online at their latest check');
select is((select inactive from per_country where country = 'DE'), 1, 'and the 1 found offline');
select is((select active from per_country where country = 'JP'), 1, 'Japan has its 1 online server, the one that moved to Germany not counted');
select is((select inactive from per_country where country = 'JP'), 0, 'and none offline');
select is((select count(*)::int from per_country), 2, 'a server with no check is in no country');
select is((select sum(active)::int from per_country), 4, 'the servers found online are 4 in all');
select is((select count(*)::int from v_server_summaries where server_uuid in (select uuid from servers where host_uuid::text like 'a1000000-0000-0000-0002-%')), 6, 'every server, checked or not, is listed');

select * from finish();
rollback;
