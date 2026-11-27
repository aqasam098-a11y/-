import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Edit3,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { PAKISTANI_CITIES } from '../../data/seeds';
import {
  AuthUser,
  CommissionShopItem,
  Language,
  MandiRateItem,
} from '../../types';
import { canManageAdminShops, getTodayIsoDate } from '../../utils/shopRental';

interface MandiRatesBoardProps {
  lang: Language;
  rates: MandiRateItem[];
  shops: CommissionShopItem[];
  authUser: AuthUser | null;
  onAddRate: (rate: MandiRateItem) => void;
  onUpdateRate: (rate: MandiRateItem) => void;
  onDeleteRate: (rateId: string) => void;
  onOpenLinkedShopProduct: (shopId: string, productId?: string) => void;
  onOpenAuth: () => void;
}

export function MandiRatesBoard({
  lang,
  rates,
  shops,
  authUser,
  onAddRate,
  onUpdateRate,
  onDeleteRate,
  onOpenLinkedShopProduct,
  onOpenAuth,
}: MandiRatesBoardProps) {
  const isUrdu = lang === 'ur';
  const isAdmin = canManageAdminShops(authUser);

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [cropNameEn, setCropNameEn] = useState('');
  const [cropNameUr, setCropNameUr] = useState('');
  const [cityEn, setCityEn] = useState('Multan');
  const [ratePkr, setRatePkr] = useState('4000');
  const [unitEn, setUnitEn] = useState('per 40kg');
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [linkedShopId, setLinkedShopId] = useState(shops[0]?.id || '');
  const [linkedProductId, setLinkedProductId] = useState('');
  const [formError, setFormError] = useState('');

  const activeShops = useMemo(
    () => shops.filter((s) => s.status === 'active'),
    [shops]
  );

  const selectedShopProducts = useMemo(() => {
    const shop = shops.find((s) => s.id === linkedShopId);
    return shop?.products || [];
  }, [shops, linkedShopId]);

  const filteredRates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rates.filter((r) => {
      const matchesCity =
        cityFilter === 'all' ||
        r.cityEn.toLowerCase() === cityFilter.toLowerCase() ||
        r.cityUr === cityFilter;
      const matchesQ =
        !q ||
        r.cropNameEn.toLowerCase().includes(q) ||
        r.cropNameUr.toLowerCase().includes(q) ||
        r.cityEn.toLowerCase().includes(q) ||
        r.cityUr.toLowerCase().includes(q);
      return matchesCity && matchesQ;
    });
  }, [rates, search, cityFilter]);

  const openNewForm = () => {
    setEditingId(null);
    setCropNameEn('');
    setCropNameUr('');
    setCityEn('Multan');
    setRatePkr('4000');
    setUnitEn('per 40kg');
    setTrend('stable');
    setLinkedShopId(activeShops[0]?.id || '');
    setLinkedProductId('');
    setFormError('');
    setShowEditor(true);
  };

  const openEditForm = (rate: MandiRateItem) => {
    setEditingId(rate.id);
    setCropNameEn(rate.cropNameEn);
    setCropNameUr(rate.cropNameUr);
    setCityEn(rate.cityEn);
    setRatePkr(String(rate.ratePkr));
    setUnitEn(rate.unitEn);
    setTrend(rate.trend);
    setLinkedShopId(rate.linkedShopId || '');
    setLinkedProductId(rate.linkedProductId || '');
    setFormError('');
    setShowEditor(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!cropNameEn.trim() && !cropNameUr.trim()) {
      setFormError(
        isUrdu ? 'فصل یا بیج کا نام درج کریں۔' : 'Enter a crop or seed name.'
      );
      return;
    }
    const parsedRate = Number(ratePkr);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setFormError(
        isUrdu ? 'درست منڈی ریٹ درج کریں۔' : 'Enter a valid positive rate in PKR.'
      );
      return;
    }

    const cityObj =
      PAKISTANI_CITIES.find((c) => c.en === cityEn) || PAKISTANI_CITIES[0];
    const payload: MandiRateItem = {
      id: editingId || `rate-${Date.now()}`,
      cropNameEn: (cropNameEn || cropNameUr).trim(),
      cropNameUr: (cropNameUr || cropNameEn).trim(),
      cityEn: cityObj.en,
      cityUr: cityObj.ur,
      ratePkr: parsedRate,
      unitEn: unitEn.trim() || 'per 40kg',
      unitUr: unitEn.includes('kg') && !unitEn.includes('40') ? 'فی کلو' : 'فی من (40 کلو)',
      trend,
      updatedDate: getTodayIsoDate(),
      linkedShopId: linkedShopId || undefined,
      linkedProductId: linkedProductId || undefined,
    };

    if (editingId) {
      onUpdateRate(payload);
    } else {
      onAddRate(payload);
    }
    setShowEditor(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <section className="agri-glass-elevated rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#E5C65A]">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>
              {isUrdu
                ? 'پاکستانی غلہ منڈی کے تازہ ترین نرخ اور متعلقہ دکانیں'
                : 'Live Market Rates Connected to Commission Shops'}
            </span>
          </div>
          <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
            {isUrdu
              ? 'منڈی ریٹس اور متعلقہ کمیشن شاپ مصنوعات'
              : 'Mandi Rates & Related Shop Products'}
          </h2>
          <p className="text-xs sm:text-sm text-[#D7E2CE]">
            {isUrdu
              ? 'تازہ منڈی ریٹ دیکھیں اور کسی بھی فصل کے سامنے موجود بٹن سے متعلقہ کمیشن شاپ کا خالص بیج خریدیں۔ ایڈمن ریٹ اپ ڈیٹ کر سکتے ہیں۔'
              : 'Browse current market rates controlled by Admin and jump directly to matching seed stock in active Desi Beej Exchange rental shops.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={openNewForm}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isUrdu ? '+ نیا منڈی ریٹ شامل کریں' : '+ Update / Add Rate'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs font-semibold text-[#FFF0A3] cursor-pointer"
            >
              <span>
                {isUrdu
                  ? 'ایڈمن لاگ ان (ریٹس اپ ڈیٹ)'
                  : 'Admin Login to Edit Rates'}
              </span>
            </button>
          )}
        </div>
      </section>

      {/* Admin Add/Edit Rate Form */}
      {isAdmin && showEditor && (
        <form
          onSubmit={handleSave}
          className="agri-glass rounded-2xl p-5 space-y-4 border border-[#E5C65A]/45"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-[#FFF0A3]">
              {editingId
                ? isUrdu
                  ? 'منڈی ریٹ میں ترمیم کریں'
                  : 'Edit Market Rate'
                : isUrdu
                  ? 'نیا منڈی ریٹ درج کریں'
                  : 'Add Market Rate'}
            </h3>
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="text-xs font-semibold text-[#C7D3BD] hover:text-[#FFF0A3] cursor-pointer"
            >
              {isUrdu ? 'بند کریں' : 'Close'}
            </button>
          </div>

          {formError && (
            <div className="rounded-xl bg-red-950/60 border border-red-400/40 px-4 py-2 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'فصل / بیج (انگلش) *' : 'Crop / Seed Name (English) *'}
              </label>
              <input
                type="text"
                value={cropNameEn}
                onChange={(e) => setCropNameEn(e.target.value)}
                placeholder="e.g., Desi Wheat"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'فصل / بیج (اردو)' : 'Crop / Seed Name (Urdu)'}
              </label>
              <input
                type="text"
                dir="rtl"
                value={cropNameUr}
                onChange={(e) => setCropNameUr(e.target.value)}
                placeholder="مثلاً دیسی گندم"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'منڈی شہر' : 'Mandi City'}
              </label>
              <select
                value={cityEn}
                onChange={(e) => setCityEn(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              >
                {PAKISTANI_CITIES.map((c) => (
                  <option key={c.en} value={c.en}>
                    {isUrdu ? c.ur : c.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'ریٹ (روپے) *' : 'Market Rate (PKR) *'}
              </label>
              <input
                type="number"
                min={1}
                value={ratePkr}
                onChange={(e) => setRatePkr(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'وزن / اکائی' : 'Unit'}
              </label>
              <select
                value={unitEn}
                onChange={(e) => setUnitEn(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              >
                <option value="per 40kg">per 40kg (40 کلو)</option>
                <option value="per kg">per kg (فی کلو)</option>
                <option value="per 50kg bag">per 50kg bag (50 کلو بوری)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'مارکیٹ رجحان' : 'Price Trend'}
              </label>
              <select
                value={trend}
                onChange={(e) =>
                  setTrend(e.target.value as 'up' | 'down' | 'stable')
                }
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              >
                <option value="up">{isUrdu ? 'تیزی (Up)' : 'Up'}</option>
                <option value="stable">{isUrdu ? 'مستحکم (Stable)' : 'Stable'}</option>
                <option value="down">{isUrdu ? 'کمی (Down)' : 'Down'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'متعلقہ کمیشن شاپ' : 'Connect Commission Shop'}
              </label>
              <select
                value={linkedShopId}
                onChange={(e) => {
                  setLinkedShopId(e.target.value);
                  setLinkedProductId('');
                }}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              >
                <option value="">{isUrdu ? 'کوئی نہیں' : 'None'}</option>
                {activeShops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isUrdu ? s.shopNameUr : s.shopNameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'متعلقہ دکان کی پروڈکٹ' : 'Connect Specific Shop Product'}
              </label>
              <select
                value={linkedProductId}
                onChange={(e) => setLinkedProductId(e.target.value)}
                disabled={!linkedShopId}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] disabled:opacity-60"
              >
                <option value="">
                  {isUrdu ? 'دکان کا صفحہ لنک کریں' : 'Link shop storefront'}
                </option>
                {selectedShopProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isUrdu ? p.nameUr : p.nameEn} (Rs. {p.pricePkr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
            >
              {isUrdu ? 'منڈی ریٹ محفوظ کریں' : 'Save Market Rate'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter */}
      <div className="agri-glass rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isUrdu
                ? 'فصل یا منڈی کا نام تلاش کریں...'
                : 'Search crop or mandi city...'
            }
            className="w-full min-h-[42px] ps-10 pe-4 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
          />
        </div>

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="sm:w-52 min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm font-medium text-[#F8F7EA]"
        >
          <option value="all">{isUrdu ? 'تمام غلہ منڈیاں' : 'All Cities'}</option>
          {PAKISTANI_CITIES.map((c) => (
            <option key={c.en} value={c.en}>
              {isUrdu ? c.ur : c.en}
            </option>
          ))}
        </select>
      </div>

      {/* Mandi Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRates.map((rate) => {
          const linkedShop = shops.find(
            (s) => s.id === rate.linkedShopId && s.status === 'active'
          );
          const linkedProduct = linkedShop?.products.find(
            (p) => p.id === rate.linkedProductId
          );

          return (
            <article
              key={rate.id}
              className="agri-glass rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#E5C65A]/55 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#C7D3BD]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#E5C65A]">
                      <MapPin className="w-3.5 h-3.5" />
                      {isUrdu ? rate.cityUr : rate.cityEn}
                    </span>
                    <span>·</span>
                    <span dir="ltr" className="tabular-nums">
                      {rate.updatedDate}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F8F7EA]">
                    {isUrdu ? rate.cropNameUr : rate.cropNameEn}
                  </h3>
                </div>

                <div className="text-end shrink-0">
                  <div className="text-xl font-extrabold text-[#FFF0A3] tabular-nums">
                    Rs. {rate.ratePkr.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-[#C7D3BD]">
                    <span>{isUrdu ? rate.unitUr : rate.unitEn}</span>
                    {rate.trend === 'up' && (
                      <ArrowUpRight className="w-4 h-4 text-[#E5C65A]" />
                    )}
                    {rate.trend === 'down' && (
                      <ArrowDownRight className="w-4 h-4 text-red-300" />
                    )}
                    {rate.trend === 'stable' && (
                      <Minus className="w-4 h-4 text-[#C7D3BD]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Linked Commission Shop Product */}
              <div className="pt-3 border-t border-[#44633B]/50 flex flex-wrap items-center justify-between gap-2.5">
                {linkedShop ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLinkedShopProduct(linkedShop.id, linkedProduct?.id)
                    }
                    className="min-h-[38px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/45 text-xs font-bold text-[#FFF0A3] transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#E5C65A]" />
                    <span>
                      {linkedProduct
                        ? `${isUrdu ? linkedProduct.nameUr : linkedProduct.nameEn} · ${isUrdu ? linkedShop.shopNameUr : linkedShop.shopNameEn}`
                        : isUrdu
                          ? `${linkedShop.shopNameUr} دیکھیں`
                          : `Browse ${linkedShop.shopNameEn}`}
                    </span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#C7D3BD]">
                    <Store className="w-3.5 h-3.5 text-[#E5C65A]" />
                    {isUrdu
                      ? 'متعلقہ کمیشن شاپ جلد دستیاب ہوگی'
                      : 'No active shop product linked yet'}
                  </span>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditForm(rate)}
                      className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs font-semibold text-[#FFF0A3] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isUrdu ? 'ترمیم' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRate(rate.id)}
                      className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-400/40 bg-red-950/40 hover:bg-red-900/50 text-xs font-semibold text-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
