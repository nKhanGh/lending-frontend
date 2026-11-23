import axios, { AxiosError } from "axios";
import type {
  ApiResponse,
  Checkout,
  CreditAccount,
  OrderDetail,
  OrderSummary,
  Product,
  Repayment,
  Settlement,
} from "./types";

// Vite proxies /api in development. Production should route /api to the backend too.
const client = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
  timeout: 15000,
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<never>>) => {
    const message =
      error.response?.data?.message ||
      (error.response
        ? `Yêu cầu thất bại (${error.response.status}).`
        : "Không kết nối được tới máy chủ. Hãy kiểm tra backend.");
    return Promise.reject(new Error(message));
  },
);

async function get<T>(path: string): Promise<T> {
  const response = await client.get<ApiResponse<T>>(path);
  return response.data.result;
}

async function post<T>(
  path: string,
  idempotencyKey?: string,
  body?: unknown,
): Promise<T> {
  const response = await client.post<ApiResponse<T>>(path, body, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
  return response.data.result;
}

export const api = {
  products: () => get<Product[]>("/products"),
  creditAccount: () => get<CreditAccount>("/credit-account"),
  orders: () => get<OrderSummary[]>("/orders"),
  order: (id: string) => get<OrderDetail>(`/orders/${id}`),
  repayments: () => get<Repayment[]>("/repayments"),
  reserve: (productId: string, quantity: number, key: string) =>
    post<Checkout>("/checkouts", key, { productId, quantity }),
  confirm: (id: string, key: string) =>
    post<OrderDetail>(`/checkouts/${id}/confirm`, key),
  cancel: (id: string) => post<OrderDetail>(`/checkouts/${id}/cancel`),
  pay: (id: string, key: string) => post(`/instalments/${id}/pay`, key),
  settle: (id: string, key: string) =>
    post<Settlement>(`/orders/${id}/settle`, key),
};

export function actionKey(action: string): string {
  const storageKey = `lendly:pending:${action}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
  }
  return key;
}

export function clearActionKey(action: string): void {
  sessionStorage.removeItem(`lendly:pending:${action}`);
}
