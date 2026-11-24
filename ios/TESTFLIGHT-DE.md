# My City Foundry: App für iPhone und iPad (TestFlight)

**So funktioniert die App:** Mit Internet lädt sie das Spiel live von https://my-city-foundry.vercel.app. Jedes Update auf GitHub
ist danach automatisch in der App, ohne neuen TestFlight-Upload. Kommt man ins Spiel zurück, prüft es selbst, ob es eine neue Version
gibt, und lädt neu. Ohne Internet startet die eingebaute Offline-Fassung. Der Spielstand wird zwischen beiden gespiegelt.
Einen neuen Upload braucht es nur, wenn sich der Swift-Code (die App-Hülle) ändert.

## Erster Upload (einmalig, mit „CityFoundry-Xcode-Projekt.zip“)

Das Paket liegt auf GitHub im Projekt **my-city-foundry** → Zweig **ios-paket** → `CityFoundry-Xcode-Projekt.zip`.
Es enthält die Offline-Fassung schon und wurde automatisch mit Xcode geprüft.

1. ZIP doppelklicken → Ordner **CityFoundry-iOS** → **CityFoundry.xcodeproj** doppelklicken → Xcode öffnet sich.
2. Links oben das blaue Projekt **CityFoundry** → Ziel **CityFoundry** → Reiter **Signing & Capabilities**.
3. Bei **Team** dein Apple-Developer-Konto wählen. „Automatically manage signing“ bleibt an.
4. **Bundle Identifier**: `com.ulfdigital.mycityfoundry`
5. **App Store Connect** → Apps → **+** → Neue App: Plattform iOS, Name **My City Foundry** (falls vergeben z. B. „My City Foundry – Stadtbau“),
   Sprache Deutsch, derselbe Bundle Identifier, SKU z. B. `mycityfoundry`.
6. In Xcode oben **Any iOS Device (arm64)** wählen → **Product → Archive**.
7. Organizer → **Distribute App** → **App Store Connect** → **Upload**.
8. Nach 10–30 Minuten: App Store Connect → My City Foundry → **TestFlight** → Exportkonformität bestätigen (keine Verschlüsselung)
   → **Interne Gruppe** anlegen und dich hinzufügen. Interne Tester brauchen keine Prüfung durch Apple.
9. Auf dem iPhone in der **TestFlight**-App installieren.

## Für später

- **Kategorie:** Spiele → Simulation (zweite Kategorie: Spiele → Strategie), Altersfreigabe **4+**. Nicht in die Kategorie „Kinder“.
- **Käufe:** Die App-Hülle kann Apple-Käufe schon (Präfix `com.ulfdigital.mycityfoundry.`). Sobald wir welche wollen, bauen wir
  im Spiel Altersabfrage und Elternsperre (unter 18) ein und legen die Produkte in App Store Connect an – **kein neuer Build nötig**.
- **Automatische Uploads (optional):** Secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID` im GitHub-Projekt
  my-city-foundry eintragen (gleiche Werte wie bei den anderen Apps).
