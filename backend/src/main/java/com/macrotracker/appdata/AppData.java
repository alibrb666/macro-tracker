package com.macrotracker.appdata;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Die kompletten App-Daten EINES Benutzers als ein JSON-Block.
 *
 * Genau wie zuvor bei Supabase: pro Konto eine Zeile, die alles enthält
 * (alle Profile, getrackte Tage, Lebensmittel, Ziele, Gewichte).
 * Gespeichert wird der JSON-Text in einer TEXT-Spalte.
 */
@Entity
@Table(name = "mt_app_data")
public class AppData {

    /** Primärschlüssel = die User-ID (1:1-Beziehung Benutzer ↔ Datenblock). */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** Der rohe JSON-Text (columnDefinition = text → beliebig lang). */
    @Column(name = "data_json", columnDefinition = "text")
    private String dataJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected AppData() { }

    public AppData(Long userId, String dataJson) {
        this.userId = userId;
        this.dataJson = dataJson;
        this.updatedAt = Instant.now();
    }

    public Long getUserId() { return userId; }
    public String getDataJson() { return dataJson; }
    public void setDataJson(String dataJson) { this.dataJson = dataJson; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
