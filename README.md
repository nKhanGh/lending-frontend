# Lendly frontend

React + TypeScript + Vite frontend for the [Mini PayLater backend](https://github.com/nKhanGh/lending-backend). Styling uses CSS Modules and plain CSS. No Tailwind setup is included.

## Run locally

Start the backend and its PostgreSQL container first (see the backend README). Then:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://localhost:8080` by default. To use another backend address, copy `.env.example` to `.env` and set `VITE_API_TARGET`.

## Available flows

- Credit limit overview, active product catalogue, order list, and repayment history.
- Reserve credit for a product, then confirm or cancel the order.
- View four monthly instalments, pay one instalment, or settle all remaining instalments.
- Refresh data, see backend validation errors, and retry requests with the same idempotency key after a network failure.

The backend is a demo with one seeded user. There is no sign-in or real payment processing. In production, route `/api` to the backend at the same origin or configure an equivalent reverse proxy.

## Checks

```bash
npm run build
```
