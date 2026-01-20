I like Uptime Kuma so I thought i'd try to build my own. Currently there's only a `http` monitor and you have to add your services to the database via [script](scripts/seed.ts) or `sqlite3`. The code is littered with `TODO`s and `FIXME`s and there are a lot of missing features.

Built on NextJS, Drizzle, and React Query. I'm abusing instrumentation to run my backend workers so it will all run in a single container with no external deps.

![screenshot](res/screenshot.jpg)