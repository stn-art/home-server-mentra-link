FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --network-concurrency 4
COPY . .
EXPOSE 13376
CMD ["bun", "run", "start"]