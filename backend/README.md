# Macro Tracker — Java Backend (Spring Boot)

Ein REST-Backend in **Java mit Spring Boot**, das die Cloud-Funktion des Macro
Trackers übernimmt: Registrierung, Login (mit JWT) und das Speichern/Laden der
App-Daten. Datenbank ist die bestehende **Supabase-PostgreSQL**.

## Was steckt drin? (Lern-Landkarte)

```
src/main/java/com/macrotracker/
├─ MacroTrackerApplication.java     # Start (main-Methode)
├─ user/                            # Benutzer-Konto
│  ├─ AppUser.java                  #   @Entity → Tabelle mt_users
│  └─ UserRepository.java           #   Datenzugriff (Spring Data JPA)
├─ appdata/                         # Der JSON-Datenblock pro Konto
│  ├─ AppData.java                  #   @Entity → Tabelle mt_app_data
│  └─ AppDataRepository.java
├─ auth/                            # Anmeldung
│  ├─ AuthController.java           #   POST /api/auth/register, /login
│  ├─ AuthService.java              #   Logik: hashen, prüfen, Token ausstellen
│  └─ dto/AuthDtos.java             #   Formen der JSON-Daten (+Validierung)
├─ sync/
│  └─ DataController.java           #   GET/PUT /api/data (geschützt)
├─ security/
│  ├─ JwtService.java               #   Token erzeugen/prüfen
│  └─ JwtAuthFilter.java            #   prüft Token bei jeder Anfrage
└─ config/
   ├─ SecurityConfig.java           #   Regeln: was ist offen / geschützt, CORS
   ├─ HealthController.java         #   GET / und /health
   └─ GlobalExceptionHandler.java   #   saubere Fehler-JSONs
```

**Schichten-Idee (typisch für Spring):**
`Controller` (HTTP) → `Service` (Logik) → `Repository` (Datenbank).

## Die API

| Methode | Pfad                  | Geschützt? | Zweck                         |
|---------|-----------------------|------------|-------------------------------|
| POST    | `/api/auth/register`  | nein       | Konto anlegen → `{token,email}` |
| POST    | `/api/auth/login`     | nein       | Einloggen → `{token,email}`   |
| GET     | `/api/data`           | **ja**     | Datenblock laden              |
| PUT     | `/api/data`           | **ja**     | Datenblock speichern          |

Geschützte Endpunkte brauchen den Header `Authorization: Bearer <token>`.

## Voraussetzungen

- **JDK 17** und **Maven**
  macOS: `brew install openjdk@17 maven`
- Dein **Supabase-DB-Passwort** (das beim Projekt-Erstellen vergebene).

## Lokal starten

1. Verbindungsdaten besorgen: Supabase → **Project Settings → Database →
   Connection string → „Session pooler"**. Diese Zeichenkette ins JDBC-Format
   bringen (siehe `.env.example`).
2. `.env.example` nach `.env` kopieren und ausfüllen.
3. Starten:
   ```bash
   export $(grep -v '^#' .env | xargs)
   mvn spring-boot:run
   ```
4. Test:
   ```bash
   curl localhost:8080/health
   curl -X POST localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"geheim123"}'
   ```
   Beim ersten Start legt Hibernate die Tabellen `mt_users` und `mt_app_data`
   automatisch an (du siehst die `create table`-Befehle im Log).

## Alternative: lokal mit Docker (ohne Maven/JDK)

Wenn du kein Maven installieren willst (oder eine sehr neue JDK hast), nutze Docker —
das Image bringt JDK 17 + Maven selbst mit:

```bash
docker build -t mt-backend .
docker run -p 8080:8080 --env-file .env mt-backend
```

## Deployen (damit das gehostete Frontend es nutzen kann)

Empfehlung: **Render** (kostenloser Web-Service, Docker).

1. Dieses `backend/`-Verzeichnis in ein (eigenes) Git-Repo legen oder Render auf
   den Unterordner zeigen lassen.
2. Render → **New → Web Service → Build from a Dockerfile**.
3. **Environment Variables** setzen (NICHT im Code!):
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   - `APP_JWT_SECRET` (langer Zufallstext)
   - `APP_CORS_ALLOWED_ORIGINS=https://alibrb666.github.io`
4. Deploy abwarten → du bekommst eine URL wie
   `https://macro-tracker-backend.onrender.com`.
5. Diese URL an mich geben → ich verdrahte das Frontend (`index.html`) darauf,
   sodass es statt Supabase dein Java-Backend nutzt.

> Hinweis Supabase-Pooler: Den **Session-Pooler** (Port 5432) verwenden — er ist
> IPv4-fähig (passt zu Render) und verträgt Hibernate. Der direkte Host ist oft
> nur IPv6.

## Sicherheit

- Passwörter werden mit **BCrypt** gehasht (nie im Klartext gespeichert).
- Anmeldung über **JWT** (stateless, kein Server-Session-Zustand).
- Geheimnisse ausschließlich über Umgebungsvariablen.
