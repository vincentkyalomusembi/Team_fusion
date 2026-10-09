# Nairobi flood risk — portfolio frontend
npm install && cp .env.example .env && npm run dev   (http://localhost:5173, /api proxied to :8000)

All endpoints live in src/api.js. Response shapes are documented there and at the top of src/pages/Portfolios.jsx.
Colours: red, light blue, white. Hotspots: red/orange/yellow/green by `severity` or `risk_score` (0–1).
