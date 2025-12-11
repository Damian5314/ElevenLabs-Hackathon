# n8n Setup voor LifeAdmin

Dit document beschrijft hoe je n8n configureert om de LifeAdmin workflows periodiek te triggeren.

## Wat doet n8n in LifeAdmin?

n8n fungeert als een externe scheduler die periodiek de backend aanroept om te controleren of er workflows uitgevoerd moeten worden. Dit maakt het mogelijk om terugkerende taken (zoals driemaandelijkse tandartsafspraken) automatisch uit te voeren.

## Architectuur

```
┌─────────────┐     Cron trigger      ┌─────────────────────┐
│    n8n      │ ────────────────────> │  LifeAdmin Backend  │
│  (Scheduler)│   GET /api/check-     │                     │
│             │      workflows        │  - Check due tasks  │
└─────────────┘                       │  - Run Playwright   │
                                      │  - Update last_run  │
                                      └─────────────────────┘
```

## Installatie n8n

### Optie 1: Docker (Aanbevolen voor demo)

```bash
# Start n8n met Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

### Optie 2: npm (Lokaal)

```bash
# Installeer n8n globaal
npm install -g n8n

# Start n8n
n8n start
```

### Optie 3: npx (Eenmalig)

```bash
npx n8n
```

Na het starten is n8n beschikbaar op: http://localhost:5678

## Workflow Importeren

1. Open n8n in je browser: http://localhost:5678
2. Ga naar **Workflows** → **Add Workflow** → **Import from File**
3. Selecteer: `n8n/workflows/lifeadmin-check-workflows.json`
4. Klik op **Import**

## Workflow Handmatig Maken

Als je de workflow handmatig wilt maken:

### Node 1: Schedule Trigger (Cron)

- **Type:** Schedule Trigger
- **Settings:**
  - Mode: Every Minute (voor demo)
  - Of voor productie: Every X Minutes/Hours

### Node 2: HTTP Request

- **Type:** HTTP Request
- **Settings:**
  - Method: GET
  - URL: `http://localhost:3001/api/check-workflows`
  - Authentication: None (voor demo)

### Node 3: IF (Optioneel - voor logging)

- **Type:** IF
- **Condition:** `{{ $json.executedWorkflows.length > 0 }}`

## Workflow Activeren

1. Open de geïmporteerde workflow
2. Klik op de **Inactive** toggle rechtsboven
3. Bevestig met **Activate**

De workflow zal nu elke minuut draaien en de LifeAdmin backend aanroepen.

## Testen

### Handmatig testen zonder n8n

```bash
# Direct de backend endpoint aanroepen
curl http://localhost:3001/api/check-workflows
```

Expected response als er geen workflows due zijn:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "executedWorkflows": []
}
```

Expected response als er workflows zijn uitgevoerd:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "executedWorkflows": [
    {
      "id": "wf_1705312800000_abc123",
      "target_url": "tandarts",
      "ranAt": "2024-01-15T10:00:00.000Z",
      "result": {
        "success": true,
        "message": "Tandartsafspraak succesvol geboekt",
        "confirmationText": "Beste Jan, uw afspraak is bevestigd..."
      }
    }
  ]
}
```

## Demo Scenario

Voor de hackathon demo:

1. **Start de backend:**
   ```bash
   cd backend && npm run dev
   ```

2. **Start de frontend:**
   ```bash
   cd frontend && npm run dev
   ```

3. **Start n8n:**
   ```bash
   npx n8n
   ```

4. **Importeer en activeer de workflow**

5. **Demo flow:**
   - Gebruiker spreekt: "Herinner me elke 3 maanden aan een tandartsafspraak"
   - Backend maakt workflow aan met interval "P3M"
   - Voor demo: wijzig interval naar "PT1M" (elke minuut)
   - Wacht 1 minuut, n8n triggert de workflow
   - Playwright voert automatisch een nieuwe booking uit

## Interval Waarden

| Interval | Betekenis | Demo gebruik |
|----------|-----------|--------------|
| PT1M     | Elke minuut | Demo |
| PT5M     | Elke 5 minuten | Demo |
| P1D      | Dagelijks | Testing |
| P1W      | Wekelijks | Testing |
| P1M      | Maandelijks | Productie |
| P3M      | Elk kwartaal | Productie |
| P6M      | Halfjaarlijks | Productie |
| P1Y      | Jaarlijks | Productie |

## Troubleshooting

### n8n kan backend niet bereiken

1. Controleer of backend draait: `curl http://localhost:3001/api/health`
2. Als je Docker gebruikt voor n8n, gebruik `host.docker.internal` in plaats van `localhost`:
   - URL: `http://host.docker.internal:3001/api/check-workflows`

### Workflow wordt niet getriggerd

1. Controleer of de workflow **Active** is (toggle rechtsboven)
2. Bekijk de **Executions** tab voor errors
3. Test handmatig met "Execute Workflow" button

### Playwright errors

1. Controleer of dummy-sites bereikbaar zijn: `curl http://localhost:3001/tandarts.html`
2. Zet `HEADLESS=false` in `.env` om browser te zien
3. Check console logs van de backend
