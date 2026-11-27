import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-react';
import {
  AuthUser,
  CategoryId,
  CommissionShopItem,
  Language,
  RentPaymentMethod,
  ShopOrderStatus,
  ShopProduct,
  ShopRentPayment,
} from '../../types';
import {
  canManageAssignedShop,
  evaluateShopRental,
  getTodayIsoDate,
} from '../../utils/shopRental';

interface ShopkeeperRentDashboardProps {
  lang: Language;
  shops: CommissionShopItem[];
  authUser: AuthUser | null;
  onRequestShopRenewal: (
    shopId: string,
    payment: ShopRentPayment
  ) => void;
  onAddProduct: (shopId: string, product: ShopProduct) => void;
  onToggleProductStock: (shopId: string, productId: string) => void;
  onDeleteProduct: (shopId: string, productId: string) => void;
  onUpdateOrderStatus: (
    shopId: string,
    orderId: string,
    status: ShopOrderStatus
  ) => void;
  onOpenAuth: () => void;
}

export function ShopkeeperRentDashboard({
  lang,
  shops,
  authUser,
  onRequestShopRenewal,
  onAddProduct,
  onToggleProductStock,
  onDeleteProduct,
  onUpdateOrderStatus,
  onOpenAuth,
}: ShopkeeperRentDashboardProps) {
  const isUrdu = lang === 'ur';

  const managedShops = useMemo(
    () => shops.filter((s) => canManageAssignedShop(authUser, s)),
    [shops, authUser]
  );

  const [selectedShopId, setSelectedShopId] = useState<string>(
    () => managedShops[0]?.id || ''
  );

  const activeShop = useMemo(
    () =>
      managedShops.find((s) => s.id === selectedShopId) ??
      managedShops[0] ??
      null,
    [managedShops, selectedShopId]
  );

  const [showRenewForm, setShowRenewForm] = useState(false);
  const [payMethod, setPayMethod] = useState<RentPaymentMethod>('Easypaisa');
  const [payReference, setPayReference] = useState('');
  const [payNote, setPayNote] = useState('');
  const [renewNotice, setRenewNotice] = useState('');
  const [renewError, setRenewError] = useState('');

  // Product form state
  const [showAddProd, setShowAddProd] = useState(false);
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodNameUr, setProdNameUr] = useState('');
  const [prodVariety, setProdVariety] = useState('');
  const [prodCategory, setProdCategory] =
    useState<Exclude<CategoryId, 'all'>>('grains');
  const [prodPrice, setProdPrice] = useState('');
  const [prodPriceKg, setProdPriceKg] = useState('');
  const [prodUnit, setProdUnit] = useState('40kg Bag');
  const [prodStockCount, setProdStockCount] = useState('25');
  const [prodMinOrder, setProdMinOrder] = useState('1');
  const [prodImageUrl, setProdImageUrl] = useState(
    '/src/assets/images/seed_desi_gandum_1795580778746.jpg'
  );
  const [prodDesc, setProdDesc] = useState('');

  if (
    !authUser ||
    (authUser.role !== 'shopkeeper' && authUser.role !== 'admin')
  ) {
    return (
      <div className="agri-glass-elevated rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
        <Lock className="w-10 h-10 text-[#E5C65A] mx-auto" />
        <h2 className="text-xl font-bold text-[#FFF0A3]">
          {isUrdu
            ? 'دکاندار ڈیش بورڈ تک رسائی'
            : 'Shopkeeper Dashboard Access'}
        </h2>
        <p className="text-sm text-[#D7E2CE]">
          {isUrdu
            ? 'اپنی تفویض کردہ کمیشن شاپ کا سالانہ کرایہ، بقیہ دن، ادائیگی کی تاریخ، مصنوعات اور کسٹمر آرڈرز دیکھنے کے لیے دکاندار اکاؤنٹ سے لاگ ان کریں۔'
            : 'Sign in with a Shopkeeper account to view your assigned shop rent details, expiry countdown, renewal options, products, and direct orders.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
        >
          {isUrdu ? 'دکاندار لاگ ان کریں' : 'Sign In as Shopkeeper'}
        </button>
      </div>
    );
  }

  if (!activeShop) {
    return (
      <div className="agri-glass-elevated rounded-2xl p-8 text-center space-y-3 max-w-xl mx-auto">
        <Store className="w-10 h-10 text-[#E5C65A] mx-auto" />
        <h2 className="text-xl font-bold text-[#FFF0A3]">
          {isUrdu
            ? 'آپ کو ابھی کوئی دکان تفویض نہیں کی گئی'
            : 'No Rental Shop Assigned Yet'}
        </h2>
        <p className="text-sm text-[#D7E2CE]">
          {isUrdu
            ? 'کمیشن شاپ ٹیب میں نئی دکان کے لیے درخواست دیں یا ایڈمن سے اپنی دکان تفویض کروائیں۔'
            : 'Submit a rental shop application in the Commission Shop tab or ask the Platform Admin to assign a shop to your account.'}
        </p>
      </div>
    );
  }

  const evalInfo = evaluateShopRental(activeShop);

  const handleRenewSubmit = (e: FormEvent) => {
    e.preventDefault();
    setRenewError('');
    setRenewNotice('');
    if (!payReference.trim()) {
      setRenewError(
        isUrdu
          ? 'براہِ کرم ادائیگی کا ٹرانزیکشن ریفرنس نمبر درج کریں۔'
          : 'Please enter the transaction reference or receipt ID.'
      );
      return;
    }

    const payment: ShopRentPayment = {
      id: `pay-${Date.now()}`,
      shopId: activeShop.id,
      amountPkr: activeShop.annualRentPkr,
      method: payMethod,
      reference: payReference.trim(),
      paymentDate: getTodayIsoDate(),
      status: 'pending',
      note:
        payNote.trim() ||
        'Shopkeeper annual renewal request awaiting Admin verification',
      recordedBy: authUser.name,
      createdAt: Date.now(),
    };

    onRequestShopRenewal(activeShop.id, payment);
    setPayReference('');
    setPayNote('');
    setShowRenewForm(false);
    setRenewNotice(
      isUrdu
        ? 'تجدید کرایہ کی درخواست اور ادائیگی کا حوالہ ایڈمن کی تصدیق کے لیے جمع ہو گیا ہے۔ تصدیق کے بعد دکان خودکار طور پر بحال/تجدید ہو جائے گی۔'
        : 'Renewal payment submitted for Admin verification. Once confirmed, your shop expiry will extend by 1 year.'
    );
  };

  const handleCreateProduct = (e: FormEvent) => {
    e.preventDefault();
    const price = Number(prodPrice);
    if ((!prodNameEn.trim() && !prodNameUr.trim()) || !Number.isFinite(price) || price <= 0) {
      return;
    }

    const numericStock = Math.max(1, Number(prodStockCount) || 20);
    const minOrder = Math.max(1, Number(prodMinOrder) || 1);
    const parsedKgPrice = Number(prodPriceKg);
    const kgPrice =
      Number.isFinite(parsedKgPrice) && parsedKgPrice > 0
        ? parsedKgPrice
        : prodUnit.toLowerCase().includes('40')
          ? Math.round(price / 40)
          : price;
    const unitLabel = prodUnit.trim() || '40kg Bag';
    const stockUnitWord = unitLabel.toLowerCase().includes('kg') && !unitLabel.toLowerCase().includes('40')
      ? 'kg'
      : 'Bags';

    const newProd: ShopProduct = {
      id: `prod-${Date.now()}`,
      shopId: activeShop.id,
      nameEn: (prodNameEn || prodNameUr).trim(),
      nameUr: (prodNameUr || prodNameEn).trim(),
      varietyEn: prodVariety.trim() || 'Pure Heirloom Landrace',
      varietyUr: prodVariety.trim() || 'خالص دیسی قسم',
      category: prodCategory,
      pricePkr: price,
      pricePerBagPkr: price,
      pricePerKgPkr: kgPrice,
      unitEn: unitLabel,
      unitUr: unitLabel,
      stockQty: `${numericStock} ${stockUnitWord}`,
      stockCount: numericStock,
      minOrderQty: minOrder,
      inStock: numericStock > 0,
      featured: false,
      imageUrl: prodImageUrl,
      galleryUrls: [prodImageUrl],
      descriptionEn:
        prodDesc.trim() || 'Pure heirloom stock managed by assigned shopkeeper.',
      descriptionUr:
        prodDesc.trim() || 'تفویض کردہ دکاندار کی جانب سے خالص دیسی بیج اسٹاک۔',
      createdAt: Date.now(),
    };

    onAddProduct(activeShop.id, newProd);
    setProdNameEn('');
    setProdNameUr('');
    setProdVariety('');
    setProdPrice('');
    setProdPriceKg('');
    setProdStockCount('25');
    setProdMinOrder('1');
    setProdDesc('');
    setShowAddProd(false);
  };

  const paymentStatusBadge = () => {
    switch (evalInfo.paymentStatus) {
      case 'paid':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#263B20] border border-[#E5C65A]/45 text-xs font-bold text-[#FFF0A3]">
            {isUrdu ? 'ادا شدہ (Paid)' : 'Paid'}
          </span>
        );
      case 'verification_pending':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-950/70 border border-[#E5C65A]/60 text-xs font-bold text-[#FFF0A3]">
            {isUrdu ? 'تصدیق زیرِ التواء' : 'Verification Pending'}
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2.5 py-1 rounded-full bg-red-950/70 border border-red-400/50 text-xs font-bold text-red-200">
            {isUrdu ? 'زائد المیعاد (Overdue)' : 'Overdue'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#13311D] border border-[#44633B] text-xs font-bold text-[#D7E2CE]">
            {isUrdu ? 'واجب الادا' : 'Pending'}
          </span>
        );
    }
  };

  const renewalStatusLabel = () => {
    switch (evalInfo.renewalStatus) {
      case 'expired_suspended':
        return isUrdu
          ? 'معطل / میعاد ختم — تجدید ضروری'
          : 'Auto-Suspended (Expired)';
      case 'renewal_requested':
        return isUrdu
          ? 'تجدید کی درخواست ایڈمن کے پاس زیرِ غور'
          : 'Renewal Requested (Awaiting Admin)';
      case 'expiring_soon':
        return isUrdu ? 'جلد ختم ہونے والی ہے' : 'Expiring Soon';
      case 'suspended':
        return isUrdu ? 'ایڈمن کی جانب سے معطل' : 'Suspended by Admin';
      case 'pending_approval':
        return isUrdu ? 'منظوری زیرِ التواء' : 'Pending Approval';
      default:
        return isUrdu ? 'فعال و تجدید شدہ' : 'Active & Current';
    }
  };

  return (
    <div className="space-y-6">
      {/* Shop selector when Admin or Shopkeeper has multiple shops */}
      {managedShops.length > 1 && (
        <div className="agri-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-bold text-[#FFF0A3]">
            {isUrdu ? 'دکان منتخب کریں:' : 'Managing Assigned Shop:'}
          </span>
          <select
            value={activeShop.id}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm font-semibold text-[#F8F7EA]"
          >
            {managedShops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.logoEmoji || '🌾'} {isUrdu ? s.shopNameUr : s.shopNameEn} (Rs.{' '}
                {s.annualRentPkr.toLocaleString()}/yr)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Direct Customer Payment Policy Notice (Explicit No-Withdrawal Structure) */}
      <div className="rounded-2xl bg-[#183822]/90 border border-[#E5C65A]/35 px-4 py-3.5 flex items-start gap-3 text-xs sm:text-sm text-[#D7E2CE]">
        <ShieldCheck className="w-5 h-5 text-[#E5C65A] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#FFF0A3]">
            {isUrdu
              ? 'براہِ راست کسٹمر ادائیگی (کوئی والٹ یا ودھ ڈرا سسٹم نہیں): '
              : 'Direct Customer Payments (No Platform Withdrawal Wallet): '}
          </strong>
          {isUrdu
            ? 'آپ اپنے صارفین سے فروخت کی رقم براہِ راست وصول کرتے ہیں (کیش، ایزی پیسہ یا بینک)۔ دیسی بیج ایکسچینج صرف دکان کا سالانہ کرایہ وصول کرتا ہے۔'
            : 'Shopkeepers receive customer order payments directly and independently. Desi Beej Exchange only collects the shop’s individually configured annual rent.'}
        </div>
      </div>

      {/* Automatic Expiry Warnings / Notifications */}
      {(evalInfo.isExpired || evalInfo.isExpiringSoon) && (
        <div
          role="alert"
          className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            evalInfo.isExpired
              ? 'bg-red-950/60 border-red-400/55 text-red-100'
              : 'bg-[#263B20] border-[#E5C65A]/60 text-[#FFF0A3]'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-6 h-6 shrink-0 mt-0.5 ${
                evalInfo.isExpired ? 'text-red-300' : 'text-[#E5C65A]'
              }`}
            />
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold">
                {evalInfo.isExpired
                  ? isUrdu
                    ? 'تنبیہ: آپ کی دکان کی سالانہ میعاد ختم ہونے کی وجہ سے خودکار طور پر معطل ہے'
                    : 'Shop Auto-Suspended Due to Expiry'
                  : isUrdu
                    ? `تجدید کی اطلاع: آپ کی دکان کی میعاد ${evalInfo.remainingDays} دنوں میں ختم ہو رہی ہے`
                    : `Expiry Warning: Your shop expires in ${evalInfo.remainingDays} days`}
              </h3>
              <p className="text-xs sm:text-sm opacity-90">
                {evalInfo.isExpired
                  ? isUrdu
                    ? 'آپ کی تمام مصنوعات اور پرانے آرڈرز محفوظ ہیں۔ دکان بحال کرنے کے لیے سالانہ کرایہ جمع کروا کر تجدید کی درخواست بھیجیں۔'
                    : 'All your products and historical orders are safely preserved. Submit your annual renewal payment so Admin can restore your storefront.'
                  : isUrdu
                    ? 'بلا تعطل فروخت جاری رکھنے کے لیے میعاد ختم ہونے سے پہلے سالانہ کرایہ کی تجدید کریں۔'
                    : 'Renew before the expiry date to prevent automatic storefront suspension.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRenewForm(true)}
            className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isUrdu ? 'میری دکان کی تجدید کریں' : 'Renew My Shop'}</span>
          </button>
        </div>
      )}

      {renewNotice && (
        <div
          role="status"
          className="rounded-xl border border-[#E5C65A]/45 bg-[#263B20] px-4 py-3 text-sm font-semibold text-[#FFF0A3] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#E5C65A] shrink-0" />
          <span>{renewNotice}</span>
        </div>
      )}

      {/* SHOP RENT DETAILS SECTION */}
      <section className="agri-glass-elevated rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#263B20] border border-[#E5C65A]/40 flex items-center justify-center text-2xl">
              {activeShop.logoEmoji || '🌾'}
            </div>
            <div>
              <h2 className="[font-family:'Noto_Naskh_Arabic',sans-serif] text-xl sm:text-2xl font-bold text-[#FFF0A3]">
                {isUrdu ? 'دکان کے سالانہ کرایہ کی تفصیلات' : 'Shop Rent Details'}
              </h2>
              <p className="text-xs sm:text-sm text-[#C7D3BD]">
                {isUrdu ? activeShop.shopNameUr : activeShop.shopNameEn}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {paymentStatusBadge()}
            <button
              type="button"
              onClick={() => {
                setShowRenewForm((prev) => !prev);
                setRenewError('');
              }}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isUrdu ? 'میری دکان کی تجدید کریں' : 'Renew My Shop'}</span>
            </button>
          </div>
        </div>

        {/* 8 Required Rent Details Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'دکان کا نام' : 'Shop Name'}
            </div>
            <div className="text-sm font-bold text-[#F8F7EA] mt-1">
              {isUrdu ? activeShop.shopNameUr : activeShop.shopNameEn}
            </div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#E5C65A]/35 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'سالانہ کرایہ (ایڈمن مقررہ)' : 'Annual Rent Amount'}
            </div>
            <div className="text-lg font-extrabold text-[#E5C65A] tabular-nums mt-0.5">
              Rs. {activeShop.annualRentPkr.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#C7D3BD]">
                / {isUrdu ? 'سال' : 'year'}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'ادائیگی کی کیفیت' : 'Payment Status'}
            </div>
            <div className="mt-1.5">{paymentStatusBadge()}</div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'آخری ادائیگی کی تاریخ' : 'Payment Date'}
            </div>
            <div dir="ltr" className="text-sm font-bold text-[#F8F7EA] tabular-nums mt-1">
              {evalInfo.lastConfirmedPayment?.paymentDate ||
                evalInfo.pendingPayment?.paymentDate ||
                (isUrdu ? 'ریکارڈ موجود نہیں' : 'Not recorded')}
            </div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'شروع ہونے کی تاریخ' : 'Shop Start Date'}
            </div>
            <div dir="ltr" className="text-sm font-bold text-[#F8F7EA] tabular-nums mt-1">
              {activeShop.startDate}
            </div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'ختم ہونے کی تاریخ' : 'Shop Expiry Date'}
            </div>
            <div dir="ltr" className="text-sm font-bold text-[#FFF0A3] tabular-nums mt-1">
              {activeShop.expiryDate}
            </div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'بقیہ دن' : 'Remaining Days'}
            </div>
            <div
              className={`text-base font-extrabold tabular-nums mt-1 ${
                evalInfo.remainingDays < 0
                  ? 'text-red-300'
                  : evalInfo.remainingDays <= 30
                    ? 'text-[#E5C65A]'
                    : 'text-[#FFF0A3]'
              }`}
            >
              {evalInfo.remainingDays < 0
                ? isUrdu
                  ? `${Math.abs(evalInfo.remainingDays)} دن پہلے ختم`
                  : `Expired ${Math.abs(evalInfo.remainingDays)}d ago`
                : isUrdu
                  ? `${evalInfo.remainingDays} دن باقی`
                  : `${evalInfo.remainingDays} days left`}
            </div>
          </div>

          <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5">
            <div className="text-[11px] font-semibold text-[#C7D3BD]">
              {isUrdu ? 'تجدید کی کیفیت' : 'Renewal Status'}
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#FFF0A3] mt-1">
              {renewalStatusLabel()}
            </div>
          </div>
        </div>

        {/* Renew My Shop Form */}
        {showRenewForm && (
          <form
            onSubmit={handleRenewSubmit}
            className="rounded-2xl bg-[#0D2314] border border-[#E5C65A]/45 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#FFF0A3] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#E5C65A]" />
                <span>
                  {isUrdu
                    ? `سالانہ تجدید کرایہ جمع کروائیں — Rs. ${activeShop.annualRentPkr.toLocaleString()}`
                    : `Submit Annual Renewal Rent — Rs. ${activeShop.annualRentPkr.toLocaleString()}`}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRenewForm(false)}
                className="text-xs text-[#C7D3BD] hover:text-[#FFF0A3] cursor-pointer"
              >
                {isUrdu ? 'بند کریں' : 'Close'}
              </button>
            </div>

            {renewError && (
              <div className="rounded-xl bg-red-950/60 border border-red-400/40 px-3.5 py-2 text-xs text-red-200">
                {renewError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                  {isUrdu ? 'ادائیگی کا طریقہ' : 'Payment Method'}
                </label>
                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(e.target.value as RentPaymentMethod)
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                >
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                  {isUrdu ? 'ٹرانزیکشن / رسید نمبر *' : 'Transaction Reference *'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="e.g., EP-44901234"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                  {isUrdu ? 'نوٹ (اختیاری)' : 'Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً ایزی پیسہ سے ادائیگی' : 'Paid via mobile app'}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
              >
                {isUrdu
                  ? 'تجدید ادائیگی ایڈمن کو بھیجیں'
                  : 'Submit Renewal Payment'}
              </button>
            </div>
          </form>
        )}

        {/* Payment History Table */}
        <div className="space-y-2.5">
          <h3 className="text-sm sm:text-base font-bold text-[#FFF0A3] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#E5C65A]" />
            <span>{isUrdu ? 'کرایہ ادائیگی کا ریکارڈ' : 'Rent Payment History'}</span>
          </h3>

          {activeShop.paymentHistory.length === 0 ? (
            <p className="text-xs sm:text-sm text-[#C7D3BD]">
              {isUrdu
                ? 'ابھی تک کوئی ادائیگی ریکارڈ نہیں کی گئی۔'
                : 'No rent payment history recorded yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#44633B]/70 bg-[#0D2314]/70">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead className="bg-[#183822] text-[#FFF0A3]">
                  <tr>
                    <th className="px-3.5 py-2.5 text-start">
                      {isUrdu ? 'تاریخ' : 'Date'}
                    </th>
                    <th className="px-3.5 py-2.5 text-start">
                      {isUrdu ? 'رقم' : 'Amount'}
                    </th>
                    <th className="px-3.5 py-2.5 text-start">
                      {isUrdu ? 'طریقہ' : 'Method'}
                    </th>
                    <th className="px-3.5 py-2.5 text-start">
                      {isUrdu ? 'حوالہ نمبر' : 'Reference'}
                    </th>
                    <th className="px-3.5 py-2.5 text-start">
                      {isUrdu ? 'کیفیت' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#44633B]/45">
                  {activeShop.paymentHistory.map((p) => (
                    <tr key={p.id}>
                      <td dir="ltr" className="px-3.5 py-2.5 tabular-nums">
                        {p.paymentDate}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-[#E5C65A] tabular-nums">
                        Rs. {p.amountPkr.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5">{p.method}</td>
                      <td dir="ltr" className="px-3.5 py-2.5 tabular-nums text-[#C7D3BD]">
                        {p.reference}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.status === 'confirmed'
                              ? 'bg-[#263B20] text-[#FFF0A3]'
                              : p.status === 'rejected'
                                ? 'bg-red-950/60 text-red-200'
                                : 'bg-amber-950/70 text-[#E5C65A]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Assigned Shop Products & Customer Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Assigned Products Manager */}
        <section className="lg:col-span-6 agri-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-[#FFF0A3] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#E5C65A]" />
              <span>
                {isUrdu
                  ? `میری مصنوعات (${activeShop.products.length})`
                  : `Assigned Products (${activeShop.products.length})`}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddProd((prev) => !prev)}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isUrdu ? 'نئی پروڈکٹ' : 'Add Product'}</span>
            </button>
          </div>

          {showAddProd && (
            <form
              onSubmit={handleCreateProduct}
              className="rounded-xl bg-[#0D2314] border border-[#44633B] p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={prodNameEn}
                  onChange={(e) => setProdNameEn(e.target.value)}
                  placeholder={isUrdu ? 'پروڈکٹ نام (انگلش) *' : 'Product Name (EN) *'}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <input
                  type="text"
                  dir="rtl"
                  value={prodNameUr}
                  onChange={(e) => setProdNameUr(e.target.value)}
                  placeholder="پروڈکٹ نام (اردو)"
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <input
                  type="text"
                  value={prodVariety}
                  onChange={(e) => setProdVariety(e.target.value)}
                  placeholder={isUrdu ? 'بیج کی قسم (مثلاً کالی مونچھ)' : 'Seed Variety (e.g., Desi Landrace)'}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <select
                  value={prodCategory}
                  onChange={(e) =>
                    setProdCategory(
                      e.target.value as Exclude<CategoryId, 'all'>
                    )
                  }
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                >
                  <option value="grains">Grains / غلہ</option>
                  <option value="vegetables">Vegetables / سبزیاں</option>
                  <option value="herbs">Herbs & Oilseed / جڑی بوٹیاں</option>
                  <option value="fodder">Fodder / چارہ</option>
                  <option value="fruits">Fruits / پھل</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder={isUrdu ? 'قیمت فی بوری / پیک (PKR) *' : 'Price per Bag / Pack (PKR) *'}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <input
                  type="number"
                  min={1}
                  value={prodPriceKg}
                  onChange={(e) => setProdPriceKg(e.target.value)}
                  placeholder={isUrdu ? 'قیمت فی کلو (اختیاری PKR)' : 'Price per kg (optional PKR)'}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <input
                  type="text"
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  placeholder="Unit (e.g., 40kg Bag / 1kg Pack)"
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <input
                  type="number"
                  min={1}
                  value={prodStockCount}
                  onChange={(e) => setProdStockCount(e.target.value)}
                  placeholder={isUrdu ? 'دستیاب مقدار (تعداد)' : 'Available Stock Count'}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <input
                  type="number"
                  min={1}
                  value={prodMinOrder}
                  onChange={(e) => setProdMinOrder(e.target.value)}
                  placeholder={isUrdu ? 'کم از کم آرڈر' : 'Min Order Qty'}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                />
                <select
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
                >
                  <option value="/src/assets/images/seed_desi_gandum_1795580778746.jpg">
                    Wheat Seed Photo / گندم تصویر
                  </option>
                  <option value="/src/assets/images/prod_chickpea_mung_seed_1795753823058.jpg">
                    Chickpea & Mung Photo / چنا و مونگ
                  </option>
                  <option value="/src/assets/images/prod_golden_maize_seed_1795753823126.jpg">
                    Golden Maize Photo / دیسی مکئی
                  </option>
                  <option value="/src/assets/images/prod_mustard_sarson_seed_1795753821358.jpg">
                    Mustard / Sarson Photo / سرسوں
                  </option>
                  <option value="/src/assets/images/seed_desi_bhindi_1795580775443.jpg">
                    Desi Bhindi / Vegetables / سبزیاں
                  </option>
                  <option value="/src/assets/images/seed_desi_tarbooz_1795580777464.jpg">
                    Watermelon / Fruit Seed / پھل
                  </option>
                </select>
              </div>
              <input
                type="text"
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder={isUrdu ? 'مختصر تفصیل' : 'Short description'}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProd(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#C7D3BD] cursor-pointer"
                >
                  {isUrdu ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#E5C65A] text-[#102B19] text-xs font-bold cursor-pointer"
                >
                  {isUrdu ? 'شامل کریں' : 'Save Product'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {activeShop.products.length === 0 ? (
              <p className="text-xs sm:text-sm text-[#C7D3BD]">
                {isUrdu
                  ? 'ابھی کوئی پروڈکٹ شامل نہیں ہے۔'
                  : 'No products added to this shop yet.'}
              </p>
            ) : (
              activeShop.products.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-xl bg-[#0D2314]/80 border border-[#44633B]/70 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#F8F7EA] truncate">
                      {isUrdu ? prod.nameUr : prod.nameEn}
                    </div>
                    <div className="text-xs text-[#E5C65A] tabular-nums">
                      Rs. {prod.pricePkr.toLocaleString()} /{' '}
                      {isUrdu ? prod.unitUr : prod.unitEn} · {prod.stockQty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onToggleProductStock(activeShop.id, prod.id)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        prod.inStock
                          ? 'bg-[#263B20] text-[#FFF0A3]'
                          : 'bg-red-950/60 text-red-200'
                      }`}
                    >
                      {prod.inStock
                        ? isUrdu
                          ? 'دستیاب'
                          : 'In Stock'
                        : isUrdu
                          ? 'ختم'
                          : 'Out'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(activeShop.id, prod.id)}
                      aria-label="Delete product"
                      className="p-1.5 rounded-lg border border-red-400/35 text-red-200 hover:bg-red-950/50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Direct Customer Orders Manager (Historical orders always preserved) */}
        <section className="lg:col-span-6 agri-glass rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#FFF0A3] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#E5C65A]" />
            <span>
              {isUrdu
                ? `کسٹمر آرڈرز (${activeShop.orders.length})`
                : `Customer Orders (${activeShop.orders.length})`}
            </span>
          </h3>

          <div className="space-y-3">
            {activeShop.orders.length === 0 ? (
              <p className="text-xs sm:text-sm text-[#C7D3BD]">
                {isUrdu
                  ? 'ابھی تک کوئی کسٹمر آرڈر نہیں آیا۔'
                  : 'No customer orders placed on this shop yet.'}
              </p>
            ) : (
              activeShop.orders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-xl bg-[#0D2314]/80 border border-[#44633B]/70 p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#F8F7EA]">
                        {isUrdu ? ord.productNameUr : ord.productNameEn} ×{' '}
                        {ord.quantity}
                      </div>
                      <div className="text-xs text-[#C7D3BD]">
                        {ord.customerName} · {ord.customerPhone} ·{' '}
                        {ord.customerCity}
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-[#E5C65A] tabular-nums">
                      Rs. {ord.totalPkr.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#44633B]/40">
                    <span className="text-[11px] text-[#C7D3BD]">
                      {ord.paymentNote}
                    </span>
                    <select
                      value={ord.status}
                      onChange={(e) =>
                        onUpdateOrderStatus(
                          activeShop.id,
                          ord.id,
                          e.target.value as ShopOrderStatus
                        )
                      }
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#13311D] border border-[#44633B] text-xs font-semibold text-[#FFF0A3]"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
