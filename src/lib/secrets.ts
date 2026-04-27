import { prisma } from "@/lib/db";
import { encrypt, decrypt, hintFor } from "@/lib/crypto/secrets";
import { SecretKind } from "@prisma/client";

/**
 * Capa de acceso a secrets por workspace.
 *
 * Resolución de keys (orden de prioridad):
 *   1. Secret guardado en BD para el workspace (cifrado con AUTH_SECRET)
 *   2. Variable de entorno (fallback dev / global SaaS)
 *
 * Si ninguno está configurado, devuelve null. El llamador decide si
 * eso es un error de UX o si debe ocurrir un fallback.
 */

const ENV_VAR: Record<SecretKind, string> = {
  GOOGLE_AI: "GOOGLE_AI_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  OPENAI: "OPENAI_API_KEY",
};

export type SecretInfo = {
  kind: SecretKind;
  source: "workspace" | "env" | null;
  hint: string | null;
};

export async function listSecretsInfo(workspaceId: string): Promise<SecretInfo[]> {
  const rows = await prisma.workspaceSecret.findMany({
    where: { workspaceId },
    select: { kind: true, hint: true },
  });
  const byKind = new Map(rows.map((r) => [r.kind, r.hint]));

  return (Object.keys(ENV_VAR) as SecretKind[]).map((kind) => {
    const hint = byKind.get(kind);
    if (hint) return { kind, source: "workspace", hint };
    if (process.env[ENV_VAR[kind]]) {
      const v = process.env[ENV_VAR[kind]]!;
      return { kind, source: "env", hint: hintFor(v) };
    }
    return { kind, source: null, hint: null };
  });
}

export async function resolveSecret(
  workspaceId: string,
  kind: SecretKind
): Promise<string | null> {
  const row = await prisma.workspaceSecret.findUnique({
    where: { workspaceId_kind: { workspaceId, kind } },
    select: { encrypted: true },
  });
  if (row) {
    try {
      return decrypt(row.encrypted);
    } catch (err) {
      console.error("[secrets] decrypt failed for workspace", workspaceId, kind, err);
      // Si AUTH_SECRET cambió, la key ya no es recuperable. Caemos al env.
    }
  }
  return process.env[ENV_VAR[kind]] ?? null;
}

export async function setSecret(workspaceId: string, kind: SecretKind, value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("La API key no puede estar vacía");
  const encrypted = encrypt(trimmed);
  const hint = hintFor(trimmed);
  await prisma.workspaceSecret.upsert({
    where: { workspaceId_kind: { workspaceId, kind } },
    update: { encrypted, hint },
    create: { workspaceId, kind, encrypted, hint },
  });
}

export async function deleteSecret(workspaceId: string, kind: SecretKind) {
  await prisma.workspaceSecret
    .delete({ where: { workspaceId_kind: { workspaceId, kind } } })
    .catch(() => {
      /* not found is ok */
    });
}

/**
 * Helper para obtener el workspace personal (OWNER) del usuario.
 * Se usa en flujos de UI/Settings antes de tener selector de workspace.
 */
export async function getPersonalWorkspaceId(userId: string): Promise<string> {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, role: "OWNER" },
    select: { workspaceId: true },
  });
  if (!member) throw new Error("El usuario no tiene workspace personal");
  return member.workspaceId;
}
