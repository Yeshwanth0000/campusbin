-- Adds back the activation funnel (sellers, messagers) and retention
-- (active_24h, active_7d, never_returned) fields that the original
-- admin_dashboard_stats() had, scoped to the overview function's college
-- selection. Retention is deliberately NOT tied to the selected date
-- range -- "last active" should mean the same thing whether you're
-- looking at Day or Year.
create or replace function public.admin_dashboard_overview(
  p_college_id uuid default null,
  p_granularity text default 'day'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  caller_college uuid;
  caller_is_admin boolean;
  caller_is_superadmin boolean;
  target_college uuid;
  granularity text;
  range_start timestamptz;
  range_end timestamptz := date_trunc('day', now()) + interval '1 day';
  prev_start timestamptz;
  prev_end timestamptz;
  result jsonb;
begin
  select college_id, coalesce(is_admin, false), coalesce(is_superadmin, false)
    into caller_college, caller_is_admin, caller_is_superadmin
  from public.profiles
  where id = auth.uid();

  if not (caller_is_admin or caller_is_superadmin) then
    raise exception 'admin_dashboard_overview: not authorised';
  end if;

  target_college := case when caller_is_superadmin then p_college_id else caller_college end;

  granularity := case when p_granularity in ('day', 'week', 'month', 'year') then p_granularity else 'day' end;

  range_start := case granularity
    when 'day' then date_trunc('day', now()) - interval '29 days'
    when 'week' then date_trunc('week', now()) - interval '11 weeks'
    when 'month' then date_trunc('month', now()) - interval '11 months'
    else date_trunc('year', now()) - interval '4 years'
  end;
  prev_end := range_start;
  prev_start := range_start - (range_end - range_start);

  with
  scoped_profiles as (
    select p.* from public.profiles p
    where target_college is null or p.college_id = target_college
  ),
  scoped_listings as (
    select l.* from public.listings l
    where target_college is null or l.college_id = target_college
  ),
  scoped_convo as (
    select c.id, c.created_at, c.buyer_id, c.seller_id
    from public.conversations c
    join public.profiles bp on bp.id = c.buyer_id
    where target_college is null or bp.college_id = target_college
  ),
  scoped_messages as (
    select m.* from public.messages m
    join scoped_convo c on c.id = m.conversation_id
  ),

  seen as (
    select p.id, p.created_at as signed_up_at, u.last_sign_in_at
    from scoped_profiles p
    join auth.users u on u.id = p.id
  ),

  buckets as (
    select gs.bucket
    from generate_series(range_start, date_trunc(granularity, now()), (('1 ' || granularity))::interval) as gs(bucket)
  ),
  signup_series as (
    select b.bucket,
           (select count(*) from scoped_profiles p where date_trunc(granularity, p.created_at) = b.bucket) as n
    from buckets b
  ),
  listing_series as (
    select b.bucket,
           (select count(*) from scoped_listings l where date_trunc(granularity, l.created_at) = b.bucket) as n
    from buckets b
  ),
  message_series as (
    select b.bucket,
           (select count(*) from scoped_messages m where date_trunc(granularity, m.created_at) = b.bucket) as n
    from buckets b
  ),

  kpi as (
    select
      (select count(*) from scoped_profiles) as users_total,
      (select count(*) from scoped_profiles where created_at >= range_start) as users_in_range,
      (select count(*) from scoped_profiles where created_at >= prev_start and created_at < prev_end) as users_prev_range,
      (select count(*) from scoped_listings) as listings_total,
      (select count(*) from scoped_listings where created_at >= range_start) as listings_in_range,
      (select count(*) from scoped_listings where created_at >= prev_start and created_at < prev_end) as listings_prev_range,
      (select count(*) from scoped_listings where status = 'available') as listings_available,
      (select count(*) from scoped_listings where status = 'sold') as listings_sold,
      (select count(*) from scoped_listings where status = 'expired') as listings_expired,
      (select count(*) from scoped_messages) as messages_total,
      (select count(*) from scoped_messages where created_at >= range_start) as messages_in_range,
      (select count(*) from scoped_messages where created_at >= prev_start and created_at < prev_end) as messages_prev_range,
      (select count(*) from scoped_convo) as conversations_total,
      (select count(*) from scoped_profiles p join auth.users u on u.id = p.id where u.last_sign_in_at >= range_start) as active_in_range,
      (select coalesce(sum(l.view_count), 0) from scoped_listings l) as total_views,
      (select coalesce(percentile_cont(0.5) within group (order by l.price), 0) from scoped_listings l where l.price > 0) as median_price,
      (select count(distinct l.seller_id) from scoped_listings l) as sellers,
      (select count(distinct m.sender_id) from scoped_messages m) as messagers,
      (select count(*) from seen where last_sign_in_at >= now() - interval '24 hours') as active_24h,
      (select count(*) from seen where last_sign_in_at >= now() - interval '7 days') as active_7d,
      (select count(*) from seen where last_sign_in_at is null or last_sign_in_at <= signed_up_at + interval '30 minutes') as never_returned,
      (select case when count(*) = 0 then 0
              else round(100.0 * count(*) filter (where status = 'sold') / count(*)) end
         from scoped_listings) as sell_through_pct,
      (select count(*) from public.reports r
         join public.profiles rp on rp.id = r.reporter_id
        where (target_college is null or rp.college_id = target_college) and r.status = 'open') as reports_open
  ),

  by_category as (
    select cat.name as name, count(l.id) as listings
    from public.categories cat
    left join scoped_listings l on l.category_id = cat.id
    group by cat.name having count(l.id) > 0
    order by count(l.id) desc
  ),

  by_weekday as (
    select w.dow,
           (select count(*) from scoped_messages m
             where extract(dow from m.created_at at time zone 'Asia/Kolkata') = w.dow) as n
    from generate_series(0, 6) as w(dow)
  ),

  by_hour as (
    select h.hour,
           (select count(*) from scoped_messages m
             where extract(hour from m.created_at at time zone 'Asia/Kolkata') = h.hour) as n
    from generate_series(0, 23) as h(hour)
  ),

  price_buckets as (
    select b.label, b.sort,
           (select count(*) from scoped_listings l
             where l.price >= b.lo and (b.hi is null or l.price < b.hi)) as n
    from (values
      ('Free', 0, 1, 1), ('Under 200', 1, 200, 2), ('200-500', 200, 500, 3),
      ('500-1k', 500, 1000, 4), ('1k-5k', 1000, 5000, 5), ('5k+', 5000, null, 6)
    ) as b(label, lo, hi, sort)
  ),

  book_departments as (
    select coalesce(nullif(l.custom_fields->>'department', ''), 'Not set') as name, count(*) as n
    from scoped_listings l
    join public.categories cat on cat.id = l.category_id
    where cat.slug = 'books'
    group by 1
  ),

  top_sellers as (
    select coalesce(p.full_name, 'Student') as name, count(l.id) as listings, coalesce(sum(l.view_count), 0) as views
    from scoped_listings l
    join public.profiles p on p.id = l.seller_id
    group by p.id, p.full_name
    order by count(l.id) desc
    limit 5
  ),

  top_listings as (
    select l.id, l.title, l.view_count, l.status
    from scoped_listings l
    order by l.view_count desc
    limit 8
  ),

  colleges_breakdown as (
    select c.id, c.name,
      (select count(*) from public.profiles p where p.college_id = c.id) as users,
      (select count(*) from public.listings l where l.college_id = c.id) as listings,
      (select count(*) from public.messages m
         join public.conversations co on co.id = m.conversation_id
         join public.profiles bp on bp.id = co.buyer_id
        where bp.college_id = c.id) as messages,
      (select count(*) from public.profiles p join auth.users u on u.id = p.id
        where p.college_id = c.id and u.last_sign_in_at >= range_start) as active_in_range,
      (select case when count(*) = 0 then 0
              else round(100.0 * count(*) filter (where status = 'sold') / count(*)) end
         from public.listings l where l.college_id = c.id) as sell_through_pct
    from public.colleges c
    order by users desc
  )

  select jsonb_build_object(
    'scope', jsonb_build_object(
      'is_superadmin', caller_is_superadmin,
      'college_id', target_college,
      'college_name', (select name from public.colleges where id = target_college),
      'granularity', granularity,
      'range_start', range_start,
      'range_end', range_end
    ),
    'colleges', case when caller_is_superadmin and target_college is null
                     then (select coalesce(jsonb_agg(cb order by cb.users desc), '[]'::jsonb) from colleges_breakdown cb)
                     else null end,
    'kpis', (select to_jsonb(k) from kpi k),
    'series', jsonb_build_object(
      'signups', (select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'n', n) order by bucket), '[]'::jsonb) from signup_series),
      'listings', (select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'n', n) order by bucket), '[]'::jsonb) from listing_series),
      'messages', (select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'n', n) order by bucket), '[]'::jsonb) from message_series)
    ),
    'by_category', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from by_category x),
    'by_weekday', (select coalesce(jsonb_agg(to_jsonb(x) order by x.dow), '[]'::jsonb) from by_weekday x),
    'by_hour', (select coalesce(jsonb_agg(to_jsonb(x) order by x.hour), '[]'::jsonb) from by_hour x),
    'price_buckets', (select coalesce(jsonb_agg(to_jsonb(x) order by x.sort), '[]'::jsonb) from price_buckets x),
    'book_departments', (select coalesce(jsonb_agg(to_jsonb(x) order by x.n desc), '[]'::jsonb) from book_departments x),
    'top_sellers', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from top_sellers x),
    'top_listings', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from top_listings x),
    'generated_at', to_char(now() at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI am')
  ) into result;

  return result;
end;
$function$;
