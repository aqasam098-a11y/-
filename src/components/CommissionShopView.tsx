import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Home,
  Lock,
  MapPin,
  MessageSquareText,
  Package,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Store,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  getCityCoords,
  INITIAL_COMMISSION_SHOPS,
  INITIAL_MANDI_RATES,
  PAKISTANI_CITIES,
  UI_COPY,
  WHEAT_HERO_IMAGE_URL,
} from '../data/seeds';
import {
  AuthUser,
  CartItem,
  CategoryId,
  CommissionShopItem,
  CommissionShopSection,
  FarmerProfile,
  Language,
  MandiRateItem,
  ShopOrder,
  ShopOrderStatus,
  ShopProduct,
  ShopRentPayment,
} from '../types';
import {
  addOneYearIsoDate,
  canManageAdminShops,
  canManageAssignedShop,
  deductProductStock,
  evaluateShopRental,
  getRemainingDays,
  getTodayIsoDate,
  normalizeAndAutoExpireShops,
} from '../utils/shopRental';
import { User as FirebaseUser } from 'firebase/auth';
import {
  getFirebaseUpgradeConsoleUrl,
  isQuotaExceededFirestoreError,
} from '../firebase';
import {
  createCommissionShopInFirestore,
  createRentPaymentInFirestore,
  createShopProductInFirestore,
  deleteCommissionShopInFirestore,
  deleteMandiRateInFirestore,
  deleteShopProductInFirestore,
  placeMultipleShopOrdersSequentialInFirestore,
  placeShopOrderAtomicInFirestore,
  subscribeCommissionShopsForContext,
  subscribePublicMandiRates,
  syncShopProductsVisibilityInFirestore,
  updateCommissionShopInFirestore,
  updateShopOrderStatusInFirestore,
  updateShopProductInFirestore,
  upsertMandiRateInFirestore,
  verifyPendingRentPaymentInFirestore,
} from '../services/firestoreSync';
import { AdminShopManagement } from './commission/AdminShopManagement';
import { MandiRatesBoard } from './commission/MandiRatesBoard';
import { ProductDetailPanel } from './commission/ProductDetailPanel';
import { ShopCartDrawer } from './commission/ShopCartDrawer';
import { ShopDetailPanel } from './commission/ShopDetailPanel';
import { ShopkeeperRentDashboard } from './commission/ShopkeeperRentDashboard';
import { ShopProductCard } from './commission/ShopProductCard';

const SHOPS_STORAGE_KEY = 'desibeej_commission_shops_v1';
const MANDI_RATES_STORAGE_KEY = 'desibeej_mandi_rates_v1';
const CART_STORAGE_KEY = 'desibeej_shop_cart_v1';

type ShopViewTab = 'all' | 'featured' | 'latest';
type ProductPriceFilter = 'all' | 'under-2000' | '2000-6000' | 'above-6000';
type ProductSortOption = 'latest' | 'price-asc' | 'price-desc';

interface CommissionShopViewProps {
  lang: Language;
  myProfile: FarmerProfile;
  authUser: AuthUser | null;
  firebaseUser?: FirebaseUser | null;
  authReady?: boolean;
  cloudCartItems?: CartItem[] | null;
  onSyncCartToCloud?: (cart: CartItem[]) => void;
  initialSection?: CommissionShopSection;
  initialShopId?: string | null;
  initialProductId?: string | null;
  onBackHome: () => void;
  onOpenAddSeed: () => void;
  onOpenChatHub: () => void;
  onOpenAuth: () => void;
}

