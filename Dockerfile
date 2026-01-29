FROM node:trixie-slim AS base
ENV HOME=/home TZ=Europe/London PORT=3000 CONFIG_ROOT=/config PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/.local/bin TEMP_ROOT=/tmp DB_FILE_NAME=file:/config/data.db
RUN apt update &&\
  DEBIAN_FRONTEND=noninteractive apt install -y jq iputils-ping &&\
  apt distclean
# single /home dir for all users
RUN rm -rf "$HOME"; mkdir -p "$HOME" "$CONFIG_ROOT" "$TEMP_ROOT"

FROM base AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install
COPY . .
COPY next.config.docker.ts next.config.ts
# need a db in order to compile the app
RUN mkdir .local &&\
  DB_FILE_NAME=file:.local/data.db npx drizzle-kit migrate &&\
  DB_FILE_NAME=file:.local/data.db NEXT_TELEMETRY_DISABLED=1 npm run build &&\
  rm -rf .local

FROM base AS final
VOLUME ["$CONFIG_ROOT"]
EXPOSE $PORT/tcp
WORKDIR /app
COPY --from=build /build/.next/standalone ./
COPY --from=build /build/public ./public
COPY --from=build /build/.next/static ./.next/static

# drizzle-kit for db migrations. npm cannot install a single package and honour version constraints from package.json. copying the entire node_modules dir from build seems a bit much
RUN npm install drizzle-kit@$(jq -r '.dependencies."drizzle-kit"' package.json)
COPY drizzle.config.ts ./
COPY migrations ./migrations
# container will be run as an arbitrary user. ensure they have permissions
RUN chmod -R ugo+rwX "$HOME" "$CONFIG_ROOT" "$TEMP_ROOT"
COPY --chmod=755 <<EOT /entrypoint.sh
#!/usr/bin/env sh
npx drizzle-kit migrate || exit 1
exec node server.js
EOT
ENTRYPOINT ["/entrypoint.sh"]