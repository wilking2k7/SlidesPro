-- CreateEnum
CREATE TYPE "SecretKind" AS ENUM ('GOOGLE_AI', 'ANTHROPIC', 'OPENAI');

-- CreateTable
CREATE TABLE "WorkspaceSecret" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "SecretKind" NOT NULL,
    "encrypted" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceSecret_workspaceId_idx" ON "WorkspaceSecret"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSecret_workspaceId_kind_key" ON "WorkspaceSecret"("workspaceId", "kind");

-- AddForeignKey
ALTER TABLE "WorkspaceSecret" ADD CONSTRAINT "WorkspaceSecret_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
