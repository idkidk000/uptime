![screenshot](res/screenshot.jpg)

I like [Uptime Kuma](https://github.com/louislam/uptime-kuma) so I thought i'd try to build my own for fun. It's very much a work in progress and there are a few janky bits which I'll tidy up later.

### What's missing
- Favicon (critical)
- Forms to add and edit monitors
- Forms to manage settings
- Visual service grouping
- `mqtt` monitor
- A Dockerfile
- The layout is not responsive
- Tags

### What's working
- Frontend
  - Service list
  - Dashboard
  - [Core UI components](components/): buttons, badges, popovers, modals, toasts, etc
- Backend
  - [Database](lib/drizzle/). [SQLite](https://sqlite.org/) and [Drizzle](https://orm.drizzle.team/) are very nice actually
  - [Workers](workers/)
  - [Internal messaging](lib/messaging/index.ts)
  - [Monitors](lib/monitor/). there are:
    - `dns` - tests that records exist and match your query
    - `domain` - tests domain registration expiry through [OpenRDAP](https://openrdap.org/api)
    - `http` - optionally supports [JSONata](https://docs.jsonata.org/overview.html), regex, and [XPath](https://developer.mozilla.org/en-US/docs/Web/XML/XPath/Guides) evaluation
    - `ping` - you may have heard of this
    - `ssl` - tests remote cert trust and expiry
    - `tcp`  - tests whether a TCP port can be connected to
  - [Notifications](lib/notifier/):
    - Only [Gotify](https://gotify.net/) is supported. I don't plan to add others
- [APIs](app/api/):
  - [SSE](app/api/sse/route.ts) for pushing out data updates and toasts to the [frontend](hooks/sse.tsx)
  - Read-only JSON API for integration with your other services:
    - /api/history, /api/history[id]
    - /api/state, /api/state/[id]
  - Badly behaved mock API for testing `http` monitor

### Requirements
- `ping` - Ping monitor. Due to how ping works, I have to call the binary and parse its output. Your system's `ping` must accept [these args](lib/monitor/ping.ts#L33) and its output must be matched by [these regexes](lib/monitor/ping.ts#L6) to work. Most Linuxes should be fine. Other OSes are unknown. The project will eventually be a Docker container so this will be a non-issue
- NodeJS 24+ - `Error.isError`. Deno and and the other one are likely fine but untested
- Firefox 147+ / Chromium 125+ - [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name#browser_compatibility) of [Popover](components/popover.tsx). Older versions will position popovers incorrectly. Other browsers are untested

### To test
- `git clone ...`
- create a file at `.env` with contents similar to `DB_FILE_NAME=file:.local/data.db`. You can additionally define:
  - `SSL_HOSTNAMES`: comma-separated list of fqdn:port, i.e. `host.domain.tld:8443,host2.other.tld:443`
  - `DOMAIN_NAMES`: comma-separated list of fqdn, i.e. `domain.tld,other.tld`
  - `GOTIFY_URL`, `GOTIFY_TOKEN`
- `md .local`
- `npm install`
- `npm run db:push` to create the db
- `npm run db:seed` seeds the db with some services to monitor. If you added extras to your `.env`, they will be created
- `npm run dev`

App should be available at http://localhost:3000/