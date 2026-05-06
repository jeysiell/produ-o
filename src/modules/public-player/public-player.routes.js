function registerPublicPlayerRoutes(app, { pool, getScheduleObjectBySchoolId, sendInternalError }) {
  app.get("/api/public/schools/:identifier/player", async (req, res) => {
    try {
      const identifier = String(req.params.identifier || "").trim();
      if (!identifier) return res.status(400).json({ error: "invalid_public_link" });

      const schoolResult = await pool.query(
        `
        SELECT id, name, slug, timezone, active, public_token, created_at
        FROM schools
        WHERE (public_token = $1 OR slug = $1) AND active = TRUE
        LIMIT 1
        `,
        [identifier]
      );

      if (!schoolResult.rowCount) {
        return res.status(404).json({ error: "public_school_not_found" });
      }

      const school = schoolResult.rows[0];
      const schedule = await getScheduleObjectBySchoolId(pool, school.id);
      const audioTracksResult = await pool.query(
        `
        SELECT id, name, public_url, duration_seconds
        FROM audio_tracks
        WHERE active = TRUE
        ORDER BY name ASC
        `
      );

      return res.json({
        school: {
          id: String(school.id),
          name: school.name,
          slug: school.slug,
          timezone: school.timezone,
        },
        schedule,
        audioTracks: audioTracksResult.rows.map((track) => ({
          id: String(track.id),
          name: track.name,
          publicUrl: track.public_url,
          durationSeconds: track.duration_seconds,
        })),
      });
    } catch (error) {
      console.error("GET /api/public/schools/:identifier/player error:", error);
      sendInternalError(res, "failed_to_load_public_player", error);
    }
  });
}

module.exports = { registerPublicPlayerRoutes };
