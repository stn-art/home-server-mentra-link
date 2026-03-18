FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
EXPOSE 13375
CMD ["bun", "run", "start"]