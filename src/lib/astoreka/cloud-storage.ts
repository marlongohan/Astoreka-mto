import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

import { normalizeAppData } from "./storage";
import type { AppData } from "./types";

type CloudSnapshotRow = {
  owner_id: string;
  data: AppData;
  sequence: number;
  updated_at: string;
};

export type CloudSyncState =
  | { status: "local"; message: string }
  | { status: "signed-out"; message: string }
  | { status: "ready"; userId: string; email: string; message: string }
  | { status: "syncing"; userId: string; email: string; message: string }
  | { status: "error"; message: string };

export async function getCloudUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

export async function signInToCloud(email: string, password: string) {
  const credentials = { email: email.trim(), password };
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (!error) {
    return;
  }

  const signUpResult = await supabase.auth.signUp(credentials);
  if (signUpResult.error) {
    throw signUpResult.error;
  }
}

export async function signOutFromCloud() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function loadCloudAppData() {
  const user = await getCloudUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_snapshots")
    .select("owner_id,data,sequence,updated_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        ...data,
        data: normalizeAppData(data.data),
      }
    : null;
}

export async function saveCloudAppData(data: AppData) {
  const user = await getCloudUser();
  if (!user) {
    return null;
  }

  const { data: saved, error } = await supabase
    .from("app_snapshots")
    .upsert(
      {
        owner_id: user.id,
        data: data as unknown as Json,
        sequence: data.sequence,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" },
    )
    .select("owner_id,data,sequence,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    ...saved,
    data: saved.data as unknown as AppData,
  };
}
