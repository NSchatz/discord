-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL,
    "logChannelId" TEXT,
    "muteRoleId" TEXT,
    "automod" BOOLEAN NOT NULL DEFAULT false,
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeChannel" TEXT,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Welcome to {server}, {user}! You are member #{memberCount}.',
    "goodbyeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "goodbyeChannel" TEXT,
    "goodbyeMessage" TEXT NOT NULL DEFAULT 'Goodbye {user.tag}, we''ll miss you!',
    "autoRoleId" TEXT,
    "enableEconomy" BOOLEAN NOT NULL DEFAULT true,
    "enableLeveling" BOOLEAN NOT NULL DEFAULT true,
    "enableTickets" BOOLEAN NOT NULL DEFAULT false,
    "enableMusic" BOOLEAN NOT NULL DEFAULT true,
    "enableAi" BOOLEAN NOT NULL DEFAULT false,
    "xpCooldown" INTEGER NOT NULL DEFAULT 60,
    "xpMin" INTEGER NOT NULL DEFAULT 15,
    "xpMax" INTEGER NOT NULL DEFAULT 25,
    "levelUpChannel" TEXT,
    "ignoredXpChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiChannelId" TEXT,
    "aiPersona" TEXT,
    "warnThresholdTimeout" INTEGER NOT NULL DEFAULT 3,
    "warnThresholdBan" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModAction" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEconomy" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" INTEGER NOT NULL DEFAULT 0,
    "bank" INTEGER NOT NULL DEFAULT 0,
    "bankMax" INTEGER NOT NULL DEFAULT 10000,
    "lastDaily" TIMESTAMP(3),
    "lastWork" TIMESTAMP(3),
    "lastRob" TIMESTAMP(3),

    CONSTRAINT "UserEconomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "roleId" TEXT,
    "maxQuantity" INTEGER NOT NULL DEFAULT -1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" TIMESTAMP(3),

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelReward" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "LevelReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT,
    "supportRoleId" TEXT NOT NULL,
    "logChannelId" TEXT,
    "panelChannelId" TEXT NOT NULL,
    "panelMessageId" TEXT,
    "greeting" TEXT NOT NULL DEFAULT 'A staff member will be with you shortly.',
    "maxOpen" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "TicketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" TEXT,
    "message" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "votes" JSONB NOT NULL DEFAULT '{}',
    "creatorId" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModAction_guildId_userId_idx" ON "ModAction"("guildId", "userId");

-- CreateIndex
CREATE INDEX "ModAction_guildId_createdAt_idx" ON "ModAction"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserEconomy_guildId_wallet_idx" ON "UserEconomy"("guildId", "wallet" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserEconomy_guildId_userId_key" ON "UserEconomy"("guildId", "userId");

-- CreateIndex
CREATE INDEX "ShopItem_guildId_idx" ON "ShopItem"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_guildId_userId_itemId_key" ON "Inventory"("guildId", "userId", "itemId");

-- CreateIndex
CREATE INDEX "Transaction_guildId_fromId_idx" ON "Transaction"("guildId", "fromId");

-- CreateIndex
CREATE INDEX "Transaction_guildId_toId_idx" ON "Transaction"("guildId", "toId");

-- CreateIndex
CREATE INDEX "UserLevel_guildId_level_idx" ON "UserLevel"("guildId", "level" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserLevel_guildId_userId_key" ON "UserLevel"("guildId", "userId");

-- CreateIndex
CREATE INDEX "LevelReward_guildId_idx" ON "LevelReward"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelReward_guildId_level_key" ON "LevelReward"("guildId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "TicketConfig_guildId_key" ON "TicketConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_userId_idx" ON "Ticket"("guildId", "userId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_status_idx" ON "Ticket"("guildId", "status");

-- CreateIndex
CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");
