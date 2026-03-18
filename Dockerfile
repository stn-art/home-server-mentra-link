FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --network-concurrency 4
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]