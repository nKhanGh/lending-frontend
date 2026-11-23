import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Cable,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Headphones,
  Keyboard,
  LayoutDashboard,
  Menu,
  MonitorUp,
  Package,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Speaker,
  Wallet,
  Watch,
  X,
} from "lucide-react";
import { api, actionKey, clearActionKey } from "./lib/api";
import {
  date,
  dateTime,
  instalmentAmounts,
  money,
  shortId,
  statusLabel,
} from "./lib/format";
import type {
  CreditAccount,
  OrderDetail,
  OrderSummary,
  Product,
  Repayment,
} from "./lib/types";
import styles from "./App.module.css";

type View = "overview" | "catalog" | "orders" | "activity";

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "catalog", label: "Khám phá", icon: ShoppingBag },
  { id: "orders", label: "Đơn hàng", icon: Package },
  { id: "activity", label: "Giao dịch", icon: ReceiptText },
];

const productIcons: Record<string, LucideIcon> = {
  "Wireless Headphones": Headphones,
  "Mechanical Keyboard": Keyboard,
  "Smart Watch": Watch,
  "Portable Speaker": Speaker,
  "USB-C Hub": Cable,
  "E-reader": BookOpen,
  Webcam: Camera,
  "Laptop Stand": MonitorUp,
};

function ProductIcon({ name }: { name: string }) {
  const Icon = productIcons[name] ?? Package;
  return <Icon size={56} strokeWidth={1.35} aria-hidden="true" />;
}

