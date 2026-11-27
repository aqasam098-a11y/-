import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Lock,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { PAKISTANI_CITIES, SHOPKEEPER_DIRECTORY } from '../../data/seeds';
import {
  AuthUser,
  CommissionShopItem,
  Language,
  RentPaymentMethod,
  ShopRentPayment,
} from '../../types';
import {
  addOneYearIsoDate,
  canManageAdminShops,
  evaluateShopRental,
  getTodayIsoDate,
} from '../../utils/shopRental';

interface AdminShopManagementProps {
  lang: Language;
  shops: CommissionShopItem[];
  authUser: AuthUser | null;
  onCreateShop: (shop: CommissionShopItem) => void;
  onApproveApplication: (
    shopId: string,
    annualRentPkr: number,
    startDate: string,
    expiryDate: string,
    assignedShopkeeperId: string
  ) => void;
  onRejectApplication: (shopId: string, reason: string) => void;
  onUpdateShopAdmin: (
    shopId: string,
    updates: Partial<
      Pick<
        CommissionShopItem,
        | 'annualRentPkr'
        | 'startDate'
        | 'expiryDate'
        | 'assignedShopkeeperId'
        | 'ownerEn'
        | 'ownerUr'
        | 'assignedShopkeeperContact'
        | 'status'
        | 'verified'
      >
    >
  ) => void;
  onRecordRentPayment: (
    shopId: string,
    payment: ShopRentPayment,
    alsoRenewAndActivate: boolean
  ) => void;
  onVerifyPendingPayment: (
    shopId: string,
    paymentId: string,
    approve: boolean
  ) => void;
  onRenewShop: (shopId: string) => void;
  onDeleteShop: (shopId: string) => void;
  onOpenAuth: () => void;
}

