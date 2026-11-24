# Arbeitsregeln für My City Foundry (Ulf)

- **Spiel:** Stadtaufbau wie SimCity, aber auf Ulfs Art. Zielgruppe ab etwa 10–12 Jahren (auch Erwachsene). Jeder wählt den Namen seiner Stadt selbst. Keine Werbung, kein Tracking.
- **Technik:** Statische Web-App ohne Build-Schritt (index.html, styles.css, js/*.mjs). Vercel liefert die Dateien direkt aus. Spiellogik in `js/engine.mjs` als reine Funktionen, Zeichnen in `js/render.mjs` (Canvas, isometrisch), Tests mit `npm test`.
- **Später als App:** wie Pferde-Farm/My Farm World – die iOS-App lädt das Spiel live von Vercel, Updates nur über GitHub → Vercel, kein neuer TestFlight-Upload. Käufe und Links nach außen hinter Elternsperre (Alter unter 18).
- Spielstand-Schlüssel `my-city-foundry-v1` nicht ändern. Neue Felder in `restore()` ergänzen.
- Plan: ROADMAP.md.
- Bei jedem Update Version erhöhen: package.json, js/data.mjs (BUILD) und version.json gleich halten (Test prüft das). Dann lädt sich das Spiel in der App von selbst neu.
- iOS-App (ios/): lädt https://my-city-foundry.vercel.app live, Offline-Fassung über scripts/prepare-ios.sh, Bundle-ID com.ulfdigital.mycityfoundry. Noch keine Käufe (Ulf will erst testen). Nur Swift-Änderungen brauchen einen neuen TestFlight-Upload; das Ulf immer vorher sagen.
