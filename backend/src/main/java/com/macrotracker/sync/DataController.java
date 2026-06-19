package com.macrotracker.sync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.macrotracker.appdata.AppData;
import com.macrotracker.appdata.AppDataRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

/**
 * REST-Controller für den Datenabgleich (Cloud-Sync).
 *
 *   GET /api/data   → den gespeicherten Datenblock des angemeldeten Nutzers holen
 *   PUT /api/data   → den Datenblock speichern/überschreiben (upsert)
 *
 * Beide Endpunkte sind geschützt: ohne gültiges JWT kommt man nicht rein.
 * Wer angemeldet ist, liefert @AuthenticationPrincipal (= die User-ID aus dem Token).
 */
@RestController
@RequestMapping("/api/data")
public class DataController {

    private final AppDataRepository repo;
    private final ObjectMapper mapper;   // JSON <-> Java, von Spring bereitgestellt

    public DataController(AppDataRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    /** Antwort-Form: der JSON-Datenblock plus Zeitstempel der letzten Änderung. */
    public record DataResponse(JsonNode data, Instant updatedAt) { }

    /** Anfrage-Form beim Speichern: { "data": { ... } }. */
    public record DataRequest(JsonNode data) { }

    @GetMapping
    public DataResponse get(@AuthenticationPrincipal Long userId) throws Exception {
        AppData row = repo.findById(userId).orElse(null);
        if (row == null || row.getDataJson() == null) {
            return new DataResponse(null, null);   // noch nichts gespeichert
        }
        JsonNode data = mapper.readTree(row.getDataJson());
        return new DataResponse(data, row.getUpdatedAt());
    }

    @PutMapping
    public DataResponse put(@AuthenticationPrincipal Long userId,
                            @RequestBody DataRequest request) {
        String json = request.data() == null ? "{}" : request.data().toString();

        // Vorhandene Zeile aktualisieren oder neue anlegen (upsert).
        AppData row = repo.findById(userId).orElse(new AppData(userId, json));
        row.setDataJson(json);
        row.setUpdatedAt(Instant.now());
        repo.save(row);

        return new DataResponse(request.data(), row.getUpdatedAt());
    }
}
