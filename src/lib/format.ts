export const money = (amount: number, currency = "SGD") =>
  new Intl.NumberFormat("en-SG", { style: "currency", currency }).format(
    amount,
  );

export const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const shortId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

export const instalmentAmounts = (total: number) => {
  const cents = Math.round(total * 100);
  const firstCents = Math.floor(cents / 4);
  return { first: firstCents / 100, last: (cents - firstCents * 3) / 100 };
};

export const statusLabel: Record<string, string> = {
  RESERVED: "Chờ xác nhận",
  CONFIRMED: "Đang trả góp",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  SETTLED: "Đã tất toán",
};
