import {
  AuthUser,
  CommissionShopItem,
  ShopRentPayment,
  ShopStatus,
} from '../types';

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function offsetIsoDate(daysOffset: number, fromDateStr?: string): string {
  const base = fromDateStr ? parseIsoDateUtc(fromDateStr) : parseIsoDateUtc(getTodayIsoDate());
  base.setUTCDate(base.getUTCDate() + daysOffset);
  return base.toISOString().slice(0, 10);
}

export function addOneYearIsoDate(fromDateStr?: string): string {
  const baseStr = fromDateStr || getTodayIsoDate();
  const base = parseIsoDateUtc(baseStr);
  base.setUTCFullYear(base.getUTCFullYear() + 1);
  return base.toISOString().slice(0, 10);
}

function parseIsoDateUtc(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month, day));
}

export function getRemainingDays(expiryDateStr: string, todayStr?: string): number {
  const today = parseIsoDateUtc(todayStr || getTodayIsoDate());
  const expiry = parseIsoDateUtc(expiryDateStr);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

export interface ShopRentalEvaluation {
  remainingDays: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  effectiveStatus: ShopStatus;
  paymentStatus: 'paid' | 'pending' | 'verification_pending' | 'overdue';
  renewalStatus:
    | 'active'
    | 'expiring_soon'
    | 'renewal_requested'
    | 'expired_suspended'
    | 'suspended'
    | 'pending_approval'
    | 'rejected';
  lastConfirmedPayment: ShopRentPayment | null;
  pendingPayment: ShopRentPayment | null;
}

export function evaluateShopRental(
  shop: CommissionShopItem,
  todayStr?: string
): ShopRentalEvaluation {
  const remainingDays = getRemainingDays(shop.expiryDate, todayStr);
  const isExpired = remainingDays < 0;
  const isExpiringSoon = remainingDays >= 0 && remainingDays <= 30;

  let effectiveStatus: ShopStatus = shop.status;
  if (shop.status === 'active' && isExpired) {
    effectiveStatus = 'expired';
  }

  const sortedPayments = [...(shop.paymentHistory || [])].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  const pendingPayment =
    sortedPayments.find((p) => p.status === 'pending') || null;
  const lastConfirmedPayment =
    sortedPayments.find((p) => p.status === 'confirmed') || null;

  let paymentStatus: ShopRentalEvaluation['paymentStatus'] = 'pending';
  if (pendingPayment) {
    paymentStatus = 'verification_pending';
  } else if (isExpired) {
    paymentStatus = 'overdue';
  } else if (lastConfirmedPayment) {
    paymentStatus = 'paid';
  }

  let renewalStatus: ShopRentalEvaluation['renewalStatus'] = 'active';
  if (effectiveStatus === 'pending') {
    renewalStatus = 'pending_approval';
  } else if (effectiveStatus === 'rejected') {
    renewalStatus = 'rejected';
  } else if (effectiveStatus === 'suspended') {
    renewalStatus = 'suspended';
  } else if (effectiveStatus === 'expired') {
    renewalStatus = pendingPayment || shop.renewalRequested
      ? 'renewal_requested'
      : 'expired_suspended';
  } else if (pendingPayment || shop.renewalRequested) {
    renewalStatus = 'renewal_requested';
  } else if (isExpiringSoon) {
    renewalStatus = 'expiring_soon';
  } else {
    renewalStatus = 'active';
  }

  return {
    remainingDays,
    isExpired,
    isExpiringSoon,
    effectiveStatus,
    paymentStatus,
    renewalStatus,
    lastConfirmedPayment,
    pendingPayment,
  };
}

export function parseNumericStock(stockQty?: string, fallbackCount = 20): number {
  if (!stockQty) return fallbackCount;
  const match = /(\d+)/.exec(stockQty);
  if (!match) return fallbackCount;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : fallbackCount;
}

export function deductProductStock(
  product: CommissionShopItem['products'][number],
  orderedQty: number
): CommissionShopItem['products'][number] {
  const rawCurrent =
    typeof product.stockCount === 'number'
      ? product.stockCount
      : parseNumericStock(product.stockQty, product.inStock ? 20 : 0);
  const currentCount = Math.max(0, Math.round(rawCurrent));
  const safeOrdered = Math.max(1, Math.round(orderedQty));
  const nextCount = Math.max(0, currentCount - safeOrdered);
  const unitLabel = product.stockQty.replace(/^\s*\d+\s*/, '').trim() || 'Units';
  return {
    ...product,
    stockCount: nextCount,
    stockQty: `${nextCount} ${unitLabel}`,
    inStock: nextCount > 0,
  };
}

/**
 * Normalizes legacy stored shops without losing existing fields,
 * and enforces automatic expiry suspension without deleting products or historical orders.
 */
export function normalizeAndAutoExpireShops(
  rawShops: Partial<CommissionShopItem>[],
  fallbackShops: CommissionShopItem[],
  todayStr?: string
): CommissionShopItem[] {
  const today = todayStr || getTodayIsoDate();
  const fallbackMap = new Map(fallbackShops.map((s) => [s.id, s]));

  return rawShops.map((raw, index) => {
    const fb = (raw.id && fallbackMap.get(raw.id)) || fallbackShops[index];
    const startDate = raw.startDate || fb?.startDate || offsetIsoDate(-180, today);
    const expiryDate = raw.expiryDate || fb?.expiryDate || offsetIsoDate(185, today);
    const baseStatus: ShopStatus = raw.status || fb?.status || 'active';
    const remaining = getRemainingDays(expiryDate, today);

    // Automatic shop suspension when expired if not renewed; preserves products & orders
    const nextStatus: ShopStatus =
      baseStatus === 'active' && remaining < 0 ? 'expired' : baseStatus;

    const rawProducts = Array.isArray(raw.products)
      ? raw.products
      : fb?.products || [];
    const fbProductMap = new Map((fb?.products || []).map((p) => [p.id, p]));

    const normalizedProducts = rawProducts.map((prod) => {
      const fbp = fbProductMap.get(prod.id);
      const bagPrice = prod.pricePerBagPkr ?? fbp?.pricePerBagPkr ?? prod.pricePkr;
      const inferredPerKg =
        prod.pricePerKgPkr ??
        fbp?.pricePerKgPkr ??
        (prod.unitEn?.toLowerCase().includes('40kg')
          ? Math.round(bagPrice / 40)
          : prod.unitEn?.toLowerCase().includes('50kg')
            ? Math.round(bagPrice / 50)
            : bagPrice);
      const numericStock =
        typeof prod.stockCount === 'number'
          ? prod.stockCount
          : fbp?.stockCount ??
            parseNumericStock(prod.stockQty, prod.inStock ? 25 : 0);

      return {
        ...fbp,
        ...prod,
        varietyUr: prod.varietyUr || fbp?.varietyUr || 'خالص دیسی قسم',
        varietyEn: prod.varietyEn || fbp?.varietyEn || 'Pure Heirloom Landrace',
        pricePerBagPkr: bagPrice,
        pricePerKgPkr: inferredPerKg,
        stockCount: numericStock,
        minOrderQty: prod.minOrderQty ?? fbp?.minOrderQty ?? 1,
        featured: prod.featured ?? fbp?.featured ?? false,
        imageUrl: prod.imageUrl || fbp?.imageUrl,
        galleryUrls:
          prod.galleryUrls && prod.galleryUrls.length > 0
            ? prod.galleryUrls
            : fbp?.galleryUrls || (prod.imageUrl ? [prod.imageUrl] : []),
        cropInfoUr:
          prod.cropInfoUr ||
          fbp?.cropInfoUr ||
          'غیر ہائبرڈ خالص دیسی بیج، اعلیٰ اُگاؤ اور مقامی آب و ہوا کے موافق۔',
        cropInfoEn:
          prod.cropInfoEn ||
          fbp?.cropInfoEn ||
          'Open-pollinated non-GMO heirloom seed tested for regional climate resilience and clean germination.',
      };
    });

    const cityUr = raw.cityUr || fb?.cityUr || 'ملتان';
    const cityEn = raw.cityEn || fb?.cityEn || 'Multan';

    return {
      id: raw.id || `shop-${Date.now()}-${index}`,
      shopNameUr: raw.shopNameUr || fb?.shopNameUr || 'دیسی بیج کمیشن شاپ',
      shopNameEn: raw.shopNameEn || fb?.shopNameEn || 'Desi Beej Commission Shop',
      logoEmoji: raw.logoEmoji || fb?.logoEmoji || '🌾',
      coverImageUrl: raw.coverImageUrl || fb?.coverImageUrl,
      descriptionUr:
        raw.descriptionUr ||
        fb?.descriptionUr ||
        raw.specialtyUr ||
        'دیسی بیج ایکسچینج کا منظور شدہ آن لائن زرعی اسٹور۔',
      descriptionEn:
        raw.descriptionEn ||
        fb?.descriptionEn ||
        raw.specialtyEn ||
        'Platform-owned heirloom seed commission shop.',
      ownerUr: raw.ownerUr || fb?.ownerUr || 'دکاندار',
      ownerEn: raw.ownerEn || fb?.ownerEn || 'Shopkeeper',
      assignedShopkeeperId:
        raw.assignedShopkeeperId || fb?.assignedShopkeeperId || 'my-profile',
      assignedShopkeeperContact:
        raw.assignedShopkeeperContact ||
        fb?.assignedShopkeeperContact ||
        raw.whatsapp ||
        '',
      cityUr,
      cityEn,
      districtUr: raw.districtUr || fb?.districtUr || `ضلع ${cityUr}`,
      districtEn: raw.districtEn || fb?.districtEn || `${cityEn} District`,
      mandiUr: raw.mandiUr || fb?.mandiUr || 'غلہ منڈی',
      mandiEn: raw.mandiEn || fb?.mandiEn || 'Ghalla Mandi',
      specialtyUr: raw.specialtyUr || fb?.specialtyUr || 'خالص دیسی بیج',
      specialtyEn: raw.specialtyEn || fb?.specialtyEn || 'Pure Desi Seeds',
      rateNoteUr:
        raw.rateNoteUr || fb?.rateNoteUr || 'منڈی ریٹ دستیاب ہیں',
      rateNoteEn:
        raw.rateNoteEn || fb?.rateNoteEn || 'Mandi rates available',
      commissionPercent: raw.commissionPercent || fb?.commissionPercent || '1.5%',
      whatsapp: raw.whatsapp || fb?.whatsapp || '923001234567',
      hidePhone: raw.hidePhone ?? fb?.hidePhone ?? false,
      verified: raw.verified ?? fb?.verified ?? true,
      featured: raw.featured ?? fb?.featured ?? false,
      annualRentPkr:
        typeof raw.annualRentPkr === 'number' && raw.annualRentPkr >= 0
          ? raw.annualRentPkr
          : fb?.annualRentPkr ?? 5000,
      startDate,
      expiryDate,
      status: nextStatus,
      renewalRequested: Boolean(raw.renewalRequested),
      rejectionReason: raw.rejectionReason,
      products: normalizedProducts,
      orders: Array.isArray(raw.orders) ? raw.orders : fb?.orders || [],
      paymentHistory: Array.isArray(raw.paymentHistory)
        ? raw.paymentHistory
        : fb?.paymentHistory || [],
      createdAt: raw.createdAt || fb?.createdAt || Date.now(),
    };
  });
}

export function canManageAdminShops(user: AuthUser | null): boolean {
  return Boolean(user && user.role === 'admin');
}

export function canManageAssignedShop(
  user: AuthUser | null,
  shop: CommissionShopItem
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'shopkeeper') {
    return (
      shop.assignedShopkeeperId === user.id ||
      (Boolean(user.firebaseUid) &&
        (shop.assignedShopkeeperUid === user.firebaseUid ||
          shop.applicantUid === user.firebaseUid)) ||
      (Boolean(user.emailOrPhone) &&
        shop.assignedShopkeeperContact === user.emailOrPhone)
    );
  }
  return false;
}
