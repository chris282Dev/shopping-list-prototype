# Einkaufsliste Prototyp

Kleiner Web-App-Prototyp fuer eine gemeinsame Einkaufsliste mit:

- Google-Login ueber Firebase Auth
- gemeinsamem Haushalt per Einladungs-Code
- geteilter Einkaufsliste in Echtzeit ueber Firestore
- einfacher Mobile- und Desktop-Oberflaeche

## Dateien

- `index.html`: Einstiegspunkt der App
- `styles.css`: UI und responsives Layout
- `app.js`: Login, Haushalte und Listenlogik
- `firebase-config.example.js`: Vorlage fuer deine Firebase-Daten
- `firebase-config.js`: aktuell auf die Beispiel-Konfiguration verdrahtet

## Starten

Da der Prototyp ohne Build-Tool gebaut ist, reicht ein statischer Webserver.

Wichtig: Bitte nicht ueber `file://` oeffnen. Fuer Firebase Auth solltest du lokal ueber `http://localhost` arbeiten.

Mit dem gebuendelten Python aus Codex:

```powershell
cd "C:\Users\Chris\Projekte Codex\shopping-list-prototype"
& "C:\Users\Chris\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8080
```

Dann im Browser:

`http://localhost:8080`

## Firebase Setup

1. In der Firebase Console ein neues Projekt anlegen.
2. Unter `Projektuebersicht` auf das Web-Symbol `</>` klicken und eine Web-App registrieren.
3. Die Firebase-Konfigurationswerte aus der Konsole in `firebase-config.js` eintragen.
4. Unter `Authentication` -> `Sign-in method` den Anbieter `Google` aktivieren.
5. Unter `Authentication` -> `Settings` -> `Authorized domains` `localhost` hinzufuegen, falls es nicht bereits vorhanden ist.
6. Unter `Firestore Database` eine Datenbank im `Production mode` oder `Test mode` anlegen.
7. Danach die Regeln aus `firestore.rules` in Firestore uebernehmen und veroeffentlichen.

Beispiel:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

## Firestore Regeln

Die Start-Regeln fuer diesen Prototypen liegen in:

- `firestore.rules`

Sie sorgen dafuer, dass:

- Nutzer nur ihr eigenes `users/{uid}`-Dokument lesen und schreiben duerfen
- Haushalte nur von Mitgliedern gelesen und veraendert werden
- Listen-Eintraege nur im eigenen Haushalt lesbar und bearbeitbar sind

In der Firebase Console:

1. `Firestore Database` oeffnen
2. Zum Tab `Rules` wechseln
3. Den Inhalt aus `firestore.rules` einfuegen
4. `Publish` klicken

## Firestore Datenmodell

### `users/{uid}`

```json
{
  "email": "name@example.com",
  "name": "Max Mustermann",
  "householdId": "abc123",
  "photoURL": "https://...",
  "updatedAt": "serverTimestamp"
}
```

### `households/{id}`

```json
{
  "code": "AB12CD",
  "name": "Familie Mustermann",
  "ownerId": "uid",
  "members": ["uid-1", "uid-2"],
  "createdAt": "serverTimestamp"
}
```

### `items/{id}`

```json
{
  "checked": false,
  "createdAt": "serverTimestamp",
  "createdBy": "uid",
  "createdByName": "Max",
  "householdId": "abc123",
  "name": "Milch",
  "updatedAt": "serverTimestamp"
}
```

## Naechste sinnvolle Schritte

1. Firestore Security Rules hinzufuegen, damit nur Mitglieder ihres Haushalts lesen und schreiben duerfen.
2. Einen festen Partner-Invite-Flow statt Code-Eingabe bauen.
3. Kategorien, Mengen und Sortierung ergaenzen.
4. Optional spaeter als PWA installierbar machen.

## Deployment auf Firebase Hosting

Im Projekt liegen dafuer bereits diese Dateien bereit:

- `firebase.json`
- `.firebaserc`

Sobald die Firebase CLI installiert und eingeloggt ist, reicht typischerweise:

```powershell
cd "C:\Users\Chris\Projekte Codex\shopping-list-prototype"
firebase deploy --only hosting
```

Danach ist die App ueber die Firebase-Hosting-URL des Projekts erreichbar.
