# ---- Stufe 1: Bauen ----
# Wir bauen die ausführbare JAR in einem Image, das Maven + JDK hat.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Erst nur pom.xml kopieren und Abhängigkeiten laden → besseres Docker-Caching.
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

# ---- Stufe 2: Ausführen ----
# Schlankes Laufzeit-Image: nur JRE, kein Maven nötig.
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
