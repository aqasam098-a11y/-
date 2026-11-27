import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Lock,
  MapPin,
  MessageSquareText,
  Minus,
  Package,
  PhoneCall,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sprout,
  Store,
} from 'lucide-react';
import { CATEGORIES, getCityCoords, UI_COPY } from '../../data/seeds';
import {
  CommissionShopItem,
  Language,
  ShopOrder,
  ShopProduct,
} from '../../types';
import { getCategoryFallbackImage, ShopProductCard } from './ShopProductCard';
import { SocialShareBar } from '../SocialShareBar';

interface ProductDetailPanelProps {
  lang: Language;
  shop: CommissionShopItem;
  product: ShopProduct;
  allActiveShops: CommissionShopItem[];
  initialShowOrderForm?: boolean;
  onBackToMarketplace: () => void;
  onOpenShop: (shopId: string) => void;
  onOpenProduct: (
    shopId: string,
    productId: string,
    openOrderForm?: boolean
  ) => void;
  onAddToCart: (
    shopId: string,
    productId: string,
    unitMode: 'bag' | 'kg',
    quantity: number
  ) => void;
  onPlaceOrder: (shopId: string, order: ShopOrder) => void;
  onOpenChatHub: () => void;
}

export function ProductDetailPanel({
  lang,
  shop,
  product,
  allActiveShops,
  initialShowOrderForm = false,
  onBackToMarketplace,
  onOpenShop,
  onOpenProduct,
  onAddToCart,
  onPlaceOrder,
  onOpenChatHub,
}: ProductDetailPanelProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const gallery = useMemo(() => {
    const raw =
      product.galleryUrls && product.galleryUrls.length > 0
        ? product.galleryUrls
        : [product.imageUrl || getCategoryFallbackImage(product.category)];
    return Array.from(new Set(raw.filter(Boolean)));
  }, [product]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [unitMode, setUnitMode] = useState<'bag' | 'kg'>('bag');

  const minOrder = Math.max(1, product.minOrderQty || 1);
  const maxStock =
    typeof product.stockCount === 'number' ? product.stockCount : 50;

  const [quantity, setQuantity] = useState(minOrder);
  const [showOrderForm, setShowOrderForm] = useState(initialShowOrderForm);
  const [cartNotice, setCartNotice] = useState('');
  const [orderNotice, setOrderNotice] = useState('');
  const [orderError, setOrderError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState(
    isUrdu ? shop.cityUr : shop.cityEn
  );
  const [paymentNote, setPaymentNote] = useState(
    'Cash on Delivery (Direct to Shopkeeper)'
  );

  useEffect(() => {
    setActiveImageIdx(0);
    setUnitMode('bag');
    setQuantity(Math.max(1, product.minOrderQty || 1));
    setShowOrderForm(initialShowOrderForm);
    setCartNotice('');
    setOrderNotice('');
    setOrderError('');
  }, [product.id, product.minOrderQty, initialShowOrderForm]);

  const bagPrice = product.pricePerBagPkr ?? product.pricePkr;
  const kgPrice = product.pricePerKgPkr ?? bagPrice;
  const selectedUnitPrice = unitMode === 'bag' ? bagPrice : kgPrice;
  const selectedUnitLabel =
    unitMode === 'bag'
      ? isUrdu
        ? product.unitUr
        : product.unitEn
      : isUrdu
        ? '1 کلو گرام'
        : '1 kg';

  const catMeta = CATEGORIES.find((c) => c.id === product.category);
  const categoryLabel = catMeta
    ? isUrdu
      ? catMeta.ur
      : catMeta.en
    : product.category;

  const varietyLabel = isUrdu
    ? product.varietyUr || 'خالص دیسی قسم'
    : product.varietyEn || 'Heirloom Landrace';

  const cityLabel = isUrdu ? shop.cityUr : shop.cityEn;
  const districtLabel = isUrdu
    ? shop.districtUr || `ضلع ${shop.cityUr}`
    : shop.districtEn || `${shop.cityEn} District`;

  const coords = getCityCoords(shop.cityEn || shop.cityUr);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  const cleanPhone = shop.whatsapp.replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    isUrdu
      ? `السلام علیکم، میں دیسی بیج ایکسچینج پر "${shop.shopNameUr}" سے "${product.nameUr}" کے بارے میں معلومات اور آرڈر کے لیے رابطہ کر رہا ہوں۔`
      : `Hello, I am interested in ordering "${product.nameEn}" from "${shop.shopNameEn}" on Desi Beej Exchange.`
  )}`;

  const relatedItems = useMemo(() => {
    const items: Array<{ shop: CommissionShopItem; product: ShopProduct }> = [];
    for (const s of allActiveShops) {
      for (const p of s.products) {
        if (p.id === product.id) continue;
        if (p.category === product.category || s.id === shop.id) {
          items.push({ shop: s, product: p });
        }
      }
    }
    // Sort same category first, then featured, then newest
    return items
      .sort((a, b) => {
        const aCat = a.product.category === product.category ? 1 : 0;
        const bCat = b.product.category === product.category ? 1 : 0;
        if (aCat !== bCat) return bCat - aCat;
        return b.product.createdAt - a.product.createdAt;
      })
      .slice(0, 3);
  }, [allActiveShops, product.id, product.category, shop.id]);

  const adjustQty = (next: number) => {
    const intNext = Math.round(Number.isFinite(next) ? next : minOrder);
    const clamped = Math.max(minOrder, intNext);
    if (unitMode === 'bag' && maxStock > 0) {
      setQuantity(Math.min(clamped, maxStock));
    } else {
      setQuantity(clamped);
    }
  };

  const handleAddCartClick = () => {
    if (!product.inStock) return;
    onAddToCart(shop.id, product.id, unitMode, quantity);
    setCartNotice(
      isUrdu
        ? `"${product.nameUr}" (${quantity} × ${selectedUnitLabel}) کارٹ میں شامل کر دیا گیا ہے۔`
        : `Added ${quantity} × ${selectedUnitLabel} of "${product.nameEn}" to your cart.`
    );
  };

  const handleDirectOrderSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOrderError('');

    if (!product.inStock) {
      setOrderError(
        isUrdu
          ? 'معذرت، یہ بیج فی الحال اسٹاک میں دستیاب نہیں ہے۔'
          : 'Sorry, this seed is currently out of stock.'
      );
      return;
    }

    if (!customerName.trim() || customerPhone.trim().length < 4) {
      setOrderError(
        isUrdu
          ? 'براہِ کرم اپنا نام اور درست فون / واٹس ایپ نمبر (کم از کم 4 ہندسے) درج کریں۔'
          : 'Please enter your name and a valid phone / WhatsApp number (at least 4 characters).'
      );
      return;
    }

    const safeQty = Math.max(minOrder, Math.round(quantity));
    const newOrder: ShopOrder = {
      id: `ord-${Date.now()}`,
      shopId: shop.id,
      productId: product.id,
      productNameUr: product.nameUr,
      productNameEn: product.nameEn,
      quantity: safeQty,
      unitLabel: selectedUnitLabel,
      totalPkr: selectedUnitPrice * safeQty,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCity: customerCity.trim() || cityLabel,
      paymentNote,
      status: 'pending',
      createdAt: Date.now(),
    };

    onPlaceOrder(shop.id, newOrder);
    setOrderNotice(
      isUrdu
        ? `آپ کا آرڈر #${newOrder.id.slice(-5)} تصدیق ہو گیا ہے! کل رقم Rs. ${newOrder.totalPkr.toLocaleString()} براہِ راست دکاندار کو ادا کی جائے گی۔`
        : `Order #${newOrder.id.slice(-5)} placed for Rs. ${newOrder.totalPkr.toLocaleString()}! You will settle payment directly with the shopkeeper.`
    );
    setShowOrderForm(false);
    setCustomerName('');
    setCustomerPhone('');
  };

  const mainImageSrc = gallery[activeImageIdx] || gallery[0];

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer transition-colors"
          >
            <ArrowLeft
              className={`w-4 h-4 shrink-0 ${isUrdu ? 'rotate-180' : ''}`}
            />
            <span>
              {isUrdu ? 'کمیشن شاپ ہوم پیج' : 'All Shops & Products'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShop(shop.id)}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E5C65A]/40 bg-[#263B20]/80 hover:bg-[#314B29] text-xs sm:text-sm font-semibold text-[#F8F7EA] cursor-pointer transition-colors"
          >
            <Store className="w-4 h-4 text-[#E5C65A] shrink-0" />
            <span>{isUrdu ? shop.shopNameUr : shop.shopNameEn}</span>
          </button>
        </div>
      </div>

      {/* Status Notices */}
      {cartNotice && (
        <div
          role="status"
          className="rounded-xl border border-[#E5C65A]/45 bg-[#263B20] px-4 py-3 text-sm font-semibold text-[#FFF0A3] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#E5C65A] shrink-0" />
          <span>{cartNotice}</span>
        </div>
      )}

      {orderNotice && (
        <div
          role="status"
          className="rounded-xl border border-[#E5C65A]/60 bg-[#263B20] px-4 py-3.5 text-sm font-semibold text-[#FFF0A3] flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-[#E5C65A] shrink-0" />
          <span>{orderNotice}</span>
        </div>
      )}

      {/* Main 2-Column PDP Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-3">
          <div className="agri-glass-elevated rounded-2xl overflow-hidden aspect-[4/3] bg-[#0D2314] relative">
            {mainImageSrc && !failedImages[mainImageSrc] ? (
              <img
                src={mainImageSrc}
                alt={isUrdu ? product.nameUr : product.nameEn}
                referrerPolicy="no-referrer"
                onError={() =>
                  setFailedImages((prev) => ({ ...prev, [mainImageSrc]: true }))
                }
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#183822] to-[#0D2314] text-[#E5C65A] gap-2">
                <Sprout className="w-14 h-14 opacity-80" />
                <span className="text-sm font-semibold text-[#D7E2CE]">
                  {isUrdu ? product.nameUr : product.nameEn}
                </span>
              </div>
            )}

            {!product.inStock && (
              <span className="absolute top-4 start-4 px-3 py-1 rounded-lg bg-red-950/90 border border-red-400/50 text-xs font-bold text-red-100">
                {isUrdu ? 'اسٹاک ختم' : 'Out of Stock'}
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {gallery.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  aria-label={`${isUrdu ? 'تصویر' : 'View image'} ${idx + 1}`}
                  className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-[#0D2314] ${
                    activeImageIdx === idx
                      ? 'border-[#E5C65A] ring-2 ring-[#E5C65A]/40'
                      : 'border-[#44633B]/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  {!failedImages[url] ? (
                    <img
                      src={url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [url]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#E5C65A]">
                      <Sprout className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & Contiguous Purchase Module */}
        <div className="lg:col-span-6 space-y-5">
          <div className="agri-glass-elevated rounded-2xl p-5 sm:p-7 space-y-5">
            {/* Metadata Line */}
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-[#E5C65A]">
                {categoryLabel} · {varietyLabel} · {cityLabel}, {districtLabel}
              </p>

              <h1
                className={`font-bold text-[#FFF0A3] ${
                  isUrdu
                    ? 'font-urdu-display text-2xl sm:text-3xl leading-[1.85]'
                    : 'font-display-heading text-2xl sm:text-3xl tracking-tight'
                }`}
              >
                {isUrdu ? product.nameUr : product.nameEn}
              </h1>

              <p className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
                {isUrdu ? product.descriptionUr : product.descriptionEn}
              </p>
            </div>

            {/* Pricing & Unit Mode Selector */}
            <div className="space-y-2.5 pt-2 border-t border-[#44633B]/55">
              <div className="text-xs font-bold text-[#FFF0A3]">
                {isUrdu
                  ? 'قیمت اور خریداری کی اکائی منتخب کریں:'
                  : 'Select Pricing & Unit:'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUnitMode('bag')}
                  className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer ${
                    unitMode === 'bag'
                      ? 'bg-[#263B20] border-[#E5C65A] ring-1 ring-[#E5C65A]/40'
                      : 'bg-[#0D2314]/80 border-[#44633B] hover:border-[#E5C65A]/50'
                  }`}
                >
                  <div className="text-xs text-[#C7D3BD]">
                    {isUrdu ? 'فی بوری / پیک' : 'Price per Bag / Pack'}
                  </div>
                  <div className="text-xl font-extrabold text-[#FFF0A3] tabular-nums mt-0.5">
                    Rs. {bagPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#E5C65A] font-medium">
                    {isUrdu ? product.unitUr : product.unitEn}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUnitMode('kg')}
                  className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer ${
                    unitMode === 'kg'
                      ? 'bg-[#263B20] border-[#E5C65A] ring-1 ring-[#E5C65A]/40'
                      : 'bg-[#0D2314]/80 border-[#44633B] hover:border-[#E5C65A]/50'
                  }`}
                >
                  <div className="text-xs text-[#C7D3BD]">
                    {isUrdu ? 'فی کلو گرام قیمت' : 'Price per kg'}
                  </div>
                  <div className="text-xl font-extrabold text-[#E5C65A] tabular-nums mt-0.5">
                    Rs. {kgPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#D7E2CE] font-medium">
                    {isUrdu ? 'فی کلو گرام' : 'per 1 kg'}
                  </div>
                </button>
              </div>
            </div>

            {/* Key Specs: Variety, Available Qty, Minimum Order, Crop Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div className="rounded-xl bg-[#0D2314]/80 border border-[#44633B]/60 p-3">
                <div className="text-[11px] text-[#C7D3BD]">
                  {isUrdu ? 'بیج کی قسم' : 'Seed Variety'}
                </div>
                <div className="font-bold text-[#F8F7EA] mt-0.5">
                  {varietyLabel}
                </div>
              </div>

              <div className="rounded-xl bg-[#0D2314]/80 border border-[#44633B]/60 p-3">
                <div className="text-[11px] text-[#C7D3BD]">
                  {isUrdu ? 'دستیاب مقدار' : 'Available Quantity'}
                </div>
                <div
                  className={`font-bold tabular-nums mt-0.5 ${
                    product.inStock ? 'text-[#FFF0A3]' : 'text-red-300'
                  }`}
                >
                  {product.inStock
                    ? product.stockQty
                    : isUrdu
                      ? 'اسٹاک ختم'
                      : 'Out of Stock'}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-xl bg-[#0D2314]/80 border border-[#44633B]/60 p-3">
                <div className="text-[11px] text-[#C7D3BD]">
                  {isUrdu ? 'کم از کم آرڈر' : 'Minimum Order'}
                </div>
                <div className="font-bold text-[#F8F7EA] tabular-nums mt-0.5">
                  {minOrder} {selectedUnitLabel}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#0D2314]/85 border border-[#44633B]/70 p-3.5 space-y-1">
              <div className="text-xs font-bold text-[#E5C65A] flex items-center gap-1.5">
                <Sprout className="w-4 h-4 shrink-0" />
                <span>{isUrdu ? 'فصل و کاشت کی معلومات' : 'Crop Information'}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#D7E2CE] leading-relaxed">
                {isUrdu
                  ? product.cropInfoUr ||
                    'خالص غیر ہائبرڈ دیسی بیج، اعلیٰ اُگاؤ اور مقامی موسم کے موافق۔'
                  : product.cropInfoEn ||
                    'Open-pollinated heirloom seed adapted to local Pakistani climate and soil.'}
              </p>
            </div>

            {/* Quantity Stepper & Subtotal */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#44633B]/55">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#FFF0A3]">
                  {isUrdu ? 'مقدار' : 'Order Quantity'} ({selectedUnitLabel})
                </label>
                <div className="inline-flex items-center rounded-xl border border-[#44633B] bg-[#0D2314] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => adjustQty(quantity - 1)}
                    disabled={quantity <= minOrder || !product.inStock}
                    aria-label={isUrdu ? 'مقدار کم کریں' : 'Decrease quantity'}
                    className="w-10 h-10 flex items-center justify-center text-[#FFF0A3] hover:bg-[#263B20] disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={minOrder}
                    value={quantity}
                    onChange={(e) =>
                      adjustQty(Number(e.target.value) || minOrder)
                    }
                    disabled={!product.inStock}
                    className="w-16 h-10 text-center bg-transparent text-sm font-bold text-[#F8F7EA] tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQty(quantity + 1)}
                    disabled={!product.inStock}
                    aria-label={isUrdu ? 'مقدار بڑھائیں' : 'Increase quantity'}
                    className="w-10 h-10 flex items-center justify-center text-[#FFF0A3] hover:bg-[#263B20] disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-end">
                <div className="text-xs text-[#C7D3BD]">
                  {isUrdu ? 'تخمینی کل رقم' : 'Estimated Subtotal'}
                </div>
                <div className="text-2xl font-extrabold text-[#FFF0A3] tabular-nums">
                  Rs. {(selectedUnitPrice * quantity).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Primary Actions: Add to Cart & Order Now */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={handleAddCartClick}
                className="min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#E5C65A] bg-[#13311D] hover:bg-[#263B20] disabled:opacity-50 text-sm font-bold text-[#FFF0A3] transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-[#E5C65A]" />
                <span>{isUrdu ? 'کارٹ میں شامل کریں' : 'Add to Cart'}</span>
              </button>

              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => setShowOrderForm((prev) => !prev)}
                className="min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] disabled:bg-[#263B20] disabled:text-[#8DA182] text-sm font-bold text-[#102B19] transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {product.inStock
                    ? isUrdu
                      ? 'ابھی آرڈر کریں'
                      : 'Order Now'
                    : isUrdu
                      ? 'اسٹاک ختم'
                      : 'Out of Stock'}
                </span>
              </button>
            </div>

            <SocialShareBar
              lang={lang}
              title={isUrdu ? product.nameUr : product.nameEn}
              shareText={
                isUrdu
                  ? `${product.nameUr} (${varietyLabel}) — Rs. ${selectedUnitPrice.toLocaleString()} / ${selectedUnitLabel} | ${shop.shopNameUr} (${cityLabel}) — دیسی بیج ایکسچینج پر دیکھیں:`
                  : `${product.nameEn} (${varietyLabel}) — Rs. ${selectedUnitPrice.toLocaleString()} / ${selectedUnitLabel} at ${shop.shopNameEn} (${cityLabel}) on Desi Beej Exchange:`
              }
              shareParams={{ shop: shop.id, product: product.id }}
              labelEn="Share this seed product"
              labelUr="یہ بیج لسٹنگ شیئر کریں"
              variant="inline"
            />
          </div>

          {/* Direct Checkout Form when Order Now clicked */}
          {showOrderForm && product.inStock && (
            <form
              onSubmit={handleDirectOrderSubmit}
              className="agri-glass-elevated rounded-2xl p-5 sm:p-6 space-y-4 border-2 border-[#E5C65A]/60"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#FFF0A3]">
                    {isUrdu
                      ? 'براہِ راست آرڈر مکمل کریں'
                      : 'Complete Direct Shop Order'}
                  </h2>
                  <p className="text-xs text-[#C7D3BD]">
                    {quantity} × {selectedUnitLabel} —{' '}
                    <strong className="text-[#E5C65A] tabular-nums">
                      Rs. {(selectedUnitPrice * quantity).toLocaleString()}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderForm(false)}
                  className="text-xs font-semibold text-[#C7D3BD] hover:text-[#FFF0A3] cursor-pointer"
                >
                  {isUrdu ? 'بند کریں' : 'Cancel'}
                </button>
              </div>

              {orderError && (
                <div className="rounded-xl bg-red-950/60 border border-red-400/40 px-3.5 py-2 text-xs text-red-200">
                  {orderError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                    {isUrdu ? 'خریدار کا نام *' : 'Your Name *'}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isUrdu ? 'مثلاً احمد علی' : 'e.g., Ahmad Ali'}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                    {isUrdu ? 'فون / واٹس ایپ *' : 'Phone / WhatsApp *'}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                    {isUrdu ? 'ڈیلیوری کا شہر' : 'Delivery City'}
                  </label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                    {isUrdu ? 'ادائیگی کا طریقہ' : 'Direct Payment Method'}
                  </label>
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
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-[#C7D3BD] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#E5C65A]" />
                  <span>
                    {isUrdu
                      ? 'آرڈر کی تصدیق پر دستیاب اسٹاک خودکار اپ ڈیٹ ہوگا'
                      : 'Stock updates immediately upon order confirmation'}
                  </span>
                </span>
                <button
                  type="submit"
                  className="min-h-[42px] px-6 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
                >
                  {isUrdu ? 'آرڈر تصدیق کریں' : 'Confirm Order'}
                </button>
              </div>
            </form>
          )}

          {/* Shopkeeper & Storefront Details Card */}
          <div className="agri-glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 flex items-center justify-center text-2xl shrink-0">
                  {shop.logoEmoji || '🌾'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#E5C65A] font-semibold">
                    <span>{isUrdu ? 'فروخت کنندہ دکان' : 'Sold by Shop'}</span>
                    {shop.verified && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[#FFF0A3]">
                          <BadgeCheck className="w-3.5 h-3.5 text-[#E5C65A]" />
                          {isUrdu ? 'تصدیق شدہ' : 'Verified'}
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenShop(shop.id)}
                    className="text-base sm:text-lg font-bold text-[#FFF0A3] hover:underline text-start cursor-pointer mt-0.5"
                  >
                    {isUrdu ? shop.shopNameUr : shop.shopNameEn}
                  </button>
                  <p className="text-xs sm:text-sm text-[#D7E2CE]">
                    {isUrdu ? 'دکاندار: ' : 'Shopkeeper: '}
                    <strong className="text-[#F8F7EA]">
                      {isUrdu ? shop.ownerUr : shop.ownerEn}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenShop(shop.id)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs font-bold text-[#FFF0A3] cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-[#E5C65A]" />
                <span>{isUrdu ? 'دکان دیکھیں' : 'Visit Storefront'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#C7D3BD]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E5C65A]" />
                {isUrdu ? shop.mandiUr : shop.mandiEn}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Package className="w-3.5 h-3.5 text-[#E5C65A]" />
                {shop.products.length} {isUrdu ? 'مصنوعات' : 'Products'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#44633B]/50">
              {shop.hidePhone ? (
                <button
                  type="button"
                  onClick={onOpenChatHub}
                  className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/45 text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-[#E5C65A]" />
                  <MessageSquareText className="w-4 h-4 text-[#E5C65A]" />
                  <span>{t.openAppChatBtn}</span>
                </button>
              ) : (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{t.whatsappBtn}</span>
                </a>
              )}

              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#F8F7EA]"
              >
                <ExternalLink className="w-4 h-4 text-[#E5C65A]" />
                <span>{t.viewOnMapBtn}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      {relatedItems.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[#44633B]/50">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
              {isUrdu ? 'ملتی جلتی مصنوعات' : 'Related Seed Products'}
            </h2>
            <button
              type="button"
              onClick={() => onOpenShop(shop.id)}
              className="text-xs sm:text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] hover:underline cursor-pointer"
            >
              {isUrdu ? 'اس دکان کی تمام مصنوعات' : 'View all from this shop'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedItems.map(({ shop: relShop, product: relProd }) => (
              <ShopProductCard
                key={relProd.id}
                lang={lang}
                shop={relShop}
                product={relProd}
                onViewDetails={(sId, pId) => onOpenProduct(sId, pId, false)}
                onOrderNow={(sId, pId) => onOpenProduct(sId, pId, true)}
                onOpenShop={onOpenShop}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
