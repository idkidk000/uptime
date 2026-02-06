![screenshot](res/screenshot.jpg)

I like [Uptime Kuma](https://github.com/louislam/uptime-kuma) so I thought i'd try to build my own for fun

### Structure
- Frontend
  - [Core UI components](components/). Handwritten using modern APIs and CSS (via [Tailwind](https://tailwindcss.com/)) with accessibility in mind
  - Forms. I'm using [Tanstack Form](https://tanstack.com/form/latest) and [Zod](https://zod.dev/) for validation
  - Realtime data updates with no loading states (except for history, which is fetched and cached as needed). I'm using [Tanstack Query](https://tanstack.com/query/latest) and [Server Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) for updates
  - Responsive layout
  - Light / dark
  - Service list
  - Dashboard
  - Service add / edit / clone
  - Settings
    - General
    - Notifier add / edit
    - Group add / edit
    - Tag add / edit
    - Data import / export
- Backend
  - [Database](lib/drizzle/). [SQLite](https://sqlite.org/) and [Drizzle](https://orm.drizzle.team/) are very nice actually
  - [Workers](workers/)
    - [Messaging](workers/messaging.ts) - backend messaging for row invalidations, performing actions in disconnected parts of the app, settings updates, etc
    - [DB maintenance](workers/db-maintenance.ts.ts) - scheduled history prune and DB vacuum
    - [Monitors](workers/monitor.ts) - runs monitors and updates service states
      - `dns` - tests that records exist and match your query
      - `domain` - tests domain registration expiry through [OpenRDAP](https://openrdap.org/api)
      - `http` - optionally supports [JSONata](https://docs.jsonata.org/overview.html), regex, and [XPath](https://developer.mozilla.org/en-US/docs/Web/XML/XPath/Guides) evaluation. JSONata lets you run queries like `($toMillis(events[eventAction="expiration"].eventDate) - $toMillis($now())) <= (86400000 * 28)` against the returned JSON
      - `mqtt` - supports the same query types as the `http` monitor
      - `ping` - you may have heard of this
      - `ssl` - tests remote cert trust and expiry
      - `tcp`  - tests whether a TCP port can be connected to
    - [Notifiers](workers/notifier.ts) - sends notifications
      - [Gotify](https://gotify.net/)
      - [Webhook](https://en.wikipedia.org/wiki/Webhook)
  - [APIs](app/api/):
    - [SSE](app/api/sse/route.ts) for pushing out data updates and toasts to the [frontend](hooks/sse.tsx)
    - Read-only JSON API for integration with your other services:
      - /api/history, /api/history[id]
      - /api/state, /api/state/[id]
      - /api/status
    - Badly behaved mock API at /api/mock/(json|xml) for testing `http` monitor
    - Mock post handler at /api/mock for testing `webhook` notifier

### Requirements
- Firefox 147+ / Chromium 125+ - [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name#browser_compatibility) of [Popover](components/popover.tsx). Older versions will position popovers incorrectly. Other browsers are untested

Only if you want to run the backend locally (i.e. not in Docker):
- `ping` - Ping monitor. Due to how ping works, I have to call the binary and parse its output. Your system's `ping` must accept [these args](lib/monitor/ping/index.ts#L22) and its output must be matched by [these regexes](lib/monitor/ping/index.ts#L6) to work. Most Linuxes should be fine. Other OSes are unknown

### To test
- `git clone ...`
- `npm run docker` will build and start the Docker container. By default it's executed as uid:gid 1000:1000, served on port 3000, and mounts `.local` into `/config` inside the container so that the database can be persisted. You can override this by copying the `docker:run` command from `package.json` / `scripts` into your terminal, amending `-u 1000:1000`, adding `-e PORT=1234`, and amending `-v ./.local:/config`

Alternatively, you can run the app locally:
- Make sure you're using Node 24+ as outlined in the `Requirements` section. You might want to use [nvm](https://github.com/nvm-sh/nvm) if your distro's version is older 
- `npm install`
- optionally set up some environment variables as outlined in the `Environment variables` section below
- `md .local`
- `npm run db:migrate` to create the db
- `npm run db:seed` seeds the db with some services to monitor. If you added extras to your `.env`, they will be created
- either:
  - `npm run local` to build and start production mode
  - `npm run dev` to run in dev mode. The frontend is cluttered with `NextJS`, `Tanstack Query`, and `Tanstack` dev tools icons, and performance is degraded since hot module reloading is active and all React hooks are run twice
  
### Environment variables
If using docker, add them to the `docker run` command you'll find in `package.json` under `scripts/docker:run` in the format `-e VAR_NAME=VALUE` 
If running locally, either make a `.env` file and add lines in the format `VAR_NAME=VALUE`
- `PORT` (only Docker): port on which to serve the app
- `DB_FILE_NAME`: path to SQLite database. Defaults to `fille:.local/data.db` locally and `file:config/data.db` in Docker
- `SSL_HOSTNAMES`: comma-separated list of FQDN:port to be added as SSL services, i.e. `host.domain.tld:8443,host2.other.tld:443`. You can use URLs if you prefer
- `DOMAIN_NAMES`: comma-separated list of FQDN to be added as Domain services, i.e. `domain.tld,other.tld`. You can use URLs if you prefer
- `GOTIFY_URL`, `GOTIFY_TOKEN`: to be added as a Gotify notifier
- `WEBHOOK_URL`: to be added as a Webhook notifier

App should be available at http://localhost:3000/