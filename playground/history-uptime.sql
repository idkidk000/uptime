select
  state,
  sum(nextCreatedAt - createdAt) as seconds
from (
    select createdAt,
      state,
      coalesce(lead(createdAt) over win, unixepoch()) as nextCreatedAt
    from history
    where serviceId = 1
    window win as (
        partition by serviceId
        order by createdAt
      )
  )
group by state;