select
  round(
    coalesce(sum(latency),0)
    / coalesce(count(1),1),
    3
  ) as latency1d
from (
  select
    json_extract(result, '$.latency') as latency
  from history
  where
    serviceId = 1
    and createdAt >= unixepoch('now', '-1 day')
    and latency is not null
)
;