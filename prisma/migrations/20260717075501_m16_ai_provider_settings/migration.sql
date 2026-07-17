-- CreateEnum
CREATE TYPE "AiProviderName" AS ENUM ('google', 'anthropic', 'groq');

-- CreateTable
CREATE TABLE "AiProviderSetting" (
    "provider" "AiProviderName" NOT NULL,
    "apiKeyCiphertext" TEXT,
    "models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderSetting_pkey" PRIMARY KEY ("provider")
);
