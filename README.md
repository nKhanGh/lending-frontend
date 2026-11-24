# Lumen Credit Line Frontend

A polished React + TypeScript interface for the [Mini Lending credit-line backend](https://github.com/nKhanGh/lending-backend/tree/credit-line-rebuild). It uses CSS Modules and plain CSS, with no Tailwind.

## Run locally

Start the backend from its `credit-line-rebuild` worktree:

```bash
docker compose up -d postgres
mvn spring-boot:run
```

Then, in this frontend worktree:

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` to `http://127.0.0.1:8080`. Set `VITE_API_TARGET` in a local `.env` file if the backend uses another address. Keep the Vite app and backend together behind a same-origin reverse proxy for a deployed environment.

## Demo flow

1. Submit the prefilled application example: income SGD 3,000, living expenses SGD 1,400, debt payments SGD 500.
2. View the `DEMO_V1` decision and SGD 1,000 limit.
3. Use SGD 800 of the line, leaving SGD 200 available. Open the new drawdown and see four SGD 200 monthly instalments.
4. Pay the first instalment. The available limit becomes SGD 400. Pay the other three in order to reach `PAID_OFF` and restore SGD 1,000.

The backend accepts only one approved application for the seeded demo user. To repeat this flow from the start, use a fresh disposable database or follow the backend README. The interface never calls a real payment service.

## Checks

```bash
npm run format:check
npm run build
```
