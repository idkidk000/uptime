select
  round(
    100.0
    * cast(coalesce(sum(seconds) filter(where state = 0), 0) as real)
    / cast(coalesce(nullif(sum(seconds), 0), 1) as real),
    3
  ) as uptime30,
  round(
    100.0
    * cast(coalesce(sum(seconds) filter(where state = 0 and is1d), 0) as real)
    / cast(coalesce(nullif(sum(seconds) filter(where is1d), 0), 1) as real),
    3
  )
  as uptime1
from (
  select
    createdAt,
    state,
    coalesce(lead(createdAt) over win, unixepoch()) - createdAt as seconds,
    iif(createdAt >= unixepoch('now', '-1 day'), 1, 0) as is1d
  from history
  where
    serviceId = 3
    and createdAt >= unixepoch('now', '-30 day')
    and state != 3
  window win as (
    order by createdAt
  )
);
