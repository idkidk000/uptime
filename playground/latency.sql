select
  coalesce(sum(latency), 0) / iif(count(1) > 0, count(1), 1) as avg
from (
  select json_extract(result, '$.latency') as latency
  from history
  where serviceId = 1 and latency is not null
)