export function CommissionShopView({
  lang,
  myProfile,
  authUser,
  firebaseUser = null,
  authReady = true,
  cloudCartItems = null,
  onSyncCartToCloud,
  initialSection = 'shops',
  initialShopId = null,
  initialProductId = null,
  onBackHome,
  onOpenAddSeed,
  onOpenChatHub,
  onOpenAuth,
}: CommissionShopViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];
  const productsSectionRef = useRef<HTMLElement | null>(null);

  const [activeSection, setActiveSection] =
    useState<CommissionShopSection>(initialSection);

  const [selectedShopId, setSelectedShopId] = useState<string | null>(
    initialShopId ?? null
  );
  const [selectedProductRef, setSelectedProductRef] = useState<{
    shopId: string;
    productId: string;
    openOrderForm?: boolean;
  } | null>(() =>
    initialShopId && initialProductId
      ? {
          shopId: initialShopId,
          productId: initialProductId,
          openOrderForm: false,
        }
      : null
  );
  const [highlightedProductId, setHighlightedProductId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setActiveSection(initialSection);
    if (initialSection !== 'shops') {
      setSelectedShopId(null);
      setSelectedProductRef(null);
      setHighlightedProductId(null);
    }
  }, [initialSection]);

  const [shops, setShops] = useState<CommissionShopItem[]>(() => {
    try {
      const saved = localStorage.getItem(SHOPS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeAndAutoExpireShops(parsed, INITIAL_COMMISSION_SHOPS);
        }
      }
    } catch {
      // Fallback to initial platform rental shops
    }
    return normalizeAndAutoExpireShops(
      INITIAL_COMMISSION_SHOPS,
      INITIAL_COMMISSION_SHOPS
    );
  });

  const [rates, setRates] = useState<MandiRateItem[]>(() => {
    try {
      const saved = localStorage.getItem(MANDI_RATES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial mandi rates
    }
    return INITIAL_MANDI_RATES;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [firestoreNotice, setFirestoreNotice] = useState<{
    message: string;
    isQuota: boolean;
  } | null>(null);
  const hasCloudShopsRef = useRef(false);
  const hasCloudRatesRef = useRef(false);

  const reportFirestoreError = (err: unknown) => {
    const isQuota = isQuotaExceededFirestoreError(err);
    setFirestoreNotice({
      isQuota,
      message: isQuota
        ? isUrdu
          ? 'فائر اسٹور کی یومیہ مفت حد پوری ہو گئی ہے (کل دوبارہ بحال ہو جائے گی)۔'
          : 'Daily Firestore free-tier quota exceeded; it will reset tomorrow.'
        : isUrdu
          ? 'کلاؤڈ ڈیٹابیس سے ہم آہنگی میں عارضی مسئلہ آیا ہے۔ براہِ کرم اپنی لاگ ان یا انٹرنیٹ حالت چیک کریں۔'
          : 'Could not sync one or more changes with Cloud Firestore. Check your signed-in role or connection.',
    });
  };

  const runFirestoreOp = (promise: Promise<unknown>) => {
    void promise.catch((err) => {
      reportFirestoreError(err);
    });
  };

  useEffect(() => {
    if (cloudCartItems && cloudCartItems.length > 0) {
      setCartItems(cloudCartItems);
    }
  }, [cloudCartItems]);

  useEffect(() => {
    if (!authReady) return;
    const unsubShops = subscribeCommissionShopsForContext(
      firebaseUser,
      (fbShops) => {
        if (fbShops.length > 0 || hasCloudShopsRef.current) {
          hasCloudShopsRef.current = true;
          setShops(
            normalizeAndAutoExpireShops(fbShops, INITIAL_COMMISSION_SHOPS)
          );
        }
      },
      reportFirestoreError
    );
    const unsubRates = subscribePublicMandiRates(
      (fbRates) => {
        if (fbRates.length > 0 || hasCloudRatesRef.current) {
          hasCloudRatesRef.current = true;
          setRates(fbRates);
        }
      },
      reportFirestoreError
    );
    return () => {
      unsubShops();
      unsubRates();
    };
  }, [authReady, firebaseUser]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOPS_STORAGE_KEY, JSON.stringify(shops));
    } catch {
      // Ignore storage quota errors
    }
  }, [shops]);

  useEffect(() => {
    try {
      localStorage.setItem(MANDI_RATES_STORAGE_KEY, JSON.stringify(rates));
    } catch {
      // Ignore storage quota errors
    }
  }, [rates]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  // Marketplace Filters & Tabs (Sections A & E)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [priceFilter, setPriceFilter] = useState<ProductPriceFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<ProductSortOption>('latest');
  const [shopTab, setShopTab] = useState<ShopViewTab>('all');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [failedCoverMap, setFailedCoverMap] = useState<Record<string, boolean>>(
    {}
  );

  // Rental Shop Application form state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState(
    isUrdu ? myProfile.nameUr : myProfile.nameEn
  );
  const [cityEn, setCityEn] = useState(myProfile.cityEn || 'Multan');
  const [mandiAddress, setMandiAddress] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [proposedRent, setProposedRent] = useState('5000');
  const [whatsapp, setWhatsapp] = useState(myProfile.whatsapp);
  const [hidePhone, setHidePhone] = useState(myProfile.hidePhone);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const updateShopsSafely = (
    updater: (prev: CommissionShopItem[]) => CommissionShopItem[]
  ) => {
    setShops((prev) =>
      normalizeAndAutoExpireShops(updater(prev), INITIAL_COMMISSION_SHOPS)
    );
  };

  // Public customer catalog strictly shows approved, active, non-expired shops
  const publicActiveShops = useMemo(() => {
    return shops.filter((shop) => {
      const ev = evaluateShopRental(shop);
      return ev.effectiveStatus === 'active';
    });
  }, [shops]);

  // Dynamic city & district options from active shops + directory
  const availableCities = useMemo(() => {
    const map = new Map<string, { en: string; ur: string }>();
    for (const c of PAKISTANI_CITIES) {
      map.set(c.en.toLowerCase(), { en: c.en, ur: c.ur });
    }
    for (const s of publicActiveShops) {
      if (s.cityEn) {
        map.set(s.cityEn.toLowerCase(), { en: s.cityEn, ur: s.cityUr });
      }
    }
    return Array.from(map.values());
  }, [publicActiveShops]);

  const availableDistricts = useMemo(() => {
    const map = new Map<string, { en: string; ur: string }>();
    for (const s of publicActiveShops) {
      const dEn = s.districtEn || `${s.cityEn} District`;
      const dUr = s.districtUr || `ضلع ${s.cityUr}`;
      map.set(dEn.toLowerCase(), { en: dEn, ur: dUr });
    }
    return Array.from(map.values());
  }, [publicActiveShops]);

  // Shops filtered by Search + City + District + Shop Tab (All / Featured / Latest)
  const filteredPublicShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = publicActiveShops.filter((shop) => {
      const dEn = (shop.districtEn || `${shop.cityEn} District`).toLowerCase();
      const dUr = shop.districtUr || `ضلع ${shop.cityUr}`;
      const matchesCity =
        selectedCity === 'all' ||
        shop.cityEn.toLowerCase() === selectedCity.toLowerCase() ||
        shop.cityUr === selectedCity;
      const matchesDistrict =
        selectedDistrict === 'all' ||
        dEn === selectedDistrict.toLowerCase() ||
        dUr === selectedDistrict;
      const matchesTab = shopTab === 'featured' ? Boolean(shop.featured) : true;
      const matchesQuery =
        !q ||
        shop.shopNameUr.toLowerCase().includes(q) ||
        shop.shopNameEn.toLowerCase().includes(q) ||
        shop.specialtyUr.toLowerCase().includes(q) ||
        shop.specialtyEn.toLowerCase().includes(q) ||
        shop.ownerUr.toLowerCase().includes(q) ||
        shop.ownerEn.toLowerCase().includes(q) ||
        shop.mandiUr.toLowerCase().includes(q) ||
        shop.mandiEn.toLowerCase().includes(q) ||
        shop.products.some(
          (p) =>
            p.nameEn.toLowerCase().includes(q) ||
            p.nameUr.toLowerCase().includes(q) ||
            (p.varietyEn || '').toLowerCase().includes(q) ||
            (p.varietyUr || '').toLowerCase().includes(q)
        );
      return matchesCity && matchesDistrict && matchesTab && matchesQuery;
    });

    if (shopTab === 'latest') {
      return [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    return [...list].sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) {
        return a.featured ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });
  }, [
    publicActiveShops,
    searchQuery,
    selectedCity,
    selectedDistrict,
    shopTab,
  ]);

  // All products across approved & active shops
  const allActiveProducts = useMemo(() => {
    const items: Array<{ shop: CommissionShopItem; product: ShopProduct }> = [];
    for (const shop of publicActiveShops) {
      for (const product of shop.products) {
        items.push({ shop, product });
      }
    }
    return items;
  }, [publicActiveShops]);

  // Live Popular Seed Category counts
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { product } of allActiveProducts) {
      counts[product.category] = (counts[product.category] || 0) + 1;
    }
    return CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({
      ...c,
      count: counts[c.id] || 0,
    }));
  }, [allActiveProducts]);

  // Filtered & sorted products for Search, Filters & Sorting (Section E)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allActiveProducts.filter(({ shop, product }) => {
      const dEn = (shop.districtEn || `${shop.cityEn} District`).toLowerCase();
      const dUr = shop.districtUr || `ضلع ${shop.cityUr}`;
      const price = product.pricePerBagPkr ?? product.pricePkr;

      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      const matchesCity =
        selectedCity === 'all' ||
        shop.cityEn.toLowerCase() === selectedCity.toLowerCase() ||
        shop.cityUr === selectedCity;
      const matchesDistrict =
        selectedDistrict === 'all' ||
        dEn === selectedDistrict.toLowerCase() ||
        dUr === selectedDistrict;
      const matchesStock = !inStockOnly || product.inStock;
      const matchesPrice =
        priceFilter === 'all' ||
        (priceFilter === 'under-2000' && price < 2000) ||
        (priceFilter === '2000-6000' && price >= 2000 && price <= 6000) ||
        (priceFilter === 'above-6000' && price > 6000);
      const matchesQ =
        !q ||
        product.nameEn.toLowerCase().includes(q) ||
        product.nameUr.toLowerCase().includes(q) ||
        (product.varietyEn || '').toLowerCase().includes(q) ||
        (product.varietyUr || '').toLowerCase().includes(q) ||
        shop.shopNameEn.toLowerCase().includes(q) ||
        shop.shopNameUr.toLowerCase().includes(q) ||
        shop.cityEn.toLowerCase().includes(q) ||
        shop.cityUr.toLowerCase().includes(q);

      return (
        matchesCategory &&
        matchesCity &&
        matchesDistrict &&
        matchesStock &&
        matchesPrice &&
        matchesQ
      );
    });

    return [...list].sort((a, b) => {
      const pA = a.product.pricePerBagPkr ?? a.product.pricePkr;
      const pB = b.product.pricePerBagPkr ?? b.product.pricePkr;
      if (sortBy === 'price-asc') return pA - pB;
      if (sortBy === 'price-desc') return pB - pA;
      return b.product.createdAt - a.product.createdAt;
    });
  }, [
    allActiveProducts,
    searchQuery,
    selectedCategory,
    selectedCity,
    selectedDistrict,
    inStockOnly,
    priceFilter,
    sortBy,
  ]);

  const featuredProducts = useMemo(
    () =>
      allActiveProducts
        .filter(({ product }) => product.featured && product.inStock)
        .slice(0, 6),
    [allActiveProducts]
  );

  const latestProducts = useMemo(
    () =>
      [...allActiveProducts]
        .sort((a, b) => b.product.createdAt - a.product.createdAt)
        .slice(0, 6),
    [allActiveProducts]
  );

  const hasActiveProductFilters =
    Boolean(searchQuery.trim()) ||
    selectedCity !== 'all' ||
    selectedDistrict !== 'all' ||
    selectedCategory !== 'all' ||
    priceFilter !== 'all' ||
    inStockOnly ||
    sortBy !== 'latest';

  const selectedShop = useMemo(
    () => publicActiveShops.find((s) => s.id === selectedShopId) ?? null,
    [publicActiveShops, selectedShopId]
  );

  const selectedProductContext = useMemo(() => {
    if (!selectedProductRef) return null;
    const shop = publicActiveShops.find(
      (s) => s.id === selectedProductRef.shopId
    );
    const product = shop?.products.find(
      (p) => p.id === selectedProductRef.productId
    );
    if (!shop || !product) return null;
    return {
      shop,
      product,
      openOrderForm: Boolean(selectedProductRef.openOrderForm),
    };
  }, [publicActiveShops, selectedProductRef]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems]
  );

  // Badges for dashboard tabs
  const adminBadgeCount = useMemo(() => {
    if (!canManageAdminShops(authUser)) return 0;
    let count = 0;
    for (const s of shops) {
      if (s.status === 'pending') count += 1;
      if (s.paymentHistory.some((p) => p.status === 'pending')) count += 1;
    }
    return count;
  }, [shops, authUser]);

  const shopkeeperWarningCount = useMemo(() => {
    if (
      !authUser ||
      (authUser.role !== 'shopkeeper' && authUser.role !== 'admin')
    ) {
      return 0;
    }
    return shops.filter((s) => {
      if (!canManageAssignedShop(authUser, s)) return false;
      const ev = evaluateShopRental(s);
      return ev.isExpired || ev.isExpiringSoon;
    }).length;
  }, [shops, authUser]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCity('all');
    setSelectedDistrict('all');
    setSelectedCategory('all');
    setPriceFilter('all');
    setInStockOnly(false);
    setSortBy('latest');
    setShopTab('all');
  };

  const handleOpenProduct = (
    shopId: string,
    productId: string,
    openOrderForm = false
  ) => {
    setSelectedShopId(shopId);
    setSelectedProductRef({ shopId, productId, openOrderForm });
    setActiveSection('shops');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenShopStorefront = (shopId: string) => {
    setSelectedProductRef(null);
    setSelectedShopId(shopId);
    setHighlightedProductId(null);
    setActiveSection('shops');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart handlers
  const handleAddToCart = (
    shopId: string,
    productId: string,
    unitMode: 'bag' | 'kg',
    quantity: number
  ) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.shopId === shopId &&
          item.productId === productId &&
          item.unitMode === unitMode
      );
      const next =
        existingIdx >= 0
          ? prev.map((item, idx) =>
              idx === existingIdx
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          : [
              ...prev,
              {
                id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                shopId,
                productId,
                unitMode,
                quantity,
              },
            ];
      onSyncCartToCloud?.(next);
      return next;
    });
  };

  const handleUpdateCartQty = (cartItemId: string, nextQty: number) => {
    setCartItems((prev) => {
      const next = prev.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity: Math.max(1, nextQty) }
          : item
      );
      onSyncCartToCloud?.(next);
      return next;
    });
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((item) => item.id !== cartItemId);
      onSyncCartToCloud?.(next);
      return next;
    });
  };

  // Public Rental Shop Application (status = 'pending', awaiting Admin approval & annual rent assignment)
  const handleSubmitApplication = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!shopName.trim() || !ownerName.trim() || !specialty.trim()) {
      setFormError(
        isUrdu
          ? 'براہِ کرم دکان کا نام، دکاندار کا نام اور دستیاب بیج/اجناس کی تفصیل درج کریں۔'
          : 'Please enter shop name, shopkeeper name, and available seeds/grains.'
      );
      return;
    }

    const cityObj =
      PAKISTANI_CITIES.find((c) => c.en === cityEn) || PAKISTANI_CITIES[0];
    const today = getTodayIsoDate();
    const parsedRent = Math.max(1000, Number(proposedRent) || 5000);

    const newApplication: CommissionShopItem = {
      id: `shop-${Date.now()}`,
      shopNameUr: shopName.trim(),
      shopNameEn: shopName.trim(),
      logoEmoji: '🌱',
      coverImageUrl: '/src/assets/images/shop_cover_vegetable_seeds_1795753821325.jpg',
      descriptionUr: specialty.trim(),
      descriptionEn: specialty.trim(),
      ownerUr: ownerName.trim(),
      ownerEn: ownerName.trim(),
      applicantUid: firebaseUser?.uid,
      assignedShopkeeperUid: firebaseUser?.uid,
      assignedShopkeeperId: authUser?.id || myProfile.id,
      assignedShopkeeperContact:
        whatsapp.replace(/\D/g, '') || myProfile.whatsapp,
      cityUr: cityObj.ur,
      cityEn: cityObj.en,
      districtUr: `ضلع ${cityObj.ur}`,
      districtEn: `${cityObj.en} District`,
      mandiUr: mandiAddress.trim() || `غلہ منڈی، ${cityObj.ur}`,
      mandiEn: mandiAddress.trim() || `Ghalla Mandi, ${cityObj.en}`,
      specialtyUr: specialty.trim(),
      specialtyEn: specialty.trim(),
      rateNoteUr: 'تازہ منڈی ریٹ رابطے پر دستیاب ہیں',
      rateNoteEn: 'Current mandi rates available on inquiry',
      commissionPercent: '1.5%',
      whatsapp: whatsapp.replace(/\D/g, '') || myProfile.whatsapp,
      hidePhone,
      verified: false,
      featured: false,
      annualRentPkr: parsedRent,
      startDate: today,
      expiryDate: addOneYearIsoDate(today),
      status: 'pending',
      renewalRequested: false,
      products: [],
      orders: [],
      paymentHistory: [],
      createdAt: Date.now(),
    };

    updateShopsSafely((prev) => [newApplication, ...prev]);
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        createCommissionShopInFirestore(newApplication, firebaseUser.uid)
      );
    }
    setShopName('');
    setMandiAddress('');
    setSpecialty('');
    setShowApplyForm(false);
    setFormSuccess(
      isUrdu
        ? 'آپ کی سالانہ رینٹل شاپ کی درخواست جمع ہو گئی ہے! ایڈمن کی منظوری اور سالانہ کرایہ مقرر ہونے کے بعد دکان فعال ہو جائے گی۔'
        : 'Your annual rental shop application has been submitted for Admin review, rent configuration, and activation.'
    );
  };

  // Direct customer order handler (active shops only, updates order + deducts product stock)
  const handlePlaceOrder = (shopId: string, order: ShopOrder) => {
    const targetShop = shops.find((s) => s.id === shopId);
    updateShopsSafely((prev) =>
      prev.map((s) => {
        if (s.id !== shopId) return s;
        if (evaluateShopRental(s).effectiveStatus !== 'active') return s;
        return {
          ...s,
          orders: [order, ...s.orders],
          products: s.products.map((p) =>
            p.id === order.productId
              ? deductProductStock(p, order.quantity)
              : p
          ),
        };
      })
    );
    if (
      targetShop &&
      evaluateShopRental(targetShop).effectiveStatus === 'active' &&
      firebaseUser?.emailVerified
    ) {
      runFirestoreOp(
        placeShopOrderAtomicInFirestore(targetShop, order, firebaseUser.uid)
      );
    }
  };

  // Cart checkout handler (multi-shop sequential atomic order insertion & stock deduction)
  const handleConfirmCartCheckout = (
    createdOrders: Array<{ shopId: string; order: ShopOrder }>
  ) => {
    const activeEligibleOrders = createdOrders.filter((item) => {
      const targetShop = shops.find((s) => s.id === item.shopId);
      return (
        Boolean(targetShop) &&
        evaluateShopRental(targetShop!).effectiveStatus === 'active'
      );
    });

    updateShopsSafely((prev) =>
      prev.map((s) => {
        const shopOrders = activeEligibleOrders.filter((c) => c.shopId === s.id);
        if (shopOrders.length === 0) return s;

        const updatedProducts = s.products.map((p) => {
          const orderedForProd = shopOrders
            .filter((so) => so.order.productId === p.id)
            .reduce((sum, so) => sum + so.order.quantity, 0);
          return orderedForProd > 0
            ? deductProductStock(p, orderedForProd)
            : p;
        });

        return {
          ...s,
          orders: [...shopOrders.map((so) => so.order), ...s.orders],
          products: updatedProducts,
        };
      })
    );
    if (firebaseUser?.emailVerified && activeEligibleOrders.length > 0) {
      runFirestoreOp(
        placeMultipleShopOrdersSequentialInFirestore(
          shops,
          activeEligibleOrders,
          firebaseUser.uid
        )
      );
    }
    setCartItems([]);
    onSyncCartToCloud?.([]);
  };

  // Shopkeeper-scoped handlers
  const handleRequestShopRenewal = (
    shopId: string,
    payment: ShopRentPayment
  ) => {
    const target = shops.find((s) => s.id === shopId);
    if (!target || !canManageAssignedShop(authUser, target)) return;

    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              renewalRequested: true,
              paymentHistory: [payment, ...s.paymentHistory],
            }
          : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        createRentPaymentInFirestore(target, payment, firebaseUser.uid)
      );
    }
  };

  const handleAddProduct = (shopId: string, product: ShopProduct) => {
    const target = shops.find((s) => s.id === shopId);
    if (!target || !canManageAssignedShop(authUser, target)) return;

    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId ? { ...s, products: [product, ...s.products] } : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        createShopProductInFirestore(
          shopId,
          product,
          target.assignedShopkeeperUid || target.applicantUid || firebaseUser.uid,
          evaluateShopRental(target).effectiveStatus === 'active'
        )
      );
    }
  };

  const handleToggleProductStock = (shopId: string, productId: string) => {
    const target = shops.find((s) => s.id === shopId);
    if (!target || !canManageAssignedShop(authUser, target)) return;
    const prod = target.products.find((p) => p.id === productId);
    if (!prod) return;
    const nextInStock = !prod.inStock;

    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              products: s.products.map((p) =>
                p.id === productId ? { ...p, inStock: nextInStock } : p
              ),
            }
          : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        updateShopProductInFirestore(shopId, productId, {
          inStock: nextInStock,
        })
      );
    }
  };

  const handleDeleteProduct = (shopId: string, productId: string) => {
    const target = shops.find((s) => s.id === shopId);
    if (!target || !canManageAssignedShop(authUser, target)) return;

    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              products: s.products.filter((p) => p.id !== productId),
            }
          : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(deleteShopProductInFirestore(shopId, productId));
    }
  };

  const handleUpdateOrderStatus = (
    shopId: string,
    orderId: string,
    status: ShopOrderStatus
  ) => {
    const target = shops.find((s) => s.id === shopId);
    if (!target || !canManageAssignedShop(authUser, target)) return;

    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              orders: s.orders.map((o) =>
                o.id === orderId ? { ...o, status } : o
              ),
            }
          : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(updateShopOrderStatusInFirestore(shopId, orderId, status));
    }
  };

  // Admin-only Shop Management handlers
  const handleCreateShop = (newShop: CommissionShopItem) => {
    if (!canManageAdminShops(authUser)) return;
    updateShopsSafely((prev) => [newShop, ...prev]);
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        createCommissionShopInFirestore(newShop, firebaseUser.uid)
      );
    }
  };

  const handleApproveApplication = (
    shopId: string,
    annualRentPkr: number,
    startDate: string,
    expiryDate: string,
    assignedShopkeeperId: string
  ) => {
    if (!canManageAdminShops(authUser)) return;
    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'active',
              verified: true,
              annualRentPkr,
              startDate,
              expiryDate,
              assignedShopkeeperId,
              rejectionReason: undefined,
            }
          : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        Promise.all([
          updateCommissionShopInFirestore(shopId, {
            status: 'active',
            verified: true,
            annualRentPkr,
            startDate,
            expiryDate,
            assignedShopkeeperId,
          }),
          syncShopProductsVisibilityInFirestore(shopId, true),
        ])
      );
    }
  };

  const handleRejectApplication = (shopId: string, reason: string) => {
    if (!canManageAdminShops(authUser)) return;
    updateShopsSafely((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? { ...s, status: 'rejected', rejectionReason: reason }
          : s
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        Promise.all([
          updateCommissionShopInFirestore(shopId, {
            status: 'rejected',
            rejectionReason: reason,
          }),
          syncShopProductsVisibilityInFirestore(shopId, false),
        ])
      );
    }
  };

  const handleUpdateShopAdmin = (
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
  ) => {
    if (!canManageAdminShops(authUser)) return;
    updateShopsSafely((prev) =>
      prev.map((s) => (s.id === shopId ? { ...s, ...updates } : s))
    );
    if (firebaseUser?.emailVerified) {
      const tasks: Array<Promise<unknown>> = [
        updateCommissionShopInFirestore(shopId, {
          ...(updates.annualRentPkr !== undefined
            ? { annualRentPkr: updates.annualRentPkr }
            : {}),
          ...(updates.startDate !== undefined
            ? { startDate: updates.startDate }
            : {}),
          ...(updates.expiryDate !== undefined
            ? { expiryDate: updates.expiryDate }
            : {}),
          ...(updates.assignedShopkeeperId !== undefined
            ? { assignedShopkeeperId: updates.assignedShopkeeperId }
            : {}),
          ...(updates.ownerEn !== undefined ? { ownerEn: updates.ownerEn } : {}),
          ...(updates.ownerUr !== undefined ? { ownerUr: updates.ownerUr } : {}),
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          ...(updates.verified !== undefined
            ? { verified: updates.verified }
            : {}),
        }),
      ];
      if (updates.status !== undefined) {
        tasks.push(
          syncShopProductsVisibilityInFirestore(
            shopId,
            updates.status === 'active'
          )
        );
      }
      runFirestoreOp(Promise.all(tasks));
    }
  };

  const getRenewedDates = (shop: CommissionShopItem) => {
    const today = getTodayIsoDate();
    const remaining = getRemainingDays(shop.expiryDate, today);
    if (remaining >= 0) {
      return {
        startDate: shop.startDate,
        expiryDate: addOneYearIsoDate(shop.expiryDate),
      };
    }
    return {
      startDate: today,
      expiryDate: addOneYearIsoDate(today),
    };
  };

  const handleRecordRentPayment = (
    shopId: string,
    payment: ShopRentPayment,
    alsoRenewAndActivate: boolean
  ) => {
    if (!canManageAdminShops(authUser)) return;
    const target = shops.find((s) => s.id === shopId);
    const dates = target
      ? alsoRenewAndActivate
        ? getRenewedDates(target)
        : { startDate: target.startDate, expiryDate: target.expiryDate }
      : null;

    updateShopsSafely((prev) =>
      prev.map((s) => {
        if (s.id !== shopId) return s;
        const d = alsoRenewAndActivate
          ? getRenewedDates(s)
          : { startDate: s.startDate, expiryDate: s.expiryDate };
        return {
          ...s,
          ...d,
          status: alsoRenewAndActivate ? 'active' : s.status,
          renewalRequested: alsoRenewAndActivate ? false : s.renewalRequested,
          paymentHistory: [payment, ...s.paymentHistory],
        };
      })
    );
    if (target && dates && firebaseUser?.emailVerified) {
      const tasks: Array<Promise<unknown>> = [
        createRentPaymentInFirestore(
          target,
          payment,
          firebaseUser.uid,
          alsoRenewAndActivate
            ? {
                ...dates,
                status: 'active',
                renewalRequested: false,
              }
            : undefined
        ),
      ];
      if (alsoRenewAndActivate) {
        tasks.push(syncShopProductsVisibilityInFirestore(shopId, true));
      }
      runFirestoreOp(Promise.all(tasks));
    }
  };

  const handleVerifyPendingPayment = (
    shopId: string,
    paymentId: string,
    approve: boolean
  ) => {
    if (!canManageAdminShops(authUser)) return;
    const target = shops.find((s) => s.id === shopId);
    const dates = target
      ? approve
        ? getRenewedDates(target)
        : { startDate: target.startDate, expiryDate: target.expiryDate }
      : null;

    updateShopsSafely((prev) =>
      prev.map((s) => {
        if (s.id !== shopId) return s;
        const d = approve
          ? getRenewedDates(s)
          : { startDate: s.startDate, expiryDate: s.expiryDate };
        return {
          ...s,
          ...d,
          status: approve ? 'active' : s.status,
          renewalRequested: false,
          paymentHistory: s.paymentHistory.map((p) =>
            p.id === paymentId
              ? {
                  ...p,
                  status: approve ? 'confirmed' : 'rejected',
                  recordedBy: authUser?.name || p.recordedBy,
                }
              : p
          ),
        };
      })
    );
    if (target && dates && firebaseUser?.emailVerified) {
      const tasks: Array<Promise<unknown>> = [
        verifyPendingRentPaymentInFirestore(
          shopId,
          paymentId,
          approve,
          authUser?.name || 'Platform Admin',
          {
            ...dates,
            status: approve ? 'active' : target.status,
          }
        ),
      ];
      if (approve) {
        tasks.push(syncShopProductsVisibilityInFirestore(shopId, true));
      }
      runFirestoreOp(Promise.all(tasks));
    }
  };

  const handleRenewShop = (shopId: string) => {
    if (!canManageAdminShops(authUser)) return;
    const target = shops.find((s) => s.id === shopId);
    const dates = target ? getRenewedDates(target) : null;
    updateShopsSafely((prev) =>
      prev.map((s) => {
        if (s.id !== shopId) return s;
        const d = getRenewedDates(s);
        return {
          ...s,
          ...d,
          status: 'active',
          renewalRequested: false,
        };
      })
    );
    if (dates && firebaseUser?.emailVerified) {
      runFirestoreOp(
        Promise.all([
          updateCommissionShopInFirestore(shopId, {
            ...dates,
            status: 'active',
            renewalRequested: false,
          }),
          syncShopProductsVisibilityInFirestore(shopId, true),
        ])
      );
    }
  };

  const handleDeleteShop = (shopId: string) => {
    if (!canManageAdminShops(authUser)) return;
    updateShopsSafely((prev) => prev.filter((s) => s.id !== shopId));
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(deleteCommissionShopInFirestore(shopId));
    }
    if (selectedShopId === shopId) {
      setSelectedShopId(null);
      setSelectedProductRef(null);
      setHighlightedProductId(null);
    }
  };

  // Admin-only Mandi Rate handlers
  const handleAddRate = (rate: MandiRateItem) => {
    if (!canManageAdminShops(authUser)) return;
    setRates((prev) => [rate, ...prev]);
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(upsertMandiRateInFirestore(rate, true));
    }
  };

  const handleUpdateRate = (updated: MandiRateItem) => {
    if (!canManageAdminShops(authUser)) return;
    setRates((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(upsertMandiRateInFirestore(updated, false));
    }
  };

  const handleDeleteRate = (rateId: string) => {
    if (!canManageAdminShops(authUser)) return;
    setRates((prev) => prev.filter((r) => r.id !== rateId));
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(deleteMandiRateInFirestore(rateId));
    }
  };

  const handleOpenLinkedShopProduct = (shopId: string, productId?: string) => {
    setActiveSection('shops');
    setSelectedShopId(shopId);
    setHighlightedProductId(productId || null);
    if (productId) {
      setSelectedProductRef({ shopId, productId, openOrderForm: false });
    } else {
      setSelectedProductRef(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderShopCard = (shop: CommissionShopItem) => {
    const coords = getCityCoords(shop.cityEn || shop.cityUr);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    const cleanPhone = shop.whatsapp.replace(/\D/g, '');
    const whatsappHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      isUrdu
        ? `السلام علیکم، میں دیسی بیج ایکسچینج کے ذریعے "${shop.shopNameUr}" سے دیسی بیج و منڈی ریٹ کے بارے میں رابطہ کر رہا ہوں۔`
        : `Hello, I am reaching out to "${shop.shopNameEn}" via Desi Beej Exchange regarding bulk desi seeds and mandi rates.`
    )}`;
    const coverSrc =
      shop.coverImageUrl ||
      '/src/assets/images/hero_desi_seeds_harvest_1795580774790.jpg';
    const cityLabel = isUrdu ? shop.cityUr : shop.cityEn;
    const districtLabel = isUrdu
      ? shop.districtUr || `ضلع ${shop.cityUr}`
      : shop.districtEn || `${shop.cityEn} District`;

    return (
      <article
        key={shop.id}
        className="agri-glass rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#E5C65A]/55 transition-colors"
      >
        <div>
          {/* Storefront Cover Preview */}
          <button
            type="button"
            onClick={() => handleOpenShopStorefront(shop.id)}
            className="relative block w-full h-36 bg-[#0D2314] overflow-hidden group cursor-pointer text-start"
            aria-label={isUrdu ? shop.shopNameUr : shop.shopNameEn}
          >
            {!failedCoverMap[shop.id] ? (
              <img
                src={coverSrc}
                alt={isUrdu ? shop.shopNameUr : shop.shopNameEn}
                referrerPolicy="no-referrer"
                onError={() =>
                  setFailedCoverMap((prev) => ({ ...prev, [shop.id]: true }))
                }
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#263B20] to-[#0D2314] flex items-center justify-center">
                <Store className="w-10 h-10 text-[#E5C65A]/55" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#102B19] via-[#102B19]/35 to-transparent" />
            {shop.featured && (
              <span className="absolute top-3 start-3 px-2.5 py-1 rounded-lg bg-[#102B19]/90 border border-[#E5C65A]/55 text-[11px] font-bold text-[#FFF0A3]">
                {isUrdu ? 'نمایاں دکان' : 'Featured Shop'}
              </span>
            )}
          </button>

          <div className="p-5 -mt-6 relative z-10 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pt-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#C7D3BD] mb-1">
                  <span>
                    {cityLabel}, {districtLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[#E5C65A] font-semibold tabular-nums">
                    <Package className="w-3.5 h-3.5" />
                    {shop.products.length} {isUrdu ? 'مصنوعات' : 'Products'}
                  </span>
                  {shop.verified && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#FFF0A3] font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#E5C65A]" />
                        {isUrdu ? 'تصدیق شدہ' : 'Verified'}
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-lg font-bold text-[#F8F7EA] leading-snug">
                  <button
                    type="button"
                    onClick={() => handleOpenShopStorefront(shop.id)}
                    className="text-start hover:text-[#FFF0A3] transition-colors cursor-pointer"
                  >
                    {isUrdu ? shop.shopNameUr : shop.shopNameEn}
                  </button>
                </h3>
                <p className="text-xs sm:text-sm text-[#C7D3BD] mt-0.5">
                  {isUrdu ? 'دکاندار: ' : 'Shopkeeper: '}
                  {isUrdu ? shop.ownerUr : shop.ownerEn}
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 text-2xl flex items-center justify-center shrink-0 shadow-md">
                <span aria-hidden="true">{shop.logoEmoji || '🌾'}</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-[#D7E2CE] flex items-start gap-2">
              <MapPin
                className="w-4 h-4 text-[#E5C65A] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{isUrdu ? shop.mandiUr : shop.mandiEn}</span>
            </div>

            <p className="text-xs sm:text-sm text-[#D7E2CE] line-clamp-2">
              {isUrdu ? shop.specialtyUr : shop.specialtyEn}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[#44633B]/50 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenShopStorefront(shop.id)}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold transition-colors cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>
              {isUrdu ? 'دکان اور مصنوعات دیکھیں' : 'Visit Shop Storefront'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs font-semibold text-[#F8F7EA] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#E5C65A]" />
              <span>{t.viewOnMapBtn}</span>
            </a>

            {shop.hidePhone ? (
              <button
                type="button"
                onClick={onOpenChatHub}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/45 text-[#FFF0A3] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#E5C65A]" />
                <MessageSquareText className="w-3.5 h-3.5 text-[#E5C65A]" />
                <span>{t.openAppChatBtn}</span>
              </button>
            ) : (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5C65A]/45 bg-[#263B20] hover:bg-[#314B29] text-[#FFF0A3] text-xs font-bold transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#E5C65A]" />
                <span>{t.whatsappBtn}</span>
              </a>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {firestoreNotice && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/45 bg-amber-950/60 px-4 py-3 text-xs sm:text-sm text-amber-100 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E5C65A] shrink-0" />
              <span>{firestoreNotice.message}</span>
              {firestoreNotice.isQuota && (
                <a
                  href={getFirebaseUpgradeConsoleUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold text-[#FFF0A3]"
                >
                  {isUrdu ? 'تفصیل دیکھیں' : 'Firestore Console'}
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFirestoreNotice(null)}
              aria-label={isUrdu ? 'بند کریں' : 'Dismiss'}
              className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Breadcrumb, Cart Button & Back Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={isUrdu ? 'بریڈ کرمب' : 'Breadcrumb'}>
            <ol className="inline-flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
              <li>
                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center gap-1.5 text-[#E5C65A] hover:text-[#FFF0A3] hover:underline font-semibold cursor-pointer"
                >
                  <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.breadcrumbHome}</span>
                </button>
              </li>
              <li aria-hidden="true" className="text-[#8DA182]">
                &gt;
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('shops');
                    setSelectedShopId(null);
                    setSelectedProductRef(null);
                    setHighlightedProductId(null);
                  }}
                  className={`font-semibold cursor-pointer ${
                    !selectedShop && !selectedProductContext
                      ? 'text-[#FFF0A3]'
                      : 'text-[#E5C65A] hover:underline'
                  }`}
                >
                  {activeSection === 'mandi-rates'
                    ? isUrdu
                      ? 'منڈی ریٹس'
                      : 'Mandi Rates'
                    : activeSection === 'shopkeeper-dashboard'
                      ? isUrdu
                        ? 'دکاندار کرایہ ڈیش بورڈ'
                        : 'Shopkeeper Rent Dashboard'
                      : activeSection === 'admin-shops'
                        ? isUrdu
                          ? 'ایڈمن شاپ مینجمنٹ'
                          : 'Admin Shop Management'
                        : t.navCommissionShop}
                </button>
              </li>
              {activeSection === 'shops' && selectedShop && (
                <>
                  <li aria-hidden="true" className="text-[#8DA182]">
                    &gt;
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setSelectedProductRef(null)}
                      className={`font-semibold cursor-pointer ${
                        selectedProductContext
                          ? 'text-[#E5C65A] hover:underline'
                          : 'text-[#FFF0A3]'
                      }`}
                    >
                      {isUrdu ? selectedShop.shopNameUr : selectedShop.shopNameEn}
                    </button>
                  </li>
                </>
              )}
              {activeSection === 'shops' && selectedProductContext && (
                <>
                  <li aria-hidden="true" className="text-[#8DA182]">
                    &gt;
                  </li>
                  <li className="text-[#FFF0A3] font-semibold truncate max-w-[200px] sm:max-w-xs">
                    {isUrdu
                      ? selectedProductContext.product.nameUr
                      : selectedProductContext.product.nameEn}
                  </li>
                </>
              )}
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="min-h-[38px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#E5C65A]/55 bg-[#263B20] hover:bg-[#314B29] text-xs sm:text-sm font-bold text-[#FFF0A3] transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-[#E5C65A]" />
              <span>{isUrdu ? 'کارٹ' : 'Cart'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#E5C65A] text-[#102B19] text-[11px] font-extrabold tabular-nums">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
            >
              {t.backToHome}
            </button>
          </div>
        </div>

        {/* Integrated Navigation Tabs inside Commission Shop & Mandi Rates */}
        <div
          role="tablist"
          aria-label={
            isUrdu
              ? 'کمیشن شاپ اور منڈی ریٹس سیکشنز'
              : 'Commission Shop and Mandi Rates Sections'
          }
          className="agri-glass rounded-2xl p-2 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'shops'}
            onClick={() => {
              setActiveSection('shops');
              setSelectedShopId(null);
              setSelectedProductRef(null);
              setHighlightedProductId(null);
            }}
            className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeSection === 'shops'
                ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                : 'text-[#D7E2CE] hover:bg-[#263B20] hover:text-[#FFF0A3]'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>
              {isUrdu
                ? `کمیشن شاپس (${publicActiveShops.length})`
                : `Commission Shops (${publicActiveShops.length})`}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'mandi-rates'}
            onClick={() => {
              setActiveSection('mandi-rates');
              setSelectedShopId(null);
              setSelectedProductRef(null);
            }}
            className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeSection === 'mandi-rates'
                ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                : 'text-[#D7E2CE] hover:bg-[#263B20] hover:text-[#FFF0A3]'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>
              {isUrdu
                ? `منڈی ریٹس (${rates.length})`
                : `Mandi Rates (${rates.length})`}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'shopkeeper-dashboard'}
            onClick={() => {
              setActiveSection('shopkeeper-dashboard');
              setSelectedShopId(null);
              setSelectedProductRef(null);
            }}
            className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeSection === 'shopkeeper-dashboard'
                ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                : 'text-[#D7E2CE] hover:bg-[#263B20] hover:text-[#FFF0A3]'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>
              {isUrdu ? 'دکاندار کرایہ ڈیش بورڈ' : 'Shopkeeper Dashboard'}
            </span>
            {shopkeeperWarningCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold tabular-nums">
                <AlertTriangle className="w-3 h-3" />
                {shopkeeperWarningCount}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'admin-shops'}
            onClick={() => {
              setActiveSection('admin-shops');
              setSelectedShopId(null);
              setSelectedProductRef(null);
            }}
            className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeSection === 'admin-shops'
                ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                : 'text-[#D7E2CE] hover:bg-[#263B20] hover:text-[#FFF0A3]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{isUrdu ? 'ایڈمن شاپ پینل' : 'Admin Shop Panel'}</span>
            {adminBadgeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold tabular-nums">
                {adminBadgeCount}
              </span>
            )}
          </button>
        </div>

        {/* SECTION 1: PUBLIC AGRICULTURAL COMMISSION SHOP ECOMMERCE */}
        {activeSection === 'shops' && (
          <>
            {selectedProductContext ? (
              <ProductDetailPanel
                lang={lang}
                shop={selectedProductContext.shop}
                product={selectedProductContext.product}
                allActiveShops={publicActiveShops}
                initialShowOrderForm={selectedProductContext.openOrderForm}
                onBackToMarketplace={() => {
                  setSelectedProductRef(null);
                  setSelectedShopId(null);
                }}
                onOpenShop={handleOpenShopStorefront}
                onOpenProduct={handleOpenProduct}
                onAddToCart={handleAddToCart}
                onPlaceOrder={handlePlaceOrder}
                onOpenChatHub={onOpenChatHub}
              />
            ) : selectedShop ? (
              <ShopDetailPanel
                lang={lang}
                shop={selectedShop}
                highlightedProductId={highlightedProductId}
                onBackToShops={() => {
                  setSelectedShopId(null);
                  setHighlightedProductId(null);
                }}
                onOpenChatHub={onOpenChatHub}
                onOpenProduct={handleOpenProduct}
              />
            ) : (
              <div className="space-y-8">
                {/* SECTION A: Premium Agricultural Hero Banner */}
                <section className="relative rounded-3xl overflow-hidden border border-[#E5C65A]/30 shadow-2xl">
                  <div className="absolute inset-0">
                    <img
                      src={WHEAT_HERO_IMAGE_URL}
                      alt={
                        isUrdu
                          ? 'سنہری گندم کا کھیت'
                          : 'Golden agricultural wheat harvest field'
                      }
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#102B19]/92 via-[#102B19]/80 to-[#263B20]/90" />
                  </div>

                  <div className="relative z-10 p-6 sm:p-10 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                      <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#E5C65A]">
                          <Store className="w-4 h-4 shrink-0" />
                          <span>
                            {isUrdu
                              ? 'دیسی بیج ایکسچینج زرعی مارکیٹ پلیس'
                              : 'Desi Beej Exchange Certified Agricultural Marketplace'}
                          </span>
                        </div>

                        <h1
                          className={`font-bold text-[#FFF0A3] ${
                            isUrdu
                              ? 'font-urdu-display text-3xl sm:text-4xl leading-[1.85]'
                              : 'font-display-heading text-3xl sm:text-5xl tracking-tight leading-tight'
                          }`}
                        >
                          {isUrdu
                            ? 'معیاری زرعی دکانیں دریافت کریں'
                            : 'Discover Quality Agricultural Shops'}
                        </h1>

                        <p className="text-sm sm:text-base text-[#F8F7EA]/90 leading-relaxed">
                          {isUrdu
                            ? 'پاکستان کی منظور شدہ منڈی کمیشن شاپس سے خالص دیسی بیج، اناج اور سبزیوں کے بیج تلاش کریں، قیمتوں کا موازنہ کریں اور براہِ راست آرڈر کریں۔'
                            : 'Browse approved regional seed shops across Pakistan’s grain mandis. Compare per-kg and per-bag seed rates, check live stock, and order directly from shopkeepers.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowApplyForm((prev) => !prev);
                            setFormError('');
                            setFormSuccess('');
                          }}
                          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
                        >
                          {showApplyForm ? (
                            <X className="w-4 h-4 shrink-0" />
                          ) : (
                            <Plus className="w-4 h-4 shrink-0" />
                          )}
                          <span>
                            {showApplyForm
                              ? isUrdu
                                ? 'فارم بند کریں'
                                : 'Close Form'
                              : isUrdu
                                ? '+ رینٹل شاپ کی درخواست دیں'
                                : '+ Apply for Rental Shop'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={onOpenAddSeed}
                          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5C65A]/45 bg-[#13311D]/90 hover:bg-[#263B20] text-[#FFF0A3] text-sm font-semibold transition-colors cursor-pointer"
                        >
                          <Sprout className="w-4 h-4 shrink-0 text-[#E5C65A]" />
                          <span>{t.addSeedBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* Hero Unified Search Bar for Shops & Products */}
                    <div className="agri-glass rounded-2xl p-3 flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={
                            isUrdu
                              ? 'دکان، بیج کا نام، قسم یا شہر تلاش کریں...'
                              : 'Search shops, seed products, varieties, or mandi cities...'
                          }
                          className="w-full min-h-[44px] ps-10 pe-4 py-2 rounded-xl border border-[#44633B] bg-[#0D2314]/90 text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>

                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        aria-label={isUrdu ? 'شہر منتخب کریں' : 'Filter by City'}
                        className="sm:w-48 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314]/90 text-sm font-medium text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                      >
                        <option value="all">
                          {isUrdu ? 'تمام شہر' : 'All Cities'}
                        </option>
                        {availableCities.map((city) => (
                          <option key={city.en} value={city.en}>
                            {isUrdu ? city.ur : city.en}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        aria-label={
                          isUrdu ? 'ضلع منتخب کریں' : 'Filter by District'
                        }
                        className="sm:w-52 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314]/90 text-sm font-medium text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                      >
                        <option value="all">
                          {isUrdu ? 'تمام اضلاع' : 'All Districts'}
                        </option>
                        {availableDistricts.map((dist) => (
                          <option key={dist.en} value={dist.en}>
                            {isUrdu ? dist.ur : dist.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {formSuccess && (
                  <div
                    role="status"
                    className="rounded-xl border border-[#E5C65A]/45 bg-[#263B20]/90 px-4 py-3 text-sm font-semibold text-[#FFF0A3]"
                  >
                    {formSuccess}
                  </div>
                )}

                {/* Apply for Platform Annual Rental Shop Form */}
                {showApplyForm && (
                  <form
                    onSubmit={handleSubmitApplication}
                    className="agri-glass rounded-2xl p-5 sm:p-6 space-y-4 border border-[#E5C65A]/45"
                  >
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-[#FFF0A3]">
                        {isUrdu
                          ? 'سالانہ رینٹل کمیشن شاپ کے لیے درخواست'
                          : 'Apply for an Annual Rental Commission Shop'}
                      </h2>
                      <p className="text-xs text-[#C7D3BD]">
                        {isUrdu
                          ? 'تمام دکانیں دیسی بیج ایکسچینج کی ملکیت ہیں۔ ایڈمن آپ کی درخواست منظور کر کے دکان کا سالانہ کرایہ مقرر کریں گے۔'
                          : 'Shops are owned by Desi Beej Exchange. Admin reviews your application, sets the individual annual rent, and activates your storefront.'}
                      </p>
                    </div>

                    {formError && (
                      <div className="rounded-xl bg-red-950/60 border border-red-400/40 px-4 py-2.5 text-sm text-red-200">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu
                            ? 'مجوزہ دکان کا نام *'
                            : 'Proposed Shop Name *'}
                        </label>
                        <input
                          type="text"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder={
                            isUrdu
                              ? 'مثلاً: مدینہ غلہ و بیج آڑھت'
                              : 'e.g., Madina Seed Commission Shop'
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu ? 'دکاندار کا نام *' : 'Shopkeeper Name *'}
                        </label>
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu ? 'شہر / منڈی *' : 'City / Mandi *'}
                        </label>
                        <select
                          value={cityEn}
                          onChange={(e) => setCityEn(e.target.value)}
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                        >
                          {PAKISTANI_CITIES.map((city) => (
                            <option key={city.en} value={city.en}>
                              {isUrdu ? city.ur : city.en}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu ? 'منڈی کا پتہ' : 'Mandi Address'}
                        </label>
                        <input
                          type="text"
                          value={mandiAddress}
                          onChange={(e) => setMandiAddress(e.target.value)}
                          placeholder={
                            isUrdu
                              ? 'مثلاً: غلہ منڈی، شاپ نمبر 12'
                              : 'e.g., Ghalla Mandi, Shop #12'
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu
                            ? 'دستیاب بیج و اجناس *'
                            : 'Seeds & Grains Specialty *'}
                        </label>
                        <input
                          type="text"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          placeholder={
                            isUrdu
                              ? 'مثلاً: دیسی گندم، سرسوں، کالا چنا'
                              : 'e.g., Desi Wheat, Mustard, Chickpea'
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu
                            ? 'تجویز کردہ سالانہ بجٹ (PKR)'
                            : 'Preferred Annual Budget (PKR)'}
                        </label>
                        <input
                          type="number"
                          min={1000}
                          value={proposedRent}
                          onChange={(e) => setProposedRent(e.target.value)}
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-bold text-[#FFF0A3]">
                          {isUrdu ? 'واٹس ایپ نمبر' : 'WhatsApp Number'}
                        </label>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          dir="ltr"
                          className="w-full sm:max-w-xs min-h-[42px] px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#D7E2CE] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hidePhone}
                          onChange={(e) => setHidePhone(e.target.checked)}
                          className="w-4 h-4 accent-[#E5C65A]"
                        />
                        <span>{t.hidePhoneLabel}</span>
                      </label>

                      <button
                        type="submit"
                        className="min-h-[42px] px-6 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer transition-colors"
                      >
                        {isUrdu ? 'درخواست جمع کروائیں' : 'Submit Shop Application'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Popular Seed Categories */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
                      {isUrdu
                        ? 'مقبول دیسی بیج کی اقسام'
                        : 'Popular Seed Categories'}
                    </h2>
                    {selectedCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="text-xs font-semibold text-[#E5C65A] hover:underline cursor-pointer"
                      >
                        {isUrdu ? 'تمام اقسام دکھائیں' : 'Show All Categories'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {categoryStats.map((cat) => {
                      const active = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(
                              active ? 'all' : (cat.id as CategoryId)
                            );
                            productsSectionRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }}
                          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
                            active
                              ? 'bg-[#263B20] border-[#E5C65A] ring-1 ring-[#E5C65A]/45'
                              : 'agri-glass hover:border-[#E5C65A]/55'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Sprout className="w-5 h-5 text-[#E5C65A]" />
                            <span className="text-xs font-bold text-[#E5C65A] tabular-nums">
                              {cat.count}
                            </span>
                          </div>
                          <div className="text-sm sm:text-base font-bold text-[#FFF0A3] mt-2">
                            {isUrdu ? cat.ur : cat.en}
                          </div>
                          <div className="text-[11px] text-[#C7D3BD]">
                            {isUrdu
                              ? `${cat.count} دستیاب مصنوعات`
                              : `${cat.count} listed items`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Shops Directory: Featured Shops, All Shops, Latest Shops */}
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
                        {shopTab === 'featured'
                          ? isUrdu
                            ? 'نمایاں کمیشن شاپس'
                            : 'Featured Shops'
                          : shopTab === 'latest'
                            ? isUrdu
                              ? 'تازہ ترین کمیشن شاپس'
                              : 'Latest Shops'
                            : isUrdu
                              ? 'منظور شدہ کمیشن شاپس'
                              : 'All Approved Shops'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#C7D3BD]">
                        {isUrdu
                          ? 'کسی بھی دکان پر کلک کر کے اس کا مکمل اسٹور فرنٹ دیکھیں۔'
                          : 'Only approved and active rental shops appear publicly.'}
                      </p>
                    </div>

                    <div className="agri-glass rounded-xl p-1 inline-flex items-center gap-1">
                      {(
                        [
                          {
                            id: 'all',
                            en: `All Shops (${publicActiveShops.length})`,
                            ur: `تمام (${publicActiveShops.length})`,
                          },
                          {
                            id: 'featured',
                            en: 'Featured Shops',
                            ur: 'نمایاں دکانیں',
                          },
                          {
                            id: 'latest',
                            en: 'Latest Shops',
                            ur: 'نئی دکانیں',
                          },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setShopTab(tab.id)}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            shopTab === tab.id
                              ? 'bg-[#E5C65A] text-[#102B19]'
                              : 'text-[#D7E2CE] hover:text-[#FFF0A3]'
                          }`}
                        >
                          {isUrdu ? tab.ur : tab.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredPublicShops.length === 0 ? (
                    <div className="agri-glass rounded-2xl p-8 text-center space-y-3">
                      <Store className="w-10 h-10 text-[#E5C65A] mx-auto" />
                      <p className="text-base font-bold text-[#FFF0A3]">
                        {isUrdu
                          ? 'اس تلاش یا علاقے میں کوئی فعال کمیشن شاپ نہیں ملی'
                          : 'No active commission shops match your search'}
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer transition-colors"
                      >
                        {t.clearFilters}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {filteredPublicShops.map(renderShopCard)}
                    </div>
                  )}
                </section>

                {/* SECTION E + A: Seed Products Catalog with Full Filters & Sorting */}
                <section ref={productsSectionRef} className="space-y-5 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3] flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-[#E5C65A]" />
                        <span>
                          {hasActiveProductFilters
                            ? isUrdu
                              ? `تلاش و فلٹر شدہ بیج (${filteredProducts.length})`
                              : `Filtered Seed Products (${filteredProducts.length})`
                            : isUrdu
                              ? 'نمایاں اور تازہ ترین بیج مصنوعات'
                              : 'Featured & Latest Seed Products'}
                        </span>
                      </h2>
                    </div>

                    {hasActiveProductFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[#E5C65A]/45 bg-[#13311D] hover:bg-[#263B20] text-xs font-bold text-[#FFF0A3] cursor-pointer"
                      >
                        {t.clearFilters}
                      </button>
                    )}
                  </div>

                  {/* Product Filter & Sort Toolbar */}
                  <div className="agri-glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <select
                      value={selectedCategory}
                      onChange={(e) =>
                        setSelectedCategory(e.target.value as CategoryId)
                      }
                      aria-label={isUrdu ? 'بیج کی قسم' : 'Seed Category'}
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-xs sm:text-sm text-[#F8F7EA]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {isUrdu ? c.ur : c.en}
                        </option>
                      ))}
                    </select>

                    <select
                      value={priceFilter}
                      onChange={(e) =>
                        setPriceFilter(e.target.value as ProductPriceFilter)
                      }
                      aria-label={isUrdu ? 'قیمت کی حد' : 'Price Range'}
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-xs sm:text-sm text-[#F8F7EA]"
                    >
                      <option value="all">
                        {isUrdu ? 'تمام قیمتیں' : 'All Prices'}
                      </option>
                      <option value="under-2000">
                        {isUrdu ? 'Rs. 2,000 سے کم' : 'Under Rs. 2,000'}
                      </option>
                      <option value="2000-6000">
                        {isUrdu ? 'Rs. 2,000 – 6,000' : 'Rs. 2,000 – 6,000'}
                      </option>
                      <option value="above-6000">
                        {isUrdu ? 'Rs. 6,000 سے زیادہ' : 'Above Rs. 6,000'}
                      </option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as ProductSortOption)
                      }
                      aria-label={isUrdu ? 'ترتیب دیں' : 'Sort Products'}
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] text-xs sm:text-sm text-[#F8F7EA]"
                    >
                      <option value="latest">
                        {isUrdu ? 'ترتیب: تازہ ترین' : 'Sort: Latest'}
                      </option>
                      <option value="price-asc">
                        {isUrdu
                          ? 'ترتیب: کم سے زیادہ قیمت'
                          : 'Sort: Lowest Price'}
                      </option>
                      <option value="price-desc">
                        {isUrdu
                          ? 'ترتیب: زیادہ سے کم قیمت'
                          : 'Sort: Highest Price'}
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setInStockOnly((prev) => !prev)}
                      className={`min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        inStockOnly
                          ? 'bg-[#E5C65A] text-[#102B19] border-[#E5C65A]'
                          : 'bg-[#0D2314] text-[#D7E2CE] border-[#44633B] hover:border-[#E5C65A]'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>
                        {isUrdu ? 'صرف دستیاب اسٹاک' : 'In Stock Only'}
                      </span>
                    </button>

                    <div className="min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314]/80 border border-[#44633B]/60 flex items-center justify-center text-xs font-bold text-[#FFF0A3] tabular-nums">
                      {filteredProducts.length}{' '}
                      {isUrdu ? 'مصنوعات دستیاب' : 'Products Matched'}
                    </div>
                  </div>

                  {hasActiveProductFilters ? (
                    filteredProducts.length === 0 ? (
                      <div className="agri-glass rounded-2xl p-10 text-center space-y-3">
                        <Sprout className="w-10 h-10 text-[#E5C65A] mx-auto" />
                        <p className="text-base font-bold text-[#FFF0A3]">
                          {isUrdu
                            ? 'منتخب کردہ فلٹرز کے مطابق کوئی بیج پروڈکٹ نہیں ملی'
                            : 'No seed products match your selected filters'}
                        </p>
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="min-h-[40px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
                        >
                          {t.clearFilters}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredProducts.map(({ shop, product }) => (
                          <ShopProductCard
                            key={product.id}
                            lang={lang}
                            shop={shop}
                            product={product}
                            onViewDetails={(sId, pId) =>
                              handleOpenProduct(sId, pId, false)
                            }
                            onOrderNow={(sId, pId) =>
                              handleOpenProduct(sId, pId, true)
                            }
                            onOpenShop={handleOpenShopStorefront}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-8">
                      {/* Featured Products */}
                      {featuredProducts.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg sm:text-xl font-bold text-[#FFF0A3] flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#E5C65A]" />
                              <span>
                                {isUrdu
                                  ? 'نمایاں دیسی بیج'
                                  : 'Featured Products'}
                              </span>
                            </h3>
                            <span className="text-xs font-semibold text-[#E5C65A] tabular-nums">
                              {featuredProducts.length}{' '}
                              {isUrdu ? 'منتخب بیج' : 'Featured'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {featuredProducts.map(({ shop, product }) => (
                              <ShopProductCard
                                key={`home-feat-${product.id}`}
                                lang={lang}
                                shop={shop}
                                product={product}
                                onViewDetails={(sId, pId) =>
                                  handleOpenProduct(sId, pId, false)
                                }
                                onOrderNow={(sId, pId) =>
                                  handleOpenProduct(sId, pId, true)
                                }
                                onOpenShop={handleOpenShopStorefront}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Latest Products */}
                      {latestProducts.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg sm:text-xl font-bold text-[#FFF0A3]">
                              {isUrdu ? 'تازہ ترین بیج مصنوعات' : 'Latest Products'}
                            </h3>
                            <span className="text-xs font-semibold text-[#C7D3BD] tabular-nums">
                              {allActiveProducts.length}{' '}
                              {isUrdu ? 'کل مصنوعات' : 'total catalog'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {latestProducts.map(({ shop, product }) => (
                              <ShopProductCard
                                key={`home-latest-${product.id}`}
                                lang={lang}
                                shop={shop}
                                product={product}
                                onViewDetails={(sId, pId) =>
                                  handleOpenProduct(sId, pId, false)
                                }
                                onOrderNow={(sId, pId) =>
                                  handleOpenProduct(sId, pId, true)
                                }
                                onOpenShop={handleOpenShopStorefront}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {/* SECTION 2: MANDI RATES INTEGRATED WITH COMMISSION SHOP PRODUCTS */}
        {activeSection === 'mandi-rates' && (
          <MandiRatesBoard
            lang={lang}
            rates={rates}
            shops={shops}
            authUser={authUser}
            onAddRate={handleAddRate}
            onUpdateRate={handleUpdateRate}
            onDeleteRate={handleDeleteRate}
            onOpenLinkedShopProduct={handleOpenLinkedShopProduct}
            onOpenAuth={onOpenAuth}
          />
        )}

        {/* SECTION 3: SHOPKEEPER ANNUAL RENT & SHOP DASHBOARD */}
        {activeSection === 'shopkeeper-dashboard' && (
          <ShopkeeperRentDashboard
            lang={lang}
            shops={shops}
            authUser={authUser}
            onRequestShopRenewal={handleRequestShopRenewal}
            onAddProduct={handleAddProduct}
            onToggleProductStock={handleToggleProductStock}
            onDeleteProduct={handleDeleteProduct}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onOpenAuth={onOpenAuth}
          />
        )}

        {/* SECTION 4: ADMIN-ONLY SHOP & RENT MANAGEMENT */}
        {activeSection === 'admin-shops' && (
          <AdminShopManagement
            lang={lang}
            shops={shops}
            authUser={authUser}
            onCreateShop={handleCreateShop}
            onApproveApplication={handleApproveApplication}
            onRejectApplication={handleRejectApplication}
            onUpdateShopAdmin={handleUpdateShopAdmin}
            onRecordRentPayment={handleRecordRentPayment}
            onVerifyPendingPayment={handleVerifyPendingPayment}
            onRenewShop={handleRenewShop}
            onDeleteShop={handleDeleteShop}
            onOpenAuth={onOpenAuth}
          />
        )}
      </div>

      {/* Persistent Seed Cart & Checkout Drawer */}
      <ShopCartDrawer
        lang={lang}
        isOpen={cartOpen}
        cartItems={cartItems}
        activeShops={publicActiveShops}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onConfirmCartCheckout={handleConfirmCartCheckout}
      />
    </div>
  );
}
