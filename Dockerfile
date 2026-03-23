# use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# ✅ локаль + ШРИФТЫ (ключевой фикс)
RUN apt-get update && apt-get install -y \
    locales \
    fontconfig \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && echo "ru_RU.UTF-8 UTF-8" >> /etc/locale.gen \
    && locale-gen ru_RU.UTF-8 \
    && update-locale LANG=ru_RU.UTF-8

ENV LANG ru_RU.UTF-8
ENV LANGUAGE ru_RU:ru
ENV LC_ALL ru_RU.UTF-8

# install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install production deps
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules + project
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src/index.ts .
COPY --from=prerelease /usr/src/app/package.json .

# run
USER bun
EXPOSE 13376/tcp
ENTRYPOINT [ "bun", "run", "index.ts" ]