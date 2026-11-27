import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Lock,
  MapPin,
  MessageSquareText,
  Package,
  PhoneCall,
  Search,
  ShieldCheck,
  Sprout,
  Store,
} from 'lucide-react';
import { CATEGORIES, getCityCoords, UI_COPY } from '../../data/seeds';
import { CommissionShopItem, Language } from '../../types';
import { ShopProductCard } from './ShopProductCard';
import { SocialShareBar } from '../SocialShareBar';

interface ShopDetailPanelProps {
  lang: Language;
  shop: CommissionShopItem;
  highlightedProductId?: string | null;
  onBackToShops: () => void;
  onOpenChatHub: () => void;
  onOpenProduct: (
    shopId: string,
    productId: string,
    openOrderForm?: boolean
  ) => void;
}

type SortOption = 'latest' | 'price-asc' | 'price-desc';

export function ShopDetailPanel({
  lang,
  shop,
  highlightedProductId,
  onBackToShops,
  onOpenChatHub,
  onOpenProduct,
}: ShopDetailPanelProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [coverError, setCoverError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('latest');

  const coords = getCityCoords(shop.cityEn || shop.cityUr);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  const cleanPhone = shop.whatsapp.replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    isUrdu
      ? `السلام علیکم، میں دیسی بیج ایکسچینج کی کمیشن شاپ "${shop.shopNameUr}" سے مصنوعات اور منڈی ریٹ کے بارے میں رابطہ کر رہا ہوں۔`
      : `Hello, I am inquiring about products at "${shop.shopNameEn}" on Desi Beej Exchange.`
  )}`;

  const cityLabel = isUrdu ? shop.cityUr : shop.cityEn;
  const districtLabel = isUrdu
    ? shop.districtUr || `ضلع ${shop.cityUr}`
    : shop.districtEn || `${shop.cityEn} District`;

  const coverSrc =
    shop.coverImageUrl ||
    '/src/assets/images/hero_golden_wheat_field_1795745489456.jpg';

  const featuredProducts = useMemo(
    () => shop.products.filter((p) => p.featured && p.inStock),
    [shop.products]
  );

  const filteredAndSortedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = shop.products.filter((p) => {
      const matchesCat =
        categoryFilter === 'all' || p.category === categoryFilter;
      const matchesQ =
        !q ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameUr.toLowerCase().includes(q) ||
        (p.varietyEn || '').toLowerCase().includes(q) ||
        (p.varietyUr || '').toLowerCase().includes(q) ||
        p.descriptionEn.toLowerCase().includes(q) ||
        p.descriptionUr.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });

    return [...filtered].sort((a, b) => {
      const priceA = a.pricePerBagPkr ?? a.pricePkr;
      const priceB = b.pricePerBagPkr ?? b.pricePkr;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      return b.createdAt - a.createdAt;
    });
  }, [shop.products, searchQuery, categoryFilter, sortBy]);

  return (
    <div className="space-y-7">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBackToShops}
        className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
      >
        <ArrowLeft
          className={`w-4 h-4 shrink-0 ${isUrdu ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        <span>
          {isUrdu
            ? 'تمام کمیشن شاپس پر واپس جائیں'
            : 'Back to All Commission Shops'}
        </span>
      </button>

      {/* Storefront Hero Banner + Shop Header Card */}
      <section className="agri-glass-elevated rounded-2xl overflow-hidden">
        {/* Large Shop Cover Image */}
        <div className="relative h-48 sm:h-64 w-full bg-[#0D2314] overflow-hidden">
          {!coverError ? (
            <img
              src={coverSrc}
              alt={isUrdu ? shop.shopNameUr : shop.shopNameEn}
              referrerPolicy="no-referrer"
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#263B20] via-[#183822] to-[#102B19] flex items-center justify-center">
              <Sprout className="w-16 h-16 text-[#E5C65A]/45" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#102B19] via-[#102B19]/55 to-transparent" />
        </div>

        <div className="p-5 sm:p-7 -mt-10 relative z-10 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#263B20] border-2 border-[#E5C65A]/65 shadow-lg flex items-center justify-center text-3xl sm:text-4xl shrink-0">
                <span aria-hidden="true">{shop.logoEmoji || '🌾'}</span>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#E5C65A] font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" />
                    {isUrdu
                      ? 'منظور شدہ زرعی اسٹور'
                      : 'Desi Beej Exchange Storefront'}
                  </span>
                  {shop.verified && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#FFF0A3]">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#E5C65A]" />
                        {isUrdu ? 'تصدیق شدہ دکان' : 'Verified Shop'}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="[font-family:'Noto_Naskh_Arabic',sans-serif] text-2xl sm:text-3xl font-bold text-[#FFF0A3]">
                  {isUrdu ? shop.shopNameUr : shop.shopNameEn}
                </h2>

                <p className="text-sm text-[#D7E2CE]">
                  {isUrdu ? 'دکاندار: ' : 'Shopkeeper: '}
                  <strong className="text-[#F8F7EA]">
                    {isUrdu ? shop.ownerUr : shop.ownerEn}
                  </strong>{' '}
                  · {cityLabel}, {districtLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#F8F7EA]"
              >
                <ExternalLink className="w-4 h-4 text-[#E5C65A]" />
                <span>{t.viewOnMapBtn}</span>
              </a>

              {shop.hidePhone ? (
                <button
                  type="button"
                  onClick={onOpenChatHub}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/45 text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer"
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
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{t.whatsappBtn}</span>
                </a>
              )}
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
            {isUrdu
              ? shop.descriptionUr || shop.specialtyUr
              : shop.descriptionEn || shop.specialtyEn}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#44633B]/60 text-xs sm:text-sm">
            <div className="flex items-start gap-2 text-[#D7E2CE]">
              <MapPin className="w-4 h-4 text-[#E5C65A] shrink-0 mt-0.5" />
              <span>{isUrdu ? shop.mandiUr : shop.mandiEn}</span>
            </div>
            <div className="flex items-start gap-2 text-[#D7E2CE] tabular-nums">
              <Package className="w-4 h-4 text-[#E5C65A] shrink-0 mt-0.5" />
              <span>
                {shop.products.length}{' '}
                {isUrdu ? 'دستیاب مصنوعات' : 'Products Listed'}
              </span>
            </div>
            <div className="flex items-start gap-2 text-[#E5C65A] font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isUrdu
                  ? 'ادائیگی براہِ راست دکاندار کو (کیش یا بینک)'
                  : 'Direct Customer-to-Shopkeeper Payment'}
              </span>
            </div>
          </div>

          <SocialShareBar
            lang={lang}
            title={isUrdu ? shop.shopNameUr : shop.shopNameEn}
            shareText={
              isUrdu
                ? `${shop.shopNameUr} (${cityLabel}) — دیسی بیج ایکسچینج پر ${shop.products.length} زرعی بیج اور مصنوعات دیکھیں:`
                : `${shop.shopNameEn} (${cityLabel}, ${districtLabel}) — Browse ${shop.products.length} quality seed listings on Desi Beej Exchange:`
            }
            shareParams={{ shop: shop.id }}
            labelEn="Share this shop storefront"
            labelUr="اس دکان کا لنک شیئر کریں"
            variant="inline"
          />
        </div>
      </section>

      {/* Featured Products inside this Shop */}
      {featuredProducts.length > 0 && !searchQuery && categoryFilter === 'all' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display-heading text-xl font-bold text-[#FFF0A3]">
              {isUrdu ? 'اس دکان کے نمایاں بیج' : 'Featured Shop Products'}
            </h3>
            <span className="text-xs font-semibold text-[#E5C65A] tabular-nums">
              {featuredProducts.length} {isUrdu ? 'نمایاں' : 'Featured'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredProducts.map((prod) => (
              <ShopProductCard
                key={`feat-${prod.id}`}
                lang={lang}
                shop={shop}
                product={prod}
                hideShopLink
                highlighted={highlightedProductId === prod.id}
                onViewDetails={(sId, pId) => onOpenProduct(sId, pId, false)}
                onOrderNow={(sId, pId) => onOpenProduct(sId, pId, true)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Search, Filter & Sorting inside Shop Storefront */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
            {isUrdu ? 'دکان کی تمام مصنوعات' : 'All Shop Products'}
          </h3>
          <span className="text-xs sm:text-sm font-semibold text-[#C7D3BD] tabular-nums">
            {filteredAndSortedProducts.length}{' '}
            {isUrdu ? 'مصنوعات' : 'products'}
          </span>
        </div>

        <div className="agri-glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isUrdu
                  ? 'بیج یا قسم تلاش کریں...'
                  : 'Search product or seed variety...'
              }
              className="w-full min-h-[42px] ps-10 pe-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label={isUrdu ? 'فصل کی قسم' : 'Crop Category'}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {isUrdu ? cat.ur : cat.en}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label={isUrdu ? 'ترتیب دیں' : 'Sort Products'}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
          >
            <option value="latest">
              {isUrdu ? 'تازہ ترین مصنوعات' : 'Sort: Latest'}
            </option>
            <option value="price-asc">
              {isUrdu ? 'کم سے زیادہ قیمت' : 'Sort: Lowest Price'}
            </option>
            <option value="price-desc">
              {isUrdu ? 'زیادہ سے کم قیمت' : 'Sort: Highest Price'}
            </option>
          </select>
        </div>

        {filteredAndSortedProducts.length === 0 ? (
          <div className="agri-glass rounded-2xl p-8 text-center text-sm text-[#C7D3BD]">
            {shop.products.length === 0
              ? isUrdu
                ? 'اس دکان میں ابھی کوئی پروڈکٹ شامل نہیں کی گئی۔'
                : 'This shop has not listed catalog products yet. Contact the shopkeeper directly for current stock.'
              : isUrdu
                ? 'اس تلاش کے مطابق دکان میں کوئی پروڈکٹ نہیں ملی۔'
                : 'No products in this shop match your current search or filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedProducts.map((prod) => (
              <ShopProductCard
                key={prod.id}
                lang={lang}
                shop={shop}
                product={prod}
                hideShopLink
                highlighted={highlightedProductId === prod.id}
                onViewDetails={(sId, pId) => onOpenProduct(sId, pId, false)}
                onOrderNow={(sId, pId) => onOpenProduct(sId, pId, true)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
