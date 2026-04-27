"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setSecret, deleteSecret, getPersonalWorkspaceId } from "@/lib/secrets";
import { SecretKind } from "@prisma/client";

export async function saveSecretAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");

  const kindRaw = String(formData.get("kind") ?? "");
  const value = String(formData.get("value") ?? "").trim();

  if (!Object.values(SecretKind).includes(kindRaw as SecretKind)) {
    throw new Error("invalid kind");
  }
  if (!value) throw new Error("La API key no puede estar vacía");
  if (value.length < 8) throw new Error("La API key parece demasiado corta");

  const workspaceId = await getPersonalWorkspaceId(session.user.id);
  await setSecret(workspaceId, kindRaw as SecretKind, value);
  revalidatePath("/dashboard/settings");
}

export async function deleteSecretAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");

  const kindRaw = String(formData.get("kind") ?? "");
  if (!Object.values(SecretKind).includes(kindRaw as SecretKind)) {
    throw new Error("invalid kind");
  }

  const workspaceId = await getPersonalWorkspaceId(session.user.id);
  await deleteSecret(workspaceId, kindRaw as SecretKind);
  revalidatePath("/dashboard/settings");
}
