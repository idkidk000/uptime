![screenshot](res/screenshot.jpg)

I like [Uptime Kuma](https://github.com/louislam/uptime-kuma) so I thought i'd try to build my own for fun. It's very much a work in progress and there are a few janky bits which I'll tidy up later.

### What's missing
- Favicon (critical)
- Forms to add and edit monitors
- Forms to manage settings
- Visual service grouping
- `mqtt` monitor
- A Dockerfile
- Light mode is a bit broken and the layout is not responsive
- Tags

### What's working
- Frontend
  - Service list
  - Dashboard
  - [Core UI components](/components/): buttons, badges, popovers, modals, toasts, etc
- Backend
  - [Database](lib/drizzle/). [SQLite](https://sqlite.org/) and [Drizzle](https://orm.drizzle.team/) are very nice actually
  - [Workers](/workers/)
  - [Internal messaging](lib/messaging/)
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
  - SSE for pushing out data updates and toasts to the frontend
  - Read-only JSON AQI for integration with your other services:
    - /api/history, /api/history[id]
    - /api/state, /api/state/[id]
  - Badly behaved mock API for testing `http` monitor

### To test
- `git clone ...`
- create a file at `.env` with contents similar to `DB_FILE_NAME=file:.local/data.db`. the [seed](/scripts/seed.ts) script will create the following monitors/notifiers if you define them in this file:
  - `SSL_HOSTNAMES`: comma-seperated list of fqdn:port, i.e. host.domain.tld:8443,host2.other.tld:443
  - `DOMAIN_NAMES`: comma-seperated list of fqdn, i.e. domain.tld,other.tld
  - `GOTIFY_URL`, `GOTIFY_TOKEN`
- `md .local`
- `npm install` (you will need `node` 24+ for `Error.isError`)
- `npm run db:push` to create the db
- `npm run db:seed` seeds the db with some services to monitor. They each monitor `/api/mock/[json|xml]`
- `npm run dev`

App should be available at http://localhost:3000/. You need Firefox 147+ for anchor positioning. Recent Chromium derivatives should be fine.