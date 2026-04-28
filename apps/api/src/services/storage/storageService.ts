import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, flags } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export class StorageService {
  private readonly admin: SupabaseClient | null;
  private readonly localRoot = path.resolve(process.cwd(), "tmp");

  constructor() {
    this.admin =
      flags.hasSupabaseAdmin && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
          })
        : null;
  }

  async storeFile(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    userId: string | null;
    guestSessionId?: string | null;
    preferRemote: boolean;
  }) {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const objectId = `${randomUUID()}-${safeName}`;
    const scope = input.userId ?? input.guestSessionId ?? "guest";

    if (input.preferRemote && this.admin) {
      const objectPath = `${scope}/${objectId}`;
      const { error } = await this.admin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .upload(objectPath, input.buffer, {
          contentType: input.mimeType,
          upsert: false
        });

      if (!error) {
        const { data } = this.admin.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
        return {
          storagePath: objectPath,
          previewUrl: data.publicUrl
        };
      }

      logger.warn("Falling back to local storage after remote upload failure", { error: error.message });
    }

    await mkdir(this.localRoot, { recursive: true });
    const localPath = path.join(this.localRoot, `${scope}-${objectId}`);
    await writeFile(localPath, input.buffer);

    return {
      storagePath: localPath,
      previewUrl: null
    };
  }
}
