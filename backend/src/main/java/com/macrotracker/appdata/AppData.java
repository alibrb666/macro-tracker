package com.macrotracker.appdata;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Die kompletten App-Daten EINES Benutzers als ein JSON-Block.
 *
 * Schlüssel ist die Supabase-User-UUID (Auth läuft komplett über Supabase).
 * Pro Konto eine Zeile, die alles enthält (Profile, Tage, Lebensmittel, Ziele,
 * Gewichte). Gespeichert als JSON-Text in einer TEXT-Spalte.
 */
@Entity
@Table(name = "mt_user_data")
public class AppData {

    /** Primärschlüssel = Supabase-User-UUID (als Text). */
    @Id
    @Column(name = "user_id", length = 64)
    private String userId;

    /** Der rohe JSON-Text (columnDefinition = text → beliebig lang). */
    @Column(name = "data_json", columnDefinition = "text")
    private String dataJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected AppData() { }

    public AppData(String userId, String dataJson) {
        this.userId = userId;
        this.dataJson = dataJson;
        this.updatedAt = Instant.now();
    }

    public String getUserId() { return userId; }
    public String getDataJson() { return dataJson; }
    public void setDataJson(String dataJson) { this.dataJson = dataJson; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
