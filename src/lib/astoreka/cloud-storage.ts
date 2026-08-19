import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

import { normalizeAppData } from "./storage";
import type { AppData } from "./types";

type CloudSnapshotRow = {
  owner_id: string;
  data: AppData;
  sequence: number;
  updated_at: string;
  source: "records" | "snapshot";
};

type AstorekaEntity = Exclude<keyof AppData, "sequence">;
type AstorekaRecordRow = Tables<"astoreka_records">;

const APP_DATA_ENTITIES = [
  "clients",
  "assets",
  "materials",
  "jobs",
  "invoices",
  "estimates",
  "expenses",
  "suppliers",
  "purchases",
  "creditNotes",
  "events",
  "knowledge",
] as const satisfies readonly AstorekaEntity[];

const ENTITY_FALLBACKS = Object.fromEntries(
  APP_DATA_ENTITIES.map((entity) => [entity, []]),
) as Record<AstorekaEntity, unknown[]>;

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

  const records = await loadCloudRecords(user.id);
  if (records) {
    return records;
  }

  return loadCloudSnapshot(user.id);
}

async function loadCloudSnapshot(userId: string): Promise<CloudSnapshotRow | null> {
  const { data, error } = await supabase
    .from("app_snapshots")
    .select("owner_id,data,sequence,updated_at")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        ...data,
        data: normalizeAppData(data.data),
        source: "snapshot",
      }
    : null;
}

async function loadCloudRecords(userId: string): Promise<CloudSnapshotRow | null> {
  const { data, error } = await supabase
    .from("astoreka_records")
    .select("owner_id,entity,record_id,data,sync_token,created_at,updated_at,record_key")
    .eq("owner_id", userId);

  if (error) {
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return {
    owner_id: userId,
    data: appDataFromRecords(data),
    sequence: getSequenceFromRecords(data),
    updated_at: getLatestRecordUpdate(data),
    source: "records",
  };
}

export async function saveCloudAppData(data: AppData) {
  const user = await getCloudUser();
  if (!user) {
    return null;
  }

  const records = await saveCloudRecords(user.id, data);
  if (records) {
    void saveCloudSnapshot(user.id, data).catch(() => undefined);
    return records;
  }

  return saveCloudSnapshot(user.id, data);
}

async function saveCloudSnapshot(userId: string, data: AppData): Promise<CloudSnapshotRow> {
  const { data: saved, error } = await supabase
    .from("app_snapshots")
    .upsert(
      {
        owner_id: userId,
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
    source: "snapshot",
  };
}

async function saveCloudRecords(userId: string, data: AppData): Promise<CloudSnapshotRow | null> {
  const syncToken = new Date().toISOString();
  const records = appDataToRecords(userId, data, syncToken);

  const { error: upsertError } = await supabase
    .from("astoreka_records")
    .upsert(records, { onConflict: "owner_id,entity,record_id" });

  if (upsertError) {
    return null;
  }

  const { error: deleteError } = await supabase
    .from("astoreka_records")
    .delete()
    .eq("owner_id", userId)
    .neq("sync_token", syncToken);

  if (deleteError) {
    return null;
  }

  return {
    owner_id: userId,
    data,
    sequence: data.sequence,
    updated_at: syncToken,
    source: "records",
  };
}

function appDataToRecords(userId: string, data: AppData, syncToken: string) {
  const rows = APP_DATA_ENTITIES.flatMap((entity) =>
    data[entity].map((record) => ({
      owner_id: userId,
      entity,
      record_id: record.id,
      data: record as unknown as Json,
      sync_token: syncToken,
    })),
  );

  rows.push({
    owner_id: userId,
    entity: "meta",
    record_id: "sequence",
    data: { sequence: data.sequence },
    sync_token: syncToken,
  });

  return rows;
}

function appDataFromRecords(rows: AstorekaRecordRow[]): AppData {
  const grouped = { ...ENTITY_FALLBACKS };
  let sequence = 1;

  rows.forEach((row) => {
    if (row.entity === "meta" && row.record_id === "sequence") {
      const meta =
        row.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : {};
      sequence = typeof meta.sequence === "number" ? meta.sequence : sequence;
      return;
    }

    if (isAppDataEntity(row.entity)) {
      grouped[row.entity] = [...grouped[row.entity], row.data];
    }
  });

  return normalizeAppData({
    ...grouped,
    sequence,
  });
}

function isAppDataEntity(value: string): value is AstorekaEntity {
  return APP_DATA_ENTITIES.includes(value as AstorekaEntity);
}

function getSequenceFromRecords(rows: AstorekaRecordRow[]) {
  const meta = rows.find((row) => row.entity === "meta" && row.record_id === "sequence");
  if (!meta || typeof meta.data !== "object" || Array.isArray(meta.data) || meta.data === null) {
    return 1;
  }

  return typeof meta.data.sequence === "number" ? meta.data.sequence : 1;
}

function getLatestRecordUpdate(rows: AstorekaRecordRow[]) {
  return (
    rows
      .map((row) => row.updated_at)
      .sort()
      .at(-1) ?? new Date().toISOString()
  );
}