export function AdminShopManagement({
  lang,
  shops,
  authUser,
  onCreateShop,
  onApproveApplication,
  onRejectApplication,
  onUpdateShopAdmin,
  onRecordRentPayment,
  onVerifyPendingPayment,
  onRenewShop,
  onDeleteShop,
  onOpenAuth,
}: AdminShopManagementProps) {
  const isUrdu = lang === 'ur';
  const isAdmin = canManageAdminShops(authUser);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameUr, setNewNameUr] = useState('');
  const [newLogo, setNewLogo] = useState('🌾');
  const [newCityEn, setNewCityEn] = useState('Multan');
  const [newMandi, setNewMandi] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKeeperId, setNewKeeperId] = useState(
    SHOPKEEPER_DIRECTORY[0]?.id || 'my-profile'
  );
  const [newRentPkr, setNewRentPkr] = useState('5000');
  const [newStartDate, setNewStartDate] = useState(getTodayIsoDate());
  const [newExpiryDate, setNewExpiryDate] = useState(
    addOneYearIsoDate(getTodayIsoDate())
  );

  // Per-shop inline panels
  const [editingRentShopId, setEditingRentShopId] = useState<string | null>(
    null
  );
  const [editRentVal, setEditRentVal] = useState('');
  const [editStartVal, setEditStartVal] = useState('');
  const [editExpiryVal, setEditExpiryVal] = useState('');
  const [editKeeperVal, setEditKeeperVal] = useState('');

  const [paymentModalShopId, setPaymentModalShopId] = useState<string | null>(
    null
  );
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<RentPaymentMethod>('Easypaisa');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(getTodayIsoDate());
  const [payNote, setPayNote] = useState('');
  const [payAndRenew, setPayAndRenew] = useState(true);

  const [historyShopId, setHistoryShopId] = useState<string | null>(null);
  const [confirmDeleteShop, setConfirmDeleteShop] =
    useState<CommissionShopItem | null>(null);
  const [adminNotice, setAdminNotice] = useState('');

  const pendingApplications = useMemo(
    () => shops.filter((s) => s.status === 'pending'),
    [shops]
  );

  const managedShops = useMemo(
    () => shops.filter((s) => s.status !== 'pending'),
    [shops]
  );

  const stats = useMemo(() => {
    let active = 0;
    let expiredOrSuspended = 0;
    let totalRentConfirmed = 0;
    let pendingVerifications = 0;

    for (const s of shops) {
      const ev = evaluateShopRental(s);
      if (ev.effectiveStatus === 'active') active += 1;
      if (
        ev.effectiveStatus === 'expired' ||
        ev.effectiveStatus === 'suspended'
      ) {
        expiredOrSuspended += 1;
      }
      for (const p of s.paymentHistory) {
        if (p.status === 'confirmed') totalRentConfirmed += p.amountPkr;
        if (p.status === 'pending') pendingVerifications += 1;
      }
    }

    return {
      total: shops.length,
      active,
      pendingApps: pendingApplications.length,
      expiredOrSuspended,
      totalRentConfirmed,
      pendingVerifications,
    };
  }, [shops, pendingApplications.length]);

  if (!isAdmin) {
    return (
      <div className="agri-glass-elevated rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
        <Lock className="w-10 h-10 text-[#E5C65A] mx-auto" />
        <h2 className="text-xl font-bold text-[#FFF0A3]">
          {isUrdu
            ? 'ایڈمن شاپ مینجمنٹ محفوظ پینل'
            : 'Admin-Only Shop Rental Control'}
        </h2>
        <p className="text-sm text-[#D7E2CE]">
          {isUrdu
            ? 'نئی دکان بنانے، سالانہ کرایہ مقرر کرنے، درخواستیں منظور کرنے، کرایہ ادائیگیاں ریکارڈ کرنے اور دکان کی تجدید یا معطلی کے لیے پلیٹ فارم ایڈمن کے طور پر لاگ ان کریں۔'
            : 'Only Desi Beej Exchange Platform Admins can create rental shops, set individual annual rents, approve applications, verify rent payments, and suspend/restore shops.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
        >
          {isUrdu ? 'ایڈمن لاگ ان کریں' : 'Sign In as Platform Admin'}
        </button>
      </div>
    );
  }

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const rentNum = Number(newRentPkr);
    if (
      (!newNameEn.trim() && !newNameUr.trim()) ||
      !Number.isFinite(rentNum) ||
      rentNum <= 0
    ) {
      return;
    }

    const cityObj =
      PAKISTANI_CITIES.find((c) => c.en === newCityEn) || PAKISTANI_CITIES[0];
    const keeper =
      SHOPKEEPER_DIRECTORY.find((k) => k.id === newKeeperId) ||
      SHOPKEEPER_DIRECTORY[0];

    const created: CommissionShopItem = {
      id: `shop-${Date.now()}`,
      shopNameEn: (newNameEn || newNameUr).trim(),
      shopNameUr: (newNameUr || newNameEn).trim(),
      logoEmoji: newLogo || '🌾',
      descriptionEn:
        newDesc.trim() ||
        `Platform-owned Desi Beej Exchange rental shop in ${cityObj.en}.`,
      descriptionUr:
        newDesc.trim() ||
        `${cityObj.ur} میں دیسی بیج ایکسچینج کا منظور شدہ آن لائن اسٹور۔`,
      ownerEn: keeper.nameEn,
      ownerUr: keeper.nameUr,
      assignedShopkeeperId: keeper.id,
      assignedShopkeeperContact: keeper.contact,
      cityEn: cityObj.en,
      cityUr: cityObj.ur,
      mandiEn: newMandi.trim() || `Ghalla Mandi, ${cityObj.en}`,
      mandiUr: newMandi.trim() || `غلہ منڈی، ${cityObj.ur}`,
      specialtyEn: newDesc.trim() || 'Heirloom Seeds & Grains',
      specialtyUr: newDesc.trim() || 'خالص دیسی بیج و اجناس',
      rateNoteEn: 'Live Mandi Rates Linked',
      rateNoteUr: 'منڈی ریٹس سے منسلک',
      commissionPercent: '1.5%',
      whatsapp: keeper.contact,
      hidePhone: false,
      verified: true,
      annualRentPkr: rentNum,
      startDate: newStartDate,
      expiryDate: newExpiryDate,
      status: 'active',
      renewalRequested: false,
      products: [],
      orders: [],
      paymentHistory: [],
      createdAt: Date.now(),
    };

    onCreateShop(created);
    setNewNameEn('');
    setNewNameUr('');
    setNewMandi('');
    setNewDesc('');
    setShowCreateForm(false);
    setAdminNotice(
      isUrdu
        ? `نئی دکان "${created.shopNameUr}" (سالانہ کرایہ Rs. ${rentNum.toLocaleString()}) کامیابی سے بنا دی گئی۔`
        : `Created shop "${created.shopNameEn}" with annual rent Rs. ${rentNum.toLocaleString()}/year.`
    );
  };

  const openEditRentDates = (shop: CommissionShopItem) => {
    setEditingRentShopId(shop.id);
    setEditRentVal(String(shop.annualRentPkr));
    setEditStartVal(shop.startDate);
    setEditExpiryVal(shop.expiryDate);
    setEditKeeperVal(shop.assignedShopkeeperId || SHOPKEEPER_DIRECTORY[0].id);
  };

  const handleSaveRentDates = (shop: CommissionShopItem) => {
    const rent = Number(editRentVal);
    if (!Number.isFinite(rent) || rent < 0) return;
    const keeper = SHOPKEEPER_DIRECTORY.find((k) => k.id === editKeeperVal);
    onUpdateShopAdmin(shop.id, {
      annualRentPkr: rent,
      startDate: editStartVal,
      expiryDate: editExpiryVal,
      ...(keeper
        ? {
            assignedShopkeeperId: keeper.id,
            ownerEn: keeper.nameEn,
            ownerUr: keeper.nameUr,
            assignedShopkeeperContact: keeper.contact,
          }
        : {}),
    });
    setEditingRentShopId(null);
    setAdminNotice(
      isUrdu
        ? `"${shop.shopNameUr}" کے کرایہ اور تاریخوں میں تبدیلی محفوظ ہو گئی۔`
        : `Updated annual rent (Rs. ${rent.toLocaleString()}/yr), dates & shopkeeper for "${shop.shopNameEn}".`
    );
  };

  const openRecordPayment = (shop: CommissionShopItem) => {
    setPaymentModalShopId(shop.id);
    setPayAmount(String(shop.annualRentPkr));
    setPayMethod('Easypaisa');
    setPayRef('');
    setPayDate(getTodayIsoDate());
    setPayNote('');
    setPayAndRenew(true);
  };

  const handleRecordPaymentSubmit = (e: FormEvent, shop: CommissionShopItem) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!payRef.trim() || !Number.isFinite(amt) || amt <= 0) return;

    const payment: ShopRentPayment = {
      id: `pay-${Date.now()}`,
      shopId: shop.id,
      amountPkr: amt,
      method: payMethod,
      reference: payRef.trim(),
      paymentDate: payDate,
      status: 'confirmed',
      note: payNote.trim() || 'Recorded & verified by Platform Admin',
      recordedBy: authUser?.name || 'Platform Admin',
      createdAt: Date.now(),
    };

    onRecordRentPayment(shop.id, payment, payAndRenew);
    setPaymentModalShopId(null);
    setAdminNotice(
      isUrdu
        ? `"${shop.shopNameUr}" کے لیے Rs. ${amt.toLocaleString()} کی ادائیگی محفوظ کر لی گئی۔`
        : `Recorded Rs. ${amt.toLocaleString()} (${payMethod}) rent payment for "${shop.shopNameEn}".`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + Create Button */}
      <section className="agri-glass-elevated rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#E5C65A]">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isUrdu
                ? 'ایڈمن کنٹرول سینٹر — سالانہ کرایہ و دکان مینجمنٹ'
                : 'Admin Control Center — Annual Shop Rental Management'}
            </span>
          </div>
          <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
            {isUrdu
              ? 'پلیٹ فارم کمیشن شاپ مینجمنٹ'
              : 'Admin Shop & Annual Rent Management'}
          </h2>
          <p className="text-xs sm:text-sm text-[#D7E2CE]">
            {isUrdu
              ? 'ہر دکان کا الگ سالانہ کرایہ (مثلاً 5000، 7000، 10000 روپے)، دکاندار کی تفویض، ادائیگیوں کی تصدیق، میعاد کی تجدید اور معطلی کنٹرول کریں۔'
              : 'Create platform-owned shops, configure individual annual rent per shop, approve applications, record/verify rent payments, renew, suspend, or delete shops.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isUrdu ? '+ نئی دکان بنائیں' : '+ Create New Shop'}</span>
        </button>
      </section>

      {/* Admin KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="agri-glass rounded-xl p-4">
          <div className="text-xs text-[#C7D3BD]">
            {isUrdu ? 'کل دکانیں' : 'Total Shops'}
          </div>
          <div className="text-2xl font-extrabold text-[#FFF0A3] tabular-nums mt-1">
            {stats.total}
          </div>
        </div>
        <div className="agri-glass rounded-xl p-4">
          <div className="text-xs text-[#C7D3BD]">
            {isUrdu ? 'فعال دکانیں' : 'Active Shops'}
          </div>
          <div className="text-2xl font-extrabold text-[#E5C65A] tabular-nums mt-1">
            {stats.active}
          </div>
        </div>
        <div className="agri-glass rounded-xl p-4">
          <div className="text-xs text-[#C7D3BD]">
            {isUrdu ? 'نئی درخواستیں' : 'Pending Apps'}
          </div>
          <div className="text-2xl font-extrabold text-[#FFF0A3] tabular-nums mt-1">
            {stats.pendingApps}
          </div>
        </div>
        <div className="agri-glass rounded-xl p-4">
          <div className="text-xs text-[#C7D3BD]">
            {isUrdu ? 'میعاد ختم / معطل' : 'Expired / Suspended'}
          </div>
          <div className="text-2xl font-extrabold text-red-300 tabular-nums mt-1">
            {stats.expiredOrSuspended}
          </div>
        </div>
        <div className="agri-glass rounded-xl p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-[#C7D3BD]">
            {isUrdu ? 'تصدیق شدہ کرایہ وصولی' : 'Confirmed Rent Collected'}
          </div>
          <div className="text-xl font-extrabold text-[#E5C65A] tabular-nums mt-1">
            Rs. {stats.totalRentConfirmed.toLocaleString()}
          </div>
        </div>
      </div>

      {adminNotice && (
        <div
          role="status"
          className="rounded-xl border border-[#E5C65A]/45 bg-[#263B20] px-4 py-3 text-sm font-semibold text-[#FFF0A3] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#E5C65A] shrink-0" />
            {adminNotice}
          </span>
          <button
            type="button"
            onClick={() => setAdminNotice('')}
            className="text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create New Shop Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="agri-glass-elevated rounded-2xl p-5 sm:p-6 space-y-4 border border-[#E5C65A]/45"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#FFF0A3]">
              {isUrdu
                ? 'نئی پلیٹ فارم رینٹل دکان بنائیں'
                : 'Create New Platform Rental Shop'}
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-[#C7D3BD] hover:text-[#FFF0A3] cursor-pointer"
            >
              {isUrdu ? 'بند کریں' : 'Close'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'دکان کا نام (انگلش) *' : 'Shop Name (English) *'}
              </label>
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="e.g., Indus Heritage Seed Shop"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'دکان کا نام (اردو)' : 'Shop Name (Urdu)'}
              </label>
              <input
                type="text"
                dir="rtl"
                value={newNameUr}
                onChange={(e) => setNewNameUr(e.target.value)}
                placeholder="انڈس ہیریٹیج بیج شاپ"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'لوگو / آئیکن' : 'Shop Logo Emblem'}
              </label>
              <select
                value={newLogo}
                onChange={(e) => setNewLogo(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              >
                <option value="🌾">🌾 Wheat / گندم</option>
                <option value="🌱">🌱 Sprout / پودا</option>
                <option value="🌻">🌻 Sunflower / سورج مکھی</option>
                <option value="🌽">🌽 Maize / مکئی</option>
                <option value="🥬">🥬 Vegetables / سبزیاں</option>
                <option value="🏪">🏪 Mandi Store / منڈی اسٹور</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'دکاندار تفویض کریں' : 'Assign Shopkeeper'}
              </label>
              <select
                value={newKeeperId}
                onChange={(e) => setNewKeeperId(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              >
                {SHOPKEEPER_DIRECTORY.map((k) => (
                  <option key={k.id} value={k.id}>
                    {isUrdu ? k.nameUr : k.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'سالانہ کرایہ (روپے) *' : 'Individual Annual Rent (PKR) *'}
              </label>
              <input
                type="number"
                min={0}
                value={newRentPkr}
                onChange={(e) => setNewRentPkr(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'شہر' : 'City'}
              </label>
              <select
                value={newCityEn}
                onChange={(e) => setNewCityEn(e.target.value)}
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
                {isUrdu ? 'شروع ہونے کی تاریخ' : 'Start Date'}
              </label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'ختم ہونے کی تاریخ' : 'Expiry Date'}
              </label>
              <input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'منڈی پتہ' : 'Mandi Address'}
              </label>
              <input
                type="text"
                value={newMandi}
                onChange={(e) => setNewMandi(e.target.value)}
                placeholder="e.g., Ghalla Mandi Shop #8"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-[#FFF0A3] mb-1">
                {isUrdu ? 'دکان کی تفصیل' : 'Shop Description'}
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Specializing in pure heirloom grains and vegetable seeds..."
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
            >
              {isUrdu ? 'دکان محفوظ کریں' : 'Create Rental Shop'}
            </button>
          </div>
        </form>
      )}

      {/* Pending Shop Applications (Approve / Reject) */}
      {pendingApplications.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#FFF0A3]">
            {isUrdu
              ? `زیرِ غور شاپ درخواستیں (${pendingApplications.length})`
              : `Pending Shop Applications (${pendingApplications.length})`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApplications.map((app) => (
              <div
                key={app.id}
                className="agri-glass rounded-2xl p-5 border border-[#E5C65A]/45 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-950/70 text-[#E5C65A] text-[11px] font-bold mb-1">
                      {isUrdu ? 'نئی درخواست' : 'Pending Application'}
                    </span>
                    <h4 className="text-base font-bold text-[#FFF0A3]">
                      {app.logoEmoji || '🌱'}{' '}
                      {isUrdu ? app.shopNameUr : app.shopNameEn}
                    </h4>
                    <p className="text-xs text-[#C7D3BD]">
                      {isUrdu ? app.ownerUr : app.ownerEn} ·{' '}
                      {isUrdu ? app.cityUr : app.cityEn}
                    </p>
                  </div>
                  <div className="text-end text-xs font-bold text-[#E5C65A] tabular-nums">
                    Rs. {app.annualRentPkr.toLocaleString()}/yr
                  </div>
                </div>

                <p className="text-xs text-[#D7E2CE]">
                  {isUrdu ? app.specialtyUr : app.specialtyEn}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#44633B]/50">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getTodayIsoDate();
                      onApproveApplication(
                        app.id,
                        app.annualRentPkr || 5000,
                        today,
                        addOneYearIsoDate(today),
                        app.assignedShopkeeperId || 'my-profile'
                      );
                      setAdminNotice(
                        isUrdu
                          ? `"${app.shopNameUr}" منظور کر دی گئی۔`
                          : `Approved "${app.shopNameEn}" and activated rental shop.`
                      );
                    }}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'منظور کریں' : 'Approve & Activate'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRejectApplication(
                        app.id,
                        'Rejected by Admin review'
                      );
                      setAdminNotice(
                        isUrdu
                          ? `"${app.shopNameUr}" کی درخواست مسترد کر دی گئی۔`
                          : `Rejected "${app.shopNameEn}" application.`
                      );
                    }}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-400/45 bg-red-950/50 text-red-200 text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'مسترد کریں' : 'Reject'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Managed Shops List */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#FFF0A3]">
          {isUrdu
            ? `تمام پلیٹ فارم شاپس (${managedShops.length})`
            : `All Platform Rental Shops (${managedShops.length})`}
        </h3>

        <div className="space-y-4">
          {managedShops.map((shop) => {
            const ev = evaluateShopRental(shop);
            const isEditing = editingRentShopId === shop.id;
            const isRecordingPay = paymentModalShopId === shop.id;
            const isViewingHistory = historyShopId === shop.id;

            return (
              <article
                key={shop.id}
                className="agri-glass rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#263B20] border border-[#E5C65A]/40 flex items-center justify-center text-2xl shrink-0">
                      {shop.logoEmoji || '🌾'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base sm:text-lg font-bold text-[#FFF0A3]">
                          {isUrdu ? shop.shopNameUr : shop.shopNameEn}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            ev.effectiveStatus === 'active'
                              ? 'bg-[#263B20] border border-[#E5C65A]/45 text-[#FFF0A3]'
                              : ev.effectiveStatus === 'expired' ||
                                  ev.effectiveStatus === 'suspended'
                                ? 'bg-red-950/70 border border-red-400/50 text-red-200'
                                : 'bg-[#13311D] border border-[#44633B] text-[#C7D3BD]'
                          }`}
                        >
                          {ev.effectiveStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#C7D3BD]">
                        <span>
                          <UserCheck className="w-3.5 h-3.5 inline me-1 text-[#E5C65A]" />
                          {isUrdu ? shop.ownerUr : shop.ownerEn}
                        </span>
                        <span>·</span>
                        <span>{isUrdu ? shop.cityUr : shop.cityEn}</span>
                        <span>·</span>
                        <span dir="ltr" className="tabular-nums">
                          {shop.startDate} → {shop.expiryDate}
                        </span>
                        <span>·</span>
                        <span
                          className={`font-bold tabular-nums ${
                            ev.remainingDays < 0
                              ? 'text-red-300'
                              : ev.remainingDays <= 30
                                ? 'text-[#E5C65A]'
                                : 'text-[#FFF0A3]'
                          }`}
                        >
                          {ev.remainingDays < 0
                            ? `${Math.abs(ev.remainingDays)}d overdue`
                            : `${ev.remainingDays}d left`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Annual Rent Highlight */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="px-3.5 py-2 rounded-xl bg-[#0D2314] border border-[#E5C65A]/40 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-[#C7D3BD]">
                        {isUrdu ? 'سالانہ کرایہ' : 'Annual Rent'}
                      </div>
                      <div className="text-base font-extrabold text-[#E5C65A] tabular-nums">
                        Rs. {shop.annualRentPkr.toLocaleString()}/yr
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pending Renewal Payment Verification Banner */}
                {ev.pendingPayment && (
                  <div className="rounded-xl bg-[#263B20] border border-[#E5C65A]/55 p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm text-[#FFF0A3]">
                      <strong>
                        {isUrdu
                          ? 'تجدید ادائیگی تصدیق کے لیے منتظر: '
                          : 'Pending Renewal Payment: '}
                      </strong>
                      Rs. {ev.pendingPayment.amountPkr.toLocaleString()} via{' '}
                      {ev.pendingPayment.method} (Ref:{' '}
                      <span dir="ltr">{ev.pendingPayment.reference}</span>)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onVerifyPendingPayment(
                            shop.id,
                            ev.pendingPayment!.id,
                            true
                          );
                          setAdminNotice(
                            isUrdu
                              ? `ادائیگی تصدیق کر دی گئی اور دکان "${shop.shopNameUr}" کی میعاد 1 سال بڑھا دی گئی۔`
                              : `Confirmed payment and renewed "${shop.shopNameEn}" for 1 year.`
                          );
                        }}
                        className="min-h-[34px] px-3 py-1 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold cursor-pointer"
                      >
                        {isUrdu
                          ? 'تصدیق و تجدید کریں'
                          : 'Confirm & Restore/Renew'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onVerifyPendingPayment(
                            shop.id,
                            ev.pendingPayment!.id,
                            false
                          )
                        }
                        className="min-h-[34px] px-3 py-1 rounded-lg border border-red-400/45 bg-red-950/50 text-red-200 text-xs font-semibold cursor-pointer"
                      >
                        {isUrdu ? 'مسترد' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#44633B]/50">
                  <button
                    type="button"
                    onClick={() =>
                      isEditing
                        ? setEditingRentShopId(null)
                        : openEditRentDates(shop)
                    }
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs font-semibold text-[#FFF0A3] cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#E5C65A]" />
                    <span>
                      {isUrdu
                        ? 'کرایہ / تاریخیں / دکاندار'
                        : 'Set Rent / Dates / Keeper'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isRecordingPay
                        ? setPaymentModalShopId(null)
                        : openRecordPayment(shop)
                    }
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5C65A]/45 bg-[#263B20] hover:bg-[#314B29] text-xs font-semibold text-[#FFF0A3] cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#E5C65A]" />
                    <span>
                      {isUrdu ? 'کرایہ ادائیگی درج کریں' : 'Record Payment'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRenewShop(shop.id);
                      setAdminNotice(
                        isUrdu
                          ? `"${shop.shopNameUr}" 1 سال کے لیے تجدید اور فعال کر دی گئی۔`
                          : `Renewed "${shop.shopNameEn}" for +1 year and activated storefront.`
                      );
                    }}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'تجدید (+1 سال)' : 'Renew (+1 Yr)'}</span>
                  </button>

                  {ev.effectiveStatus === 'active' ? (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateShopAdmin(shop.id, { status: 'suspended' })
                      }
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-950/40 text-xs font-semibold text-[#FFF0A3] cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>{isUrdu ? 'معطل کریں' : 'Suspend'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayIsoDate();
                        onUpdateShopAdmin(shop.id, {
                          status: 'active',
                          ...(ev.isExpired
                            ? { expiryDate: addOneYearIsoDate(today) }
                            : {}),
                        });
                      }}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5C65A]/45 bg-[#183822] text-xs font-semibold text-[#FFF0A3] cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-[#E5C65A]" />
                      <span>{isUrdu ? 'فعال کریں' : 'Activate'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setHistoryShopId(isViewingHistory ? null : shop.id)
                    }
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#44633B] bg-[#0D2314] text-xs font-semibold text-[#D7E2CE] hover:text-[#FFF0A3] cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#E5C65A]" />
                    <span>
                      {isUrdu
                        ? `ادائیگی ریکارڈ (${shop.paymentHistory.length})`
                        : `History (${shop.paymentHistory.length})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteShop(shop)}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-950/40 hover:bg-red-900/50 text-xs font-semibold text-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'حذف کریں' : 'Delete'}</span>
                  </button>
                </div>

                {/* Inline Edit Rent, Dates & Shopkeeper */}
                {isEditing && (
                  <div className="rounded-xl bg-[#0D2314] border border-[#E5C65A]/40 p-4 space-y-3">
                    <h5 className="text-xs sm:text-sm font-bold text-[#FFF0A3]">
                      {isUrdu
                        ? 'انفرادی سالانہ کرایہ، تاریخیں اور دکاندار کی تفویض'
                        : 'Set Individual Annual Rent, Dates & Shopkeeper'}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'سالانہ کرایہ (PKR)' : 'Annual Rent (PKR)'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editRentVal}
                          onChange={(e) => setEditRentVal(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'شروع تاریخ' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          value={editStartVal}
                          onChange={(e) => setEditStartVal(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'میعاد ختم تاریخ' : 'Expiry Date'}
                        </label>
                        <input
                          type="date"
                          value={editExpiryVal}
                          onChange={(e) => setEditExpiryVal(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'تفویض کردہ دکاندار' : 'Assigned Shopkeeper'}
                        </label>
                        <select
                          value={editKeeperVal}
                          onChange={(e) => setEditKeeperVal(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        >
                          {SHOPKEEPER_DIRECTORY.map((k) => (
                            <option key={k.id} value={k.id}>
                              {isUrdu ? k.nameUr : k.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRentShopId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs text-[#C7D3BD] cursor-pointer"
                      >
                        {isUrdu ? 'منسوخ' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveRentDates(shop)}
                        className="px-4 py-1.5 rounded-lg bg-[#E5C65A] text-[#102B19] text-xs font-bold cursor-pointer"
                      >
                        {isUrdu ? 'محفوظ کریں' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Record Payment Form */}
                {isRecordingPay && (
                  <form
                    onSubmit={(e) => handleRecordPaymentSubmit(e, shop)}
                    className="rounded-xl bg-[#0D2314] border border-[#E5C65A]/40 p-4 space-y-3"
                  >
                    <h5 className="text-xs sm:text-sm font-bold text-[#FFF0A3]">
                      {isUrdu
                        ? 'سالانہ کرایہ کی ادائیگی ریکارڈ کریں'
                        : 'Record & Verify Rent Payment'}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'رقم (PKR)' : 'Amount (PKR)'}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'ادائیگی کا طریقہ' : 'Method'}
                        </label>
                        <select
                          value={payMethod}
                          onChange={(e) =>
                            setPayMethod(e.target.value as RentPaymentMethod)
                          }
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        >
                          <option value="Easypaisa">Easypaisa</option>
                          <option value="JazzCash">JazzCash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'ریفرنس نمبر *' : 'Reference ID *'}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          required
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="EP-123456"
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#C7D3BD] mb-1">
                          {isUrdu ? 'تاریخ' : 'Payment Date'}
                        </label>
                        <input
                          type="date"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#13311D] border border-[#44633B] text-sm text-[#F8F7EA]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-[#D7E2CE] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={payAndRenew}
                          onChange={(e) => setPayAndRenew(e.target.checked)}
                          className="w-4 h-4 accent-[#E5C65A]"
                        />
                        <span>
                          {isUrdu
                            ? 'ساتھ ہی دکان کو 1 سال کے لیے تجدید و فعال کریں'
                            : 'Also extend shop expiry (+1 year) & activate'}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentModalShopId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-[#C7D3BD] cursor-pointer"
                        >
                          {isUrdu ? 'منسوخ' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-[#E5C65A] text-[#102B19] text-xs font-bold cursor-pointer"
                        >
                          {isUrdu ? 'ادائیگی محفوظ کریں' : 'Confirm & Record'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Inline Payment History */}
                {isViewingHistory && (
                  <div className="rounded-xl bg-[#0D2314] border border-[#44633B] p-4 space-y-2.5">
                    <h5 className="text-xs sm:text-sm font-bold text-[#FFF0A3]">
                      {isUrdu ? 'مکمل ادائیگی تاریخ' : 'Complete Rent Payment History'}
                    </h5>
                    {shop.paymentHistory.length === 0 ? (
                      <p className="text-xs text-[#C7D3BD]">
                        {isUrdu
                          ? 'ابھی کوئی ادائیگی درج نہیں ہے۔'
                          : 'No payments recorded for this shop yet.'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                          <thead className="text-[#FFF0A3] border-b border-[#44633B]">
                            <tr>
                              <th className="py-1.5 pe-3 text-start">Date</th>
                              <th className="py-1.5 pe-3 text-start">Amount</th>
                              <th className="py-1.5 pe-3 text-start">Method</th>
                              <th className="py-1.5 pe-3 text-start">Reference</th>
                              <th className="py-1.5 pe-3 text-start">Status</th>
                              <th className="py-1.5 text-start">Recorded By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#44633B]/40">
                            {shop.paymentHistory.map((p) => (
                              <tr key={p.id}>
                                <td dir="ltr" className="py-2 pe-3 tabular-nums">
                                  {p.paymentDate}
                                </td>
                                <td className="py-2 pe-3 font-bold text-[#E5C65A] tabular-nums">
                                  Rs. {p.amountPkr.toLocaleString()}
                                </td>
                                <td className="py-2 pe-3">{p.method}</td>
                                <td dir="ltr" className="py-2 pe-3">
                                  {p.reference}
                                </td>
                                <td className="py-2 pe-3 font-semibold">
                                  {p.status}
                                </td>
                                <td className="py-2 text-[#C7D3BD]">
                                  {p.recordedBy}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Delete Shop Confirmation Modal */}
      {confirmDeleteShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08170D]/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteShop(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#13311D] border border-red-400/50 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">
                {isUrdu
                  ? 'دکان حذف کرنے کی تصدیق'
                  : 'Confirm Permanent Shop Deletion'}
              </h3>
            </div>
            <p className="text-sm text-[#D7E2CE]">
              {isUrdu
                ? `کیا آپ واقعی "${confirmDeleteShop.shopNameUr}" کو ہمیشہ کے لیے حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں ہو سکے گا۔`
                : `Are you sure you want to permanently delete "${confirmDeleteShop.shopNameEn}"? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteShop(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[#44633B] text-xs sm:text-sm font-semibold text-[#F8F7EA] cursor-pointer"
              >
                {isUrdu ? 'منسوخ کریں' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteShop(confirmDeleteShop.id);
                  setAdminNotice(
                    isUrdu
                      ? `"${confirmDeleteShop.shopNameUr}" حذف کر دی گئی۔`
                      : `Deleted shop "${confirmDeleteShop.shopNameEn}".`
                  );
                  setConfirmDeleteShop(null);
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                {isUrdu ? 'جی ہاں، حذف کریں' : 'Yes, Delete Shop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
