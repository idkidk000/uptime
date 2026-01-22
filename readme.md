I like [Uptime Kuma](https://github.com/louislam/uptime-kuma) so I thought i'd try to build my own. Currently there's only a `http` monitor and you have to add your services to the database via [script](scripts/seed.ts) or `sqlite3`. The code is littered with `TODO`s and `FIXME`s (I have an extension, it's fine) and there are a lot of missing features.

Built on NextJS, Drizzle, and Tanstack Query. I'm abusing instrumentation to run my backend workers and run a [small unix socket server](lib/messaging/index.ts) to shuffle messages around the backend. Backend to frontend messaging is over [SSE](app/api/sse/route.ts).

To test:
- `git clone ...`
- create a file at `.env` with contents similar to `DB_FILE_NAME=file:.local/data.db`
- `md .local`
- `npm install` (you will need `node` 24+ for `Error.isError`)
- `npm run db:push` to create the db
- `npm run db:seed` seeds the db with some services to monitor. They each monitor `/api/mock/[json|xml]`
- `npm run dev`

App should be available at http://localhost:3000/

![screenshot](res/screenshot.jpg)