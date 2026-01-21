select
  serviceId,
  result,
  state,
  createdAt
from (
  select
    *,
    lag(state) over win as prevState,
    lag(result) over win as prevResult
  from history
  window win as (
    partition by serviceId
    order by createdAt
  )
)
where prevState is null
  or state != prevState
  or (
    result is not null and prevResult is not null and (
      json_extract(result, '$.kind') != json_extract(prevResult, '$.kind')
      or json_extract(result, '$.reason') != json_extract(prevResult, '$.reason')
    )
  )
limit 10
offset 5
;