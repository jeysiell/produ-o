function registerAudioRoutes(
  app,
  {
    pool,
    authenticate,
    requirePermission,
    requireWriteAccess,
    hasEffectivePermission,
    mapAudioTrack,
    sendInternalError,
    audioStorageSoftLimitBytes,
    audioUploadMaxBytes,
    audioClipDurationSeconds,
    toIntId,
    slugify,
    crypto,
    uploadAudioClipToSupabase,
    getSupabasePublicStorageUrl,
    getRequestMeta,
    writeAuditLog,
    deleteAudioClipFromSupabase,
  }
) {
  app.get("/api/audio-tracks", authenticate, async (req, res) => {
    const includeInactive =
      req.query.includeInactive === "true" &&
      hasEffectivePermission(req.user, "features.audio_manage");
    try {
      const result = await pool.query(
        `
        SELECT at.id, at.name, at.storage_path, at.public_url, at.mime_type, at.size_bytes,
               at.duration_seconds, at.active, at.created_by, at.created_at, at.updated_at,
               u.name AS created_by_name
        FROM audio_tracks at
        LEFT JOIN users u ON u.id = at.created_by
        ${includeInactive ? "" : "WHERE at.active = TRUE"}
        ORDER BY at.name ASC
        `
      );
      res.json(result.rows.map(mapAudioTrack));
    } catch (error) {
      console.error("GET /api/audio-tracks error:", error);
      sendInternalError(res, "failed_to_list_audio_tracks", error);
    }
  });

  app.get(
    "/api/audio-tracks/stats",
    authenticate,
    requirePermission("menus.audios"),
    requirePermission("features.audio_manage"),
    async (_req, res) => {
      try {
        const result = await pool.query(
          `
          SELECT
            COUNT(*)::int AS total_tracks,
            COUNT(*) FILTER (WHERE active = TRUE)::int AS active_tracks,
            COALESCE(SUM(size_bytes), 0)::bigint AS total_size_bytes,
            COALESCE(SUM(size_bytes) FILTER (WHERE active = TRUE), 0)::bigint AS active_size_bytes
          FROM audio_tracks
          `
        );
        const row = result.rows[0] || {};
        const totalSizeBytes = Number(row.total_size_bytes) || 0;
        const softLimitBytes = Number(audioStorageSoftLimitBytes) || 0;
        const usagePercent = softLimitBytes > 0 ? (totalSizeBytes / softLimitBytes) * 100 : 0;
        res.json({
          totalTracks: Number(row.total_tracks) || 0,
          activeTracks: Number(row.active_tracks) || 0,
          totalSizeBytes,
          activeSizeBytes: Number(row.active_size_bytes) || 0,
          softLimitBytes,
          usagePercent,
          percentUsed: usagePercent,
          warningThresholdBytes: Math.floor(softLimitBytes * 0.8),
          warning: softLimitBytes > 0 && totalSizeBytes >= softLimitBytes * 0.8,
          uploadMaxBytes: audioUploadMaxBytes,
        });
      } catch (error) {
        console.error("GET /api/audio-tracks/stats error:", error);
        sendInternalError(res, "failed_to_get_audio_track_stats", error);
      }
    }
  );

  app.post(
    "/api/audio-tracks",
    authenticate,
    requirePermission("menus.audios"),
    requirePermission("features.audio_manage"),
    requireWriteAccess,
    async (req, res) => {
      const name = String(req.body?.name || "").trim();
      const audioBase64 = String(req.body?.audioBase64 || "").trim();
      const mimeType = String(req.body?.mimeType || "audio/wav").trim().toLowerCase();
      const originalFileName = String(req.body?.originalFileName || "").trim();
      const durationSeconds = Number.parseInt(
        String(req.body?.durationSeconds || audioClipDurationSeconds),
        10
      );

      if (!name) return res.status(400).json({ error: "name_is_required" });
      if (!audioBase64) return res.status(400).json({ error: "audio_clip_required" });
      if (!["audio/wav", "audio/wave", "audio/x-wav"].includes(mimeType)) {
        return res.status(400).json({ error: "unsupported_audio_clip_type" });
      }

      let buffer;
      try {
        buffer = Buffer.from(audioBase64, "base64");
      } catch (_error) {
        return res.status(400).json({ error: "invalid_audio_clip" });
      }

      if (!buffer.length) return res.status(400).json({ error: "empty_audio_clip" });
      if (buffer.length > audioUploadMaxBytes) {
        return res.status(413).json({ error: "audio_clip_too_large" });
      }

      const safeName = slugify(name).slice(0, 80) || "audio";
      const storagePath = `clips/${Date.now()}-${crypto.randomUUID()}-${safeName}.wav`;
      const contentType = "audio/wav";

      try {
        await uploadAudioClipToSupabase(storagePath, buffer, contentType);
        const publicUrl = getSupabasePublicStorageUrl(storagePath);
        const result = await pool.query(
          `
          INSERT INTO audio_tracks (
            name, storage_path, public_url, mime_type, size_bytes,
            duration_seconds, active, created_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)
          RETURNING id, name, storage_path, public_url, mime_type, size_bytes,
                    duration_seconds, active, created_by, created_at, updated_at
          `,
          [
            name,
            storagePath,
            publicUrl,
            contentType,
            buffer.length,
            Number.isInteger(durationSeconds) ? durationSeconds : audioClipDurationSeconds,
            req.user.id || null,
          ]
        );

        const created = mapAudioTrack(result.rows[0]);
        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.user.schoolId || null,
          action: "create_audio_track",
          resource: "audio_track",
          resourceId: String(created.id),
          afterData: {
            name: created.name,
            storagePath: created.storagePath,
            sizeBytes: created.sizeBytes,
            originalFileName,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });

        res.status(201).json(created);
      } catch (error) {
        if (error?.code === "SUPABASE_STORAGE_NOT_CONFIGURED") {
          return res.status(503).json({ error: "supabase_storage_not_configured" });
        }
        console.error("POST /api/audio-tracks error:", error);
        sendInternalError(res, "failed_to_create_audio_track", error);
      }
    }
  );

  app.patch(
    "/api/audio-tracks/:id",
    authenticate,
    requirePermission("menus.audios"),
    requirePermission("features.audio_manage"),
    requireWriteAccess,
    async (req, res) => {
      const audioTrackId = toIntId(req.params.id);
      if (!audioTrackId) return res.status(400).json({ error: "invalid_audio_track_id" });

      const updates = [];
      const values = [];
      if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
        const name = String(req.body.name || "").trim();
        if (!name) return res.status(400).json({ error: "name_cannot_be_empty" });
        values.push(name);
        updates.push(`name = $${values.length}`);
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "active")) {
        values.push(Boolean(req.body.active));
        updates.push(`active = $${values.length}`);
      }
      if (!updates.length) return res.status(400).json({ error: "no_fields_to_update" });

      try {
        values.push(audioTrackId);
        const result = await pool.query(
          `
          UPDATE audio_tracks
          SET ${updates.join(", ")}, updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING id, name, storage_path, public_url, mime_type, size_bytes,
                    duration_seconds, active, created_by, created_at, updated_at
          `,
          values
        );
        if (!result.rowCount) return res.status(404).json({ error: "audio_track_not_found" });

        const updated = mapAudioTrack(result.rows[0]);
        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.user.schoolId || null,
          action: "update_audio_track",
          resource: "audio_track",
          resourceId: String(updated.id),
          afterData: updated,
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });
        res.json(updated);
      } catch (error) {
        console.error("PATCH /api/audio-tracks/:id error:", error);
        sendInternalError(res, "failed_to_update_audio_track", error);
      }
    }
  );

  app.delete(
    "/api/audio-tracks/:id",
    authenticate,
    requirePermission("menus.audios"),
    requirePermission("features.audio_manage"),
    requireWriteAccess,
    async (req, res) => {
      const audioTrackId = toIntId(req.params.id);
      if (!audioTrackId) return res.status(400).json({ error: "invalid_audio_track_id" });

      try {
        const result = await pool.query(
          `
          UPDATE audio_tracks
          SET active = FALSE, updated_at = NOW()
          WHERE id = $1
          RETURNING id, name, storage_path, public_url, mime_type, size_bytes,
                    duration_seconds, active, created_by, created_at, updated_at
          `,
          [audioTrackId]
        );
        if (!result.rowCount) return res.status(404).json({ error: "audio_track_not_found" });

        const updated = mapAudioTrack(result.rows[0]);
        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.user.schoolId || null,
          action: "deactivate_audio_track",
          resource: "audio_track",
          resourceId: String(updated.id),
          afterData: updated,
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });
        res.json({ success: true, audioTrack: updated });
      } catch (error) {
        console.error("DELETE /api/audio-tracks/:id error:", error);
        sendInternalError(res, "failed_to_deactivate_audio_track", error);
      }
    }
  );

  app.delete(
    "/api/audio-tracks/:id/permanent",
    authenticate,
    requirePermission("menus.audios"),
    requirePermission("features.audio_manage"),
    requireWriteAccess,
    async (req, res) => {
      const audioTrackId = toIntId(req.params.id);
      if (!audioTrackId) return res.status(400).json({ error: "invalid_audio_track_id" });

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const trackResult = await client.query(
          `
          SELECT id, name, storage_path, public_url, mime_type, size_bytes,
                 duration_seconds, active, created_by, created_at, updated_at
          FROM audio_tracks
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
          `,
          [audioTrackId]
        );
        if (!trackResult.rowCount) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "audio_track_not_found" });
        }

        const track = trackResult.rows[0];
        const usageResult = await client.query(
          `
          SELECT COUNT(*)::int AS total
          FROM schedules
          WHERE music = $1
          `,
          [track.public_url]
        );
        const usageCount = Number(usageResult.rows[0]?.total) || 0;
        if (usageCount > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "audio_track_in_use",
            usageCount,
          });
        }

        await client.query("DELETE FROM audio_tracks WHERE id = $1", [audioTrackId]);
        await client.query("COMMIT");

        try {
          await deleteAudioClipFromSupabase(track.storage_path);
        } catch (storageError) {
          console.error("Supabase audio delete error:", storageError);
        }

        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.user.schoolId || null,
          action: "delete_audio_track_permanent",
          resource: "audio_track",
          resourceId: String(audioTrackId),
          beforeData: mapAudioTrack(track),
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });

        res.json({ success: true });
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("DELETE /api/audio-tracks/:id/permanent error:", error);
        sendInternalError(res, "failed_to_delete_audio_track_permanently", error);
      } finally {
        client.release();
      }
    }
  );
}

module.exports = { registerAudioRoutes };
