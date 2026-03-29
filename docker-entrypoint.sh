#!/bin/sh
set -e

# Run pending migrations (safe to run repeatedly — only applies new ones)
npx prisma migrate deploy

# Start the bot
exec node dist/index.js