function Status({ value }: { value: string }) {
  return (
    <span className={`${styles.status} ${styles[`status${value}`] ?? ""}`}>
      {statusLabel[value] ?? value}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon size={27} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const refresh = useCallback(async () => {
    const [nextAccount, nextProducts, nextOrders, nextRepayments] =
      await Promise.all([
        api.creditAccount(),
        api.products(),
        api.orders(),
        api.repayments(),
      ]);
    setAccount(nextAccount);
    setProducts(nextProducts);
    setOrders(nextOrders);
    setRepayments(nextRepayments);
  }, []);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!checkoutProduct && !detailId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) closeDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [checkoutProduct, detailId, busy]);

  function closeDialog() {
    setCheckoutProduct(null);
    setDetailId(null);
    setDetail(null);
    setError("");
  }

  function navigate(next: View) {
    setView(next);
    setMobileNavOpen(false);
    setError("");
  }

  async function openOrder(id: string) {
    setCheckoutProduct(null);
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await api.order(id));
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setDetailLoading(false);
    }
  }

  async function runAction(
    action: string | null,
    task: () => Promise<unknown>,
    success: string,
    orderId?: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      if (action) clearActionKey(action);
      await refresh();
      if (orderId) setDetail(await api.order(orderId));
      setNotice(success);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function reserve() {
    if (!checkoutProduct) return;
    const action = `reserve:${checkoutProduct.id}:${quantity}`;
    setBusy(true);
    setError("");
    try {
      const checkout = await api.reserve(
        checkoutProduct.id,
        quantity,
        actionKey(action),
      );
      clearActionKey(action);
      await refresh();
      setCheckoutProduct(null);
      await openOrder(checkout.checkoutId);
      setNotice(
        "Đã giữ hạn mức. Xác nhận đơn trước khi thời gian giữ chỗ kết thúc.",
      );
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  const usage = account
    ? Math.min(
        100,
        Math.max(
          0,
          ((account.outstandingAmount + account.reservedAmount) /
            account.totalLimit) *
            100,
        ),
      )
    : 0;
  const settledIds = new Set(
    orders
      .filter(
        (order) =>
          order.status === "CONFIRMED" &&
          Math.round(
            repayments
              .filter((repayment) => repayment.orderId === order.id)
              .reduce((sum, repayment) => sum + repayment.amount, 0) * 100,
          ) >= Math.round(order.totalAmount * 100),
      )
      .map((order) => order.id),
  );
  const checkoutSchedule = checkoutProduct
    ? instalmentAmounts(checkoutProduct.price * quantity)
    : null;
  const displayName = "bạn";

  return (
    <div className={styles.shell}>
      {mobileNavOpen && (
        <button
          className={styles.mobileShade}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Đóng menu"
        />
      )}
      <aside
        className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}
      >
        <button
          className={styles.brand}
          onClick={() => navigate("overview")}
          aria-label="Về trang tổng quan"
        >
          <span className={styles.brandMark}>
            <Wallet size={23} strokeWidth={2.4} />
          </span>
          <span>
            Lendly<span className={styles.brandDot}>.</span>
          </span>
        </button>
        <div className={styles.navCaption}>KHÔNG GIAN CỦA BẠN</div>
        <nav className={styles.nav} aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`${styles.navItem} ${view === item.id ? styles.navActive : ""}`}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={19} strokeWidth={view === item.id ? 2.2 : 1.8} />
              <span>{item.label}</span>
              {item.id === "orders" && orders.length > 0 && (
                <span className={styles.navCount}>{orders.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarTip}>
            <span className={styles.tipIcon}>
              <Sparkles size={19} />
            </span>
            <strong>Chi tiêu thông minh</strong>
            <p>Chia nhỏ thanh toán, chủ động với từng kế hoạch.</p>
          </div>
          <div className={styles.demoProfile}>
            <span className={styles.avatar}>D</span>
            <span>
              <strong>Tài khoản demo</strong>
              <small>Người dùng thử nghiệm</small>
            </span>
            <span className={styles.profilePulse} />
          </div>
        </div>
      </aside>

      <div className={styles.mainWrap}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuButton}
              onClick={() => setMobileNavOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={22} />
            </button>
            <div className={styles.breadcrumb}>
              Trang chủ <ChevronRight size={15} />{" "}
              <strong>
                {navItems.find((item) => item.id === view)?.label}
              </strong>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.demoBadge}>
              <span /> DEMO MODE
            </span>
            <button
              className={styles.iconButton}
              onClick={() => {
                setLoading(true);
                refresh()
                  .catch((cause) => setError(messageOf(cause)))
                  .finally(() => setLoading(false));
              }}
              aria-label="Tải lại dữ liệu"
              title="Tải lại dữ liệu"
            >
              <RefreshCw size={18} />
            </button>
            <span className={styles.topbarDivider} />
            <span className={styles.topAvatar}>D</span>
          </div>
        </header>

        <main className={styles.main}>
          {error && (
            <div className={styles.alert} role="alert">
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Đóng thông báo">
                <X size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className={styles.notice} role="status">
              <Check size={18} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Đóng thông báo">
                <X size={17} />
              </button>
            </div>
          )}

          {loading ? (
            <div className={styles.pageLoading}>
              <span className={styles.spinner} />
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <section className={styles.pageIntro}>
                    <div>
                      <div className={styles.eyebrow}>TỔNG QUAN TÀI CHÍNH</div>
                      <h1>
                        Chào buổi tốt lành, {displayName}{" "}
                        <span className={styles.wave}>✳</span>
                      </h1>
                      <p>Mọi kế hoạch mua sắm và thanh toán, trong một nơi.</p>
                    </div>
                    <button
                      className={styles.primaryButton}
                      onClick={() => navigate("catalog")}
                    >
                      <ShoppingBag size={17} /> Khám phá sản phẩm{" "}
                      <ArrowRight size={17} />
                    </button>
                  </section>

                  <section className={styles.heroGrid}>
                    <div className={styles.creditCard}>
                      <div className={styles.creditGlow} />
                      <div className={styles.creditTop}>
                        <span>
                          <span className={styles.creditLogo}>
                            <Wallet size={17} />
                          </span>{" "}
                          LENDLY CREDIT
                        </span>
                        <span className={styles.creditCardTag}>PAYLATER</span>
                      </div>
                      <div className={styles.creditMiddle}>
                        <span>Hạn mức khả dụng</span>
                        <strong>{money(account?.availableCredit ?? 0)}</strong>
                        <p>Sẵn sàng cho kế hoạch tiếp theo của bạn.</p>
                      </div>
                      <div className={styles.creditBottom}>
                        <div>
                          <span>TỔNG HẠN MỨC</span>
                          <strong>{money(account?.totalLimit ?? 0)}</strong>
                        </div>
                        <div>
                          <span>ĐƠN VỊ</span>
                          <strong>SGD</strong>
                        </div>
                        <CreditCard size={30} strokeWidth={1.2} />
                      </div>
                    </div>
                    <div className={styles.limitPanel}>
                      <div className={styles.panelHeading}>
                        <span className={styles.panelIcon}>
                          <Wallet size={20} />
                        </span>
                        <span className={styles.panelSubtle}>
                          HẠN MỨC CỦA BẠN
                        </span>
                      </div>
                      <div className={styles.limitAmount}>
                        {money(account?.totalLimit ?? 0)}
                        <span> / Tổng hạn mức</span>
                      </div>
                      <div className={styles.progressHeader}>
                        <span>Đã sử dụng</span>
                        <strong>{Math.round(usage)}%</strong>
                      </div>
                      <div className={styles.progressTrack}>
                        <span style={{ width: `${usage}%` }} />
                      </div>
                      <div className={styles.limitStats}>
                        <div>
                          <span className={styles.statDotOrange} />
                          Đang trả góp
                          <strong>
                            {money(account?.outstandingAmount ?? 0)}
                          </strong>
                        </div>
                        <div>
                          <span className={styles.statDotMint} />
                          Đang giữ chỗ
                          <strong>{money(account?.reservedAmount ?? 0)}</strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.sectionRow}>
                    <div>
                      <div className={styles.eyebrow}>DÀNH CHO BẠN</div>
                      <h2>Sản phẩm nổi bật</h2>
                    </div>
                    <button
                      className={styles.textButton}
                      onClick={() => navigate("catalog")}
                    >
                      Xem tất cả <ArrowRight size={17} />
                    </button>
                  </section>
                  <div className={styles.featuredGrid}>
                    {products.slice(0, 3).map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                        affordable={
                          !!account && account.availableCredit >= product.price
                        }
                        onBuy={() => {
                          setCheckoutProduct(product);
                          setQuantity(1);
                          setError("");
                        }}
                      />
                    ))}
                  </div>

                  <section className={styles.sectionRow}>
                    <div>
                      <div className={styles.eyebrow}>HOẠT ĐỘNG GẦN ĐÂY</div>
                      <h2>Đơn hàng của bạn</h2>
                    </div>
                    <button
                      className={styles.textButton}
                      onClick={() => navigate("orders")}
                    >
                      Tất cả đơn hàng <ArrowRight size={17} />
                    </button>
                  </section>
                  <OrderList
                    orders={orders.slice(0, 4)}
                    settledIds={settledIds}
                    onOpen={openOrder}
                  />
                </>
              )}

              {view === "catalog" && (
                <>
                  <section className={styles.pageIntro}>
                    <div>
                      <div className={styles.eyebrow}>MUA SẮM LINH HOẠT</div>
                      <h1>Khám phá sản phẩm</h1>
                      <p>
                        Chọn điều bạn thích, chia nhỏ khoản thanh toán thành 4
                        kỳ.
                      </p>
                    </div>
                    <span className={styles.catalogCount}>
                      {products.length} sản phẩm
                    </span>
                  </section>
                  <div className={styles.catalogBanner}>
                    <span>
                      <Sparkles size={22} />
                    </span>
                    <div>
                      <strong>Mua hôm nay, thanh toán theo kế hoạch.</strong>
                      <p>
                        Mỗi đơn hàng được chia thành 4 kỳ hàng tháng. Giá và hạn
                        mức luôn được xác nhận bởi hệ thống.
                      </p>
                    </div>
                  </div>
                  <div className={styles.productGrid}>
                    {products.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                        affordable={
                          !!account && account.availableCredit >= product.price
                        }
                        onBuy={() => {
                          setCheckoutProduct(product);
                          setQuantity(1);
                          setError("");
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {view === "orders" && (
                <>
                  <section className={styles.pageIntro}>
                    <div>
                      <div className={styles.eyebrow}>THEO DÕI KẾ HOẠCH</div>
                      <h1>Đơn hàng của bạn</h1>
                      <p>
                        Xem trạng thái, lịch trả góp và quản lý từng đơn hàng.
                      </p>
                    </div>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => navigate("catalog")}
                    >
                      <ShoppingBag size={17} /> Mua sắm
                    </button>
                  </section>
                  <div className={styles.summaryStrip}>
                    <div>
                      <span>Tổng đơn hàng</span>
                      <strong>{orders.length}</strong>
                    </div>
                    <div>
                      <span>Đang trả góp</span>
                      <strong>
                        {
                          orders.filter(
                            (order) =>
                              order.status === "CONFIRMED" &&
                              !settledIds.has(order.id),
                          ).length
                        }
                      </strong>
                    </div>
                    <div>
                      <span>Chờ xác nhận</span>
                      <strong>
                        {
                          orders.filter((order) => order.status === "RESERVED")
                            .length
                        }
                      </strong>
                    </div>
                  </div>
                  <OrderList
                    orders={orders}
                    settledIds={settledIds}
                    onOpen={openOrder}
                  />
                </>
              )}

              {view === "activity" && (
                <>
                  <section className={styles.pageIntro}>
                    <div>
                      <div className={styles.eyebrow}>LỊCH SỬ THANH TOÁN</div>
                      <h1>Giao dịch</h1>
                      <p>
                        Tất cả khoản thanh toán đã hoàn thành trên tài khoản
                        demo.
                      </p>
                    </div>
                    <span className={styles.catalogCount}>
                      {repayments.length} giao dịch
                    </span>
                  </section>
                  <div className={styles.activityCard}>
                    {repayments.length === 0 ? (
                      <EmptyState
                        icon={ReceiptText}
                        title="Chưa có giao dịch"
                        description="Các khoản thanh toán của bạn sẽ xuất hiện tại đây."
                      />
                    ) : (
                      repayments.map((repayment) => (
                        <button
                          className={styles.activityRow}
                          key={repayment.repaymentId}
                          onClick={() => openOrder(repayment.orderId)}
                        >
                          <span className={styles.activityIcon}>
                            <ArrowDownLeft size={20} />
                          </span>
                          <span className={styles.activityMeta}>
                            <strong>Thanh toán kỳ trả góp</strong>
                            <small>
                              {dateTime(repayment.createdAt)} ·{" "}
                              {shortId(repayment.orderId)}
                            </small>
                          </span>
                          <span className={styles.activityAmount}>
                            −{money(repayment.amount, repayment.currency)}
                            <small>Đã thanh toán</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer className={styles.footer}>
            <span>© 2026 Lendly · PayLater demo</span>
            <span>
              <ShieldCheck size={15} /> Giao dịch mô phỏng · Không xử lý tiền
              thật
            </span>
          </footer>
        </main>
      </div>

      {checkoutProduct && checkoutSchedule && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) closeDialog();
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>BƯỚC 1 / 2 · GIỮ HẠN MỨC</span>
                <h2 id="checkout-title">Xác nhận lựa chọn</h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={closeDialog}
                disabled={busy}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.checkoutProduct}>
                <span className={styles.checkoutArt}>
                  <ProductIcon name={checkoutProduct.name} />
                </span>
                <div>
                  <strong>{checkoutProduct.name}</strong>
                  <p>{checkoutProduct.description}</p>
                  <span>{money(checkoutProduct.price)}</span>
                </div>
              </div>
              <div className={styles.quantityRow}>
                <span>Số lượng</span>
                <div className={styles.stepper}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={busy || quantity <= 1}
                  >
                    −
                  </button>
                  <strong>{quantity}</strong>
                  <button
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    disabled={busy || quantity >= 100}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className={styles.breakdown}>
                <div>
                  <span>Tổng đơn hàng</span>
                  <strong>{money(checkoutProduct.price * quantity)}</strong>
                </div>
                <div>
                  <span>Kỳ 1–3 (mỗi kỳ)</span>
                  <strong>{money(checkoutSchedule.first)}</strong>
                </div>
                <div>
                  <span>Kỳ 4</span>
                  <strong>{money(checkoutSchedule.last)}</strong>
                </div>
                <div className={styles.breakdownTotal}>
                  <span>Hạn mức sau giữ chỗ</span>
                  <strong>
                    {money(
                      Math.max(
                        0,
                        (account?.availableCredit ?? 0) -
                          checkoutProduct.price * quantity,
                      ),
                    )}
                  </strong>
                </div>
              </div>
              <p className={styles.modalHint}>
                <ShieldCheck size={16} /> Hạn mức được giữ trong 10 phút. Bạn có
                thể xác nhận hoặc hủy sau đó.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.secondaryButton}
                onClick={closeDialog}
                disabled={busy}
              >
                Để sau
              </button>
              <button
                className={styles.primaryButton}
                onClick={reserve}
                disabled={
                  busy ||
                  !account ||
                  account.availableCredit < checkoutProduct.price * quantity
                }
              >
                {busy ? "Đang xử lý..." : "Giữ hạn mức"}{" "}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </div>
      )}

      {detailId && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) closeDialog();
          }}
        >
          <section
            className={`${styles.modal} ${styles.detailModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>CHI TIẾT ĐƠN HÀNG</span>
                <h2 id="detail-title">
                  {detail ? shortId(detail.id) : "Đang tải đơn hàng"}
                </h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={closeDialog}
                disabled={busy}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            {detailLoading ? (
              <div className={styles.modalLoading}>
                <span className={styles.spinner} /> Đang tải chi tiết...
              </div>
            ) : detail ? (
              <>
                <div className={styles.modalBody}>
                  <div className={styles.detailTitle}>
                    <div>
                      <strong>{detail.productName}</strong>
                      <span>
                        {detail.quantity} sản phẩm ·{" "}
                        {dateTime(detail.createdAt)}
                      </span>
                    </div>
                    <Status
                      value={
                        detail.status === "CONFIRMED" &&
                        detail.instalments.length > 0 &&
                        detail.instalments.every(
                          (item) => item.status === "PAID",
                        )
                          ? "SETTLED"
                          : detail.status
                      }
                    />
                  </div>
                  <div className={styles.detailAmount}>
                    <span>Tổng giá trị đơn hàng</span>
                    <strong>
                      {money(detail.totalAmount, detail.currency)}
                    </strong>
                  </div>
                  {detail.status === "RESERVED" && (
                    <div className={styles.reservationInfo}>
                      <Clock3 size={18} />
                      <span>
                        Hạn giữ chỗ đến {dateTime(detail.reservationExpiresAt)}.
                        Hãy xác nhận trước thời điểm này.
                      </span>
                    </div>
                  )}
                  {detail.instalments.length > 0 && (
                    <div className={styles.schedule}>
                      <div className={styles.scheduleHeading}>
                        <CalendarDays size={19} />
                        <strong>Lịch thanh toán</strong>
                        <span>
                          {
                            detail.instalments.filter(
                              (item) => item.status === "PAID",
                            ).length
                          }
                          /{detail.instalments.length} đã trả
                        </span>
                      </div>
                      {detail.instalments.map((item) => (
                        <div className={styles.scheduleRow} key={item.id}>
                          <span
                            className={`${styles.scheduleIndex} ${item.status === "PAID" ? styles.schedulePaid : ""}`}
                          >
                            {item.status === "PAID" ? (
                              <Check size={16} />
                            ) : (
                              item.sequenceNo
                            )}
                          </span>
                          <span className={styles.scheduleInfo}>
                            <strong>Kỳ {item.sequenceNo}</strong>
                            <small>
                              {item.status === "PAID" && item.paidAt
                                ? `Đã trả ${date(item.paidAt)}`
                                : `Hạn trả ${date(item.dueDate)}`}
                            </small>
                          </span>
                          <strong className={styles.scheduleAmount}>
                            {money(item.amount, detail.currency)}
                          </strong>
                          {item.status === "UNPAID" && (
                            <button
                              className={styles.smallPayButton}
                              onClick={() =>
                                runAction(
                                  `pay:${item.id}`,
                                  () =>
                                    api.pay(
                                      item.id,
                                      actionKey(`pay:${item.id}`),
                                    ),
                                  `Đã thanh toán kỳ ${item.sequenceNo}.`,
                                  detail.id,
                                )
                              }
                              disabled={busy}
                            >
                              Trả kỳ này
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.modalFooter}>
                  {detail.status === "RESERVED" ? (
                    <>
                      <button
                        className={styles.secondaryButton}
                        onClick={() =>
                          runAction(
                            null,
                            () => api.cancel(detail.id),
                            "Đã hủy đơn và hoàn hạn mức.",
                            detail.id,
                          )
                        }
                        disabled={busy}
                      >
                        Hủy đơn
                      </button>
                      <button
                        className={styles.primaryButton}
                        onClick={() =>
                          runAction(
                            `confirm:${detail.id}`,
                            () =>
                              api.confirm(
                                detail.id,
                                actionKey(`confirm:${detail.id}`),
                              ),
                            "Đơn đã được xác nhận và tạo lịch trả góp.",
                            detail.id,
                          )
                        }
                        disabled={busy}
                      >
                        Xác nhận đơn <ArrowRight size={17} />
                      </button>
                    </>
                  ) : detail.status === "CONFIRMED" &&
                    detail.instalments.some(
                      (item) => item.status === "UNPAID",
                    ) ? (
                    <>
                      <span className={styles.footerHint}>
                        Thanh toán trước hạn không phát sinh phí trong bản demo.
                      </span>
                      <button
                        className={styles.primaryButton}
                        onClick={() =>
                          runAction(
                            `settle:${detail.id}`,
                            () =>
                              api.settle(
                                detail.id,
                                actionKey(`settle:${detail.id}`),
                              ),
                            "Đã tất toán toàn bộ kỳ còn lại.",
                            detail.id,
                          )
                        }
                        disabled={busy}
                      >
                        Tất toán đơn <ArrowRight size={17} />
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.secondaryButton}
                      onClick={closeDialog}
                    >
                      Đóng
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.modalLoading}>
                Không tải được đơn hàng. Hãy thử lại.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  index,
  affordable,
  onBuy,
}: {
  product: Product;
  index: number;
  affordable: boolean;
  onBuy: () => void;
}) {
  return (
    <article className={styles.productCard}>
      <div className={`${styles.productArt} ${styles[`art${index % 8}`]}`}>
        <span className={styles.productArtCircle} />
        <ProductIcon name={product.name} />
        <span className={styles.productTag}>4 KỲ THANH TOÁN</span>
      </div>
      <div className={styles.productContent}>
        <div className={styles.productCategory}>THIẾT BỊ CÔNG NGHỆ</div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className={styles.productBottom}>
          <div>
            <strong>{money(product.price, product.currency)}</strong>
            <span>
              3 kỳ đầu{" "}
              {money(instalmentAmounts(product.price).first, product.currency)}{" "}
              / kỳ
            </span>
          </div>
          <button
            onClick={onBuy}
            disabled={!affordable}
            aria-label={`Mua trả góp ${product.name}`}
            title={affordable ? "Mua trả góp" : "Không đủ hạn mức"}
          >
            <ArrowUpRight size={21} />
          </button>
        </div>
      </div>
    </article>
  );
}

function OrderList({
  orders,
  settledIds,
  onOpen,
}: {
  orders: OrderSummary[];
  settledIds: Set<string>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className={styles.orderCard}>
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Chưa có đơn hàng"
          description="Khám phá sản phẩm và bắt đầu kế hoạch trả góp đầu tiên."
        />
      ) : (
        <>
          <div className={styles.orderHeader}>
            <span>ĐƠN HÀNG</span>
            <span>NGÀY TẠO</span>
            <span>GIÁ TRỊ</span>
            <span>TRẠNG THÁI</span>
            <span />
          </div>
          {orders.map((order) => (
            <button
              className={styles.orderRow}
              key={order.id}
              onClick={() => onOpen(order.id)}
            >
              <span className={styles.orderName}>
                <span className={styles.orderIcon}>
                  <ShoppingBag size={20} />
                </span>
                <span>
                  <strong>{order.productName}</strong>
                  <small>
                    {shortId(order.id)} · SL {order.quantity}
                  </small>
                </span>
              </span>
              <span className={styles.orderDate}>{date(order.createdAt)}</span>
              <strong className={styles.orderPrice}>
                {money(order.totalAmount, order.currency)}
              </strong>
              <Status
                value={settledIds.has(order.id) ? "SETTLED" : order.status}
              />
              <ChevronRight size={18} className={styles.rowChevron} />
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function messageOf(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Có lỗi xảy ra. Vui lòng thử lại.";
}
