-- Custom SQL migration file, put your code below! --
insert into "group"(
  id,
  name,
  active,
  updatedAt
)
values (
  1,
  'Default group',
  true,
  unixepoch()
);