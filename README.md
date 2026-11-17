# TravelGenie — Multi-Agent AI Travel Companion

TravelGenie is an end-to-end virtual travel agent powered by a central **Supervisor Agent** and specialized domain agents (**Destination**, **Transport**, **Stay**, **Experience**, **Budget**, **Itinerary**, **Validation**, **Trip Manager**, and **Support**), backed by **SQLite** (13 relational tables), **Gemini 4 Hydrogen** (`@google/genai`), **OpenStreetMap Nominatim**, **Overpass API**, and **Open-Meteo**.

## Key Capabilities

- **Conversational Intent & Context Memory**: Extracts structured traveller profiles (`origin`, `destination`, `duration_days`, `budget`, `interests`, `travellers`), detects missing fields, and updates constraints incrementally without repeating prior questions.
- **Transparent Destination Scoring**: Ranks candidates with `S = 0.30B + 0.25I + 0.20D + 0.15W + 0.10T`.
- **Source Provenance Labels**: Every record explicitly states `Live`, `Estimated`, `Simulated`, or `Unavailable`.
- **Geo-Aware Itinerary & OpenStreetMap Route**: Clusters daily stops by Haversine distance/transit time and renders numbered routes via Leaflet.
- **Dynamic Replanning & Change Log**: Adapts itineraries on the fly (*Rain on Day 2*, *Reduce Budget*, *Add 1 Day*, *Avoid Crowds*, *More Adventurous*) with a Before/After audit log.
- **Approval-Gated Bookings & Disruption Support**: Idempotent booking confirmations (`TG-2026-XXXX`), digital vouchers, fee-previewed cancellations/modifications, and Support Agent disruption recovery.

## Running Locally

```bash
npm install
npm run dev
```

The Express + Vite server runs on `http://localhost:3000`.
