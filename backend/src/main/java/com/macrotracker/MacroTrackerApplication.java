package com.macrotracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Einstiegspunkt der Anwendung.
 *
 * Die main-Methode startet Spring Boot. @SpringBootApplication aktiviert die
 * "Auto-Konfiguration": Spring scannt dieses Paket (und Unterpakete) nach
 * Komponenten (@RestController, @Service, @Repository ...) und verdrahtet alles
 * automatisch. Ein eingebetteter Tomcat-Webserver wird mitgestartet.
 */
@SpringBootApplication
public class MacroTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(MacroTrackerApplication.class, args);
    }
}
