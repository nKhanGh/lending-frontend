export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
  timestamp: string;
}

export interface CreditAccount {
  accountId: string;
  userId: string;
  totalLimit: number;
  outstandingAmount: number;
  reservedAmount: number;
  availableCredit: number;
  currency: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

export type OrderStatus = "RESERVED" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export interface OrderSummary {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
}

export interface Instalment {
  id: string;
  sequenceNo: number;
  amount: number;
  dueDate: string;
  status: "UNPAID" | "PAID";
  paidAt: string | null;
}

export interface OrderDetail extends OrderSummary {
  reservationId: string;
  reservationStatus: string;
  reservationExpiresAt: string;
  instalments: Instalment[];
}

export interface Checkout {
  checkoutId: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  expiresAt: string;
  availableCredit: number;
}

export interface Repayment {
  repaymentId: string;
  instalmentId: string;
  orderId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface Settlement {
  orderId: string;
  repaymentIds: string[];
  instalmentsPaid: number;
  amount: number;
  outstandingAmount: number;
  availableCredit: number;
  currency: string;
}
