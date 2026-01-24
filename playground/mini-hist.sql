select
  min(createdAt) as 'from',
  max(createdAt) as 'to',
  json_group_array(json(obj)) as items
from (
  select
    createdAt,
    iif(latency is null, obj, json_patch(obj, json_object('latency', latency))) as obj
  from (
    select
      createdAt,
      json_extract(result, '$.latency') as latency,
      json_object(
        'id', id,
        'state', state
      ) as obj
    from history
    where serviceId = 1
    order by createdAt desc
    limit 5
  )
)