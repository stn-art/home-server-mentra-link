# use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# ❌ УБРАЛИ apt-get полностью

# install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src/index.ts .
COPY --from=prerelease /usr/src/app/package.json .

# ✅ ВОТ ЭТО КЛЮЧ
COPY --from=prerelease /usr/src/app/fonts ./fonts

USER bun
EXPOSE 13376/tcp
ENTRYPOINT [ "bun", "run", "index.ts" ]