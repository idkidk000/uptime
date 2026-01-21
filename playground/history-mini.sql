select
  id,
  createdAt,
  state,
  json_extract(result,'$.latency')
from history
where serviceId = 1
order by createdAt desc
limit 24
;