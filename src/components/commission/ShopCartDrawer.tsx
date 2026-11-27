import { FormEvent, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import {
  CartItem,
  CommissionShopItem,
  Language,
  ShopOrder,
  ShopProduct,
} from '../../types';

interface ShopCartDrawerProps {
  lang: Language;
  isOpen: boolean;
  cartItems: CartItem[];
  activeShops: CommissionShopItem[];
  onClose: () => void;
  onUpdateQty: (cartItemId: string, nextQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onConfirmCartCheckout: (
    orders: Array<{ shopId: string; order: ShopOrder }>
  ) => void;
}

interface ResolvedCartLine {
  item: CartItem;
  shop: CommissionShopItem;
  product: ShopProduct;
  unitPrice: number;
  unitLabel: string;
  lineTotal: number;
}

export function ShopCartDrawer({
  lang,
  isOpen,
  cartItems,
  activeShops,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onConfirmCartCheckout,
}: ShopCartDrawerProps) {
  const isUrdu = lang === 'ur';

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [paymentNote, setPaymentNote] = useState(
    'Cash on Delivery (Direct to Shopkeeper)'
  );
  const [checkoutError, setCheckoutError] = useState('');
  const [placedOrders, setPlacedOrders] = useState<ShopOrder[] | null>(null);

  const resolvedLines = useMemo<ResolvedCartLine[]>(() => {
    const lines: ResolvedCartLine[] = [];
    for (const item of cartItems) {
      const shop = activeShops.find((s) => s.id === item.shopId);
      const product = shop?.products.find((p) => p.id === item.productId);
      if (!shop || !product || !product.inStock) continue;

      const bagPrice = product.pricePerBagPkr ?? product.pricePkr;
      const kgPrice = product.pricePerKgPkr ?? bagPrice;
      const unitPrice = item.unitMode === 'bag' ? bagPrice : kgPrice;
      const unitLabel =
        item.unitMode === 'bag'
          ? isUrdu
            ? product.unitUr
            : product.unitEn
          : isUrdu
            ? '1 کلو گرام'
            : '1 kg';

      lines.push({
        item,
        shop,
        product,
        unitPrice,
        unitLabel,
        lineTotal: unitPrice * item.quantity,
      });
    }
    return lines;
  }, [cartItems, activeShops, isUrdu]);

  const grandTotal = useMemo(
    () => resolvedLines.reduce((sum, l) => sum + l.lineTotal, 0),
    [resolvedLines]
  );

  if (!isOpen) return null;

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    if (resolvedLines.length === 0) return;

    if (!customerName.trim() || customerPhone.trim().length < 4) {
      setCheckoutError(
        isUrdu
          ? 'براہِ کرم اپنا نام اور درست فون / واٹس ایپ نمبر (کم از کم 4 ہندسے) درج کریں۔'
          : 'Please enter your name and a valid phone / WhatsApp number (at least 4 characters).'
      );
      return;
    }

    const created: Array<{ shopId: string; order: ShopOrder }> =
      resolvedLines.map((line, idx) => ({
        shopId: line.shop.id,
        order: {
          id: `ord-${Date.now()}-${idx}`,
          shopId: line.shop.id,
          productId: line.product.id,
          productNameUr: line.product.nameUr,
          productNameEn: line.product.nameEn,
          quantity: Math.max(1, Math.round(line.item.quantity)),
          unitLabel: line.unitLabel,
          totalPkr: line.lineTotal,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerCity:
            customerCity.trim() ||
            (isUrdu ? line.shop.cityUr : line.shop.cityEn),
          paymentNote,
          status: 'pending',
          createdAt: Date.now() + idx,
        },
      }));

    onConfirmCartCheckout(created);
    setPlacedOrders(created.map((c) => c.order));
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isUrdu ? 'شاپنگ کارٹ' : 'Shopping Cart'}
    >
      <div className="w-full max-w-lg bg-[#102B19] border-s border-[#E5C65A]/35 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#44633B]/70 flex items-center justify-between gap-3 bg-[#13311D]">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#E5C65A]" />
            <h2 className="text-lg font-bold text-[#FFF0A3]">
              {isUrdu
                ? `خریداری کارٹ (${resolvedLines.length})`
                : `Seed Cart (${resolvedLines.length})`}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setPlacedOrders(null);
              onClose();
            }}
            aria-label={isUrdu ? 'بند کریں' : 'Close cart'}
            className="w-9 h-9 rounded-lg border border-[#44633B] bg-[#0D2314] hover:bg-[#263B20] text-[#FFF0A3] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {placedOrders ? (
            <div className="agri-glass-elevated rounded-2xl p-6 space-y-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#E5C65A] mx-auto" />
              <h3 className="text-xl font-bold text-[#FFF0A3]">
                {isUrdu
                  ? 'آپ کے آرڈرز کامیابی سے بک ہو گئے!'
                  : 'Orders Confirmed Successfully!'}
              </h3>
              <p className="text-xs sm:text-sm text-[#D7E2CE] leading-relaxed">
                {isUrdu
                  ? 'متعلقہ دکانداروں کو آپ کے آرڈر کی اطلاع بھیج دی گئی ہے اور اسٹاک اپ ڈیٹ ہو چکا ہے۔ ادائیگی براہِ راست دکاندار کو کی جائے گی۔'
                  : 'Shopkeepers have received your order details and inventory has been updated. Settle payment directly with each shopkeeper.'}
              </p>

              <div className="space-y-2 text-start">
                {placedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-xl bg-[#0D2314] border border-[#44633B]/70 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#F8F7EA]">
                        {isUrdu ? ord.productNameUr : ord.productNameEn} ×{' '}
                        {ord.quantity}
                      </div>
                      <div className="text-[#C7D3BD]">
                        {ord.unitLabel} · #{ord.id.slice(-5)}
                      </div>
                    </div>
                    <span className="font-bold text-[#E5C65A] tabular-nums">
                      Rs. {ord.totalPkr.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setPlacedOrders(null);
                  onClose();
                }}
                className="w-full min-h-[42px] rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
              >
                {isUrdu ? 'مارکیٹ پلیس پر واپس جائیں' : 'Continue Shopping'}
              </button>
            </div>
          ) : resolvedLines.length === 0 ? (
            <div className="agri-glass rounded-2xl p-8 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-[#E5C65A] mx-auto opacity-85" />
              <p className="text-sm font-bold text-[#FFF0A3]">
                {isUrdu ? 'آپ کا کارٹ خالی ہے' : 'Your seed cart is empty'}
              </p>
              <p className="text-xs text-[#C7D3BD]">
                {isUrdu
                  ? 'کسی بھی بیج کی تفصیلات کھول کر "کارٹ میں شامل کریں" پر کلک کریں۔'
                  : 'Open any seed product and click Add to Cart to build your order.'}
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items List */}
              <div className="space-y-3">
                {resolvedLines.map((line) => (
                  <div
                    key={line.item.id}
                    className="agri-glass rounded-xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#E5C65A] font-semibold truncate">
                          {isUrdu ? line.shop.shopNameUr : line.shop.shopNameEn}
                        </div>
                        <div className="text-sm font-bold text-[#F8F7EA]">
                          {isUrdu ? line.product.nameUr : line.product.nameEn}
                        </div>
                        <div className="text-xs text-[#C7D3BD] tabular-nums">
                          Rs. {line.unitPrice.toLocaleString()} / {line.unitLabel}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(line.item.id)}
                        aria-label={isUrdu ? 'حذف کریں' : 'Remove item'}
                        className="p-1.5 rounded-lg border border-red-400/35 text-red-200 hover:bg-red-950/50 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-[#44633B]/45">
                      <div className="inline-flex items-center rounded-lg border border-[#44633B] bg-[#0D2314]">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty(
                              line.item.id,
                              Math.max(1, line.item.quantity - 1)
                            )
                          }
                          disabled={line.item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-[#FFF0A3] disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-[#F8F7EA] tabular-nums">
                          {line.item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty(line.item.id, line.item.quantity + 1)
                          }
                          className="w-8 h-8 flex items-center justify-center text-[#FFF0A3] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-[#FFF0A3] tabular-nums">
                        Rs. {line.lineTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <form
                onSubmit={handleCheckout}
                className="agri-glass-elevated rounded-2xl p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-[#44633B]/55 pb-2.5">
                  <span className="text-sm font-bold text-[#FFF0A3]">
                    {isUrdu ? 'کل واجب الادا رقم' : 'Cart Subtotal'}
                  </span>
                  <span className="text-xl font-extrabold text-[#E5C65A] tabular-nums">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>

                {checkoutError && (
                  <div className="rounded-xl bg-red-950/60 border border-red-400/40 px-3 py-2 text-xs text-red-200">
                    {checkoutError}
                  </div>
                )}

                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isUrdu ? 'آپ کا نام *' : 'Full Name *'}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
                  />
                  <input
                    type="tel"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={
                      isUrdu
                        ? 'فون / واٹس ایپ نمبر * (0300-1234567)'
                        : 'Phone / WhatsApp * (0300-1234567)'
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
                  />
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder={
                      isUrdu ? 'ڈیلیوری کا شہر' : 'Delivery City (optional)'
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
                  />
                  <select
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                  >
                    <option value="Cash on Delivery (Direct to Shopkeeper)">
                      {isUrdu
                        ? 'کیش آن ڈیلیوری (براہِ راست دکاندار کو)'
                        : 'Cash on Delivery (Direct to Shopkeeper)'}
                    </option>
                    <option value="Direct Easypaisa/JazzCash to Shopkeeper">
                      {isUrdu
                        ? 'دکاندار کو براہِ راست ایزی پیسہ / جاز کیش'
                        : 'Direct Easypaisa / JazzCash to Shopkeeper'}
                    </option>
                    <option value="Direct Bank Transfer to Shopkeeper">
                      {isUrdu
                        ? 'دکاندار کے بینک اکاؤنٹ میں براہِ راست ادائیگی'
                        : 'Direct Bank Transfer to Shopkeeper'}
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#C7D3BD]">
                  <ShieldCheck className="w-4 h-4 text-[#E5C65A] shrink-0" />
                  <span>
                    {isUrdu
                      ? 'رقم براہِ راست دکاندار کو ادا کی جائے گی'
                      : 'Payments go directly to the shopkeeper — no middleman wallet'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
                >
                  {isUrdu
                    ? `آرڈرز تصدیق کریں (Rs. ${grandTotal.toLocaleString()})`
                    : `Confirm Checkout (Rs. ${grandTotal.toLocaleString()})`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
