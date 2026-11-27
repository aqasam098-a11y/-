import { useEffect, useMemo, useState } from 'react';
import {
  Apple,
  CheckCircle2,
  Compass,
  Flower2,
  Globe,
  Home,
  LayoutGrid,
  Leaf,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  PanelLeftOpen,
  Plus,
  Search,
  Sprout,
  User,
  Wheat,
  X,
} from 'lucide-react';
import { AddSeedView } from './components/AddSeedView';
import { AuthModal } from './components/AuthModal';
import { CommissionShopView } from './components/CommissionShopView';
import { FarmersDirectoryView } from './components/FarmersDirectoryView';
import { HomeDashboardView } from './components/HomeDashboardView';
import { InfoModal } from './components/InfoModal';
import { KisanDiaryView } from './components/KisanDiaryView';
import { KisanProfileView } from './components/KisanProfileView';
import { LocationNearbyView } from './components/LocationNearbyView';
import { RatingsReviewsView } from './components/RatingsReviewsView';
import { SeedCard } from './components/SeedCard';
import { SeedDetailView } from './components/SeedDetailView';
import { SidebarMenu } from './components/SidebarMenu';
import { VoiceChatHubView } from './components/VoiceChatHubView';
import { WhatsAppModal } from './components/WhatsAppModal';
import {
  CATEGORIES,
  DEFAULT_MY_PROFILE,
  getCityCoords,
  HERO_IMAGE_URL,
  INITIAL_COMMISSION_SHOPS,
  INITIAL_DIARY_POSTS,
  INITIAL_FARMER_PROFILES,
  INITIAL_REVIEWS_BY_SEED,
  INITIAL_SEEDS,
  PAKISTANI_CITIES,
  UI_COPY,
} from './data/seeds';
import { calculateDistanceKm } from './utils/media';
import {
  evaluateShopRental,
  normalizeAndAutoExpireShops,
} from './utils/shopRental';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  getFirebaseUpgradeConsoleUrl,
  isQuotaExceededFirestoreError,
} from './firebase';
import {
  addDiaryCommentInFirestore,
  addSeedReviewInFirestore,
  createDiaryPostInFirestore,
  createSeedInFirestore,
  isFirebaseBootstrappedAdmin,
  saveUserCartToFirestore,
  saveUserWishlistToFirestore,
  seedInitialDatabaseIfEmpty,
  subscribeDiaryComments,
  subscribePublicDiaryPosts,
  subscribePublicFarmerProfiles,
  subscribePublicSeeds,
  subscribeSeedReviews,
  syncSignedInUserProfile,
  toggleDiaryLikeInFirestore,
  updateFirestoreUserPublicProfile,
} from './services/firestoreSync';
import {
  AppTab,
  AuthUser,
  CartItem,
  CategoryId,
  CommissionShopSection,
  DiaryComment,
  DiaryPost,
  FarmerProfile,
  InfoModalTopic,
  Language,
  ListingType,
  SeedItem,
  SeedReview,
} from './types';

function BrandMark() {
  return (
    <span
      className="w-9 h-9 rounded-lg bg-[#263B20] border border-[#E5C65A]/45 text-[#FFF0A3] flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21V9" />
        <path d="M12 9C12 5.5 15 3 19 3c0 4-2.5 7-7 6Z" />
        <path d="M12 13C12 9.5 9 7 5 7c0 4 2.5 7 7 6Z" />
        <path d="M8 21h8" />
      </svg>
    </span>
  );
}

function getCategoryIcon(id: CategoryId) {
  switch (id) {
    case 'all':
      return LayoutGrid;
    case 'vegetables':
      return Sprout;
    case 'fruits':
      return Apple;
    case 'grains':
      return Wheat;
    case 'herbs':
      return Flower2;
    case 'fodder':
      return Leaf;
  }
}

const SEEDS_STORAGE_KEY = 'desibeej_seeds_v1';
const REVIEWS_STORAGE_KEY = 'desibeej_reviews_v1';
const DIARY_STORAGE_KEY = 'desibeej_diary_v1';
const MY_PROFILE_STORAGE_KEY = 'desibeej_my_profile_v1';
const WISHLIST_STORAGE_KEY = 'desibeej_wishlist_v1';
const LANG_STORAGE_KEY = 'desibeej_lang_v1';
const AUTH_STORAGE_KEY = 'desibeej_auth_user_v1';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'ur' || saved === 'en') {
        return saved;
      }
    } catch {
      // Fallback to English
    }
    return 'en';
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudProfiles, setCloudProfiles] = useState<FarmerProfile[]>([]);
  const [cloudCartItems, setCloudCartItems] = useState<CartItem[] | null>(null);

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.name) {
          return parsed;
        }
      }
    } catch {
      // Ignore auth storage errors
    }
    return null;
  });

  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    return seedParam || null;
  });

  const [initialCommissionShopId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('shop') || null;
  });

  const [initialCommissionProductId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('product') || null;
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('seed')) {
        return 'marketplace';
      }
      if (params.get('shop') || params.get('product')) {
        return 'commission-shop';
      }
    }
    return 'home';
  });

  const [commissionShopSection, setCommissionShopSection] =
    useState<CommissionShopSection>('shops');

  const [seeds, setSeeds] = useState<SeedItem[]>(() => {
    try {
      const saved = localStorage.getItem(SEEDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial sample Pakistani seeds
    }
    return INITIAL_SEEDS;
  });

  const [reviewsBySeed, setReviewsBySeed] = useState<
    Record<string, SeedReview[]>
  >(() => {
    try {
      const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial sample reviews
    }
    return INITIAL_REVIEWS_BY_SEED;
  });

  const [diaryPosts, setDiaryPosts] = useState<DiaryPost[]>(() => {
    try {
      const saved = localStorage.getItem(DIARY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial diary posts
    }
    return INITIAL_DIARY_POSTS;
  });

  const [myProfile, setMyProfile] = useState<FarmerProfile>(() => {
    try {
      const saved = localStorage.getItem(MY_PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return { ...DEFAULT_MY_PROFILE, ...parsed, isMyProfile: true };
        }
      }
    } catch {
      // Fallback to default profile
    }
    return DEFAULT_MY_PROFILE;
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string');
        }
      }
    } catch {
      // Fallback to empty wishlist
    }
    return [];
  });

  const [diaryStorageWarning, setDiaryStorageWarning] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedType, setSelectedType] = useState<'all' | ListingType>('all');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [referenceCity, setReferenceCity] = useState<string>('Multan');
  const [maxDistanceKm, setMaxDistanceKm] = useState<'all' | number>('all');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [autoFocusChat, setAutoFocusChat] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [profileInitialTab, setProfileInitialTab] = useState<
    'seeds' | 'diary' | 'reviews' | 'wishlist'
  >('seeds');
  const [activeWhatsAppSeed, setActiveWhatsAppSeed] = useState<SeedItem | null>(
    null
  );
  const [activeWhatsAppFarmer, setActiveWhatsAppFarmer] =
    useState<FarmerProfile | null>(null);
  const [activeInfoTopic, setActiveInfoTopic] = useState<InfoModalTopic>(null);
  const [justAddedSeedName, setJustAddedSeedName] = useState<string | null>(
    null
  );
  const [firestoreNotice, setFirestoreNotice] = useState<{
    message: string;
    isQuota: boolean;
  } | null>(null);

  const commissionShopsCount = useMemo(() => {
    try {
      const saved = localStorage.getItem('desibeej_commission_shops_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = normalizeAndAutoExpireShops(
            parsed,
            INITIAL_COMMISSION_SHOPS
          );
          return normalized.filter(
            (s) => evaluateShopRental(s).effectiveStatus === 'active'
          ).length;
        }
      }
    } catch {
      // Fallback
    }
    return normalizeAndAutoExpireShops(
      INITIAL_COMMISSION_SHOPS,
      INITIAL_COMMISSION_SHOPS
    ).filter((s) => evaluateShopRental(s).effectiveStatus === 'active').length;
  }, [activeTab]);

  const selectedSeed = useMemo(
    () => seeds.find((s) => s.id === selectedSeedId) ?? null,
    [seeds, selectedSeedId]
  );

  const getIsSeedPhoneHidden = (seed: SeedItem): boolean =>
    Boolean(seed.hidePhone || (seed.ownerId === myProfile.id && myProfile.hidePhone));

  const getSeedOwnerKey = (seed: SeedItem): string =>
    seed.ownerId || seed.ownerUr;

  const getDiaryAuthorKey = (post: DiaryPost): string =>
    post.ownerId || post.authorUr;

  const activeFarmerProfile = useMemo<FarmerProfile | null>(() => {
    if (!selectedProfileId) return null;
    if (selectedProfileId === myProfile.id) {
      return myProfile;
    }
    if (INITIAL_FARMER_PROFILES[selectedProfileId]) {
      return INITIAL_FARMER_PROFILES[selectedProfileId];
    }

    const matchedSeed = seeds.find(
      (s) =>
        s.ownerId === selectedProfileId ||
        s.ownerUr === selectedProfileId ||
        s.ownerEn === selectedProfileId
    );
    const matchedPost = diaryPosts.find(
      (p) =>
        p.ownerId === selectedProfileId ||
        p.authorUr === selectedProfileId ||
        p.authorEn === selectedProfileId
    );

    if (matchedSeed) {
      return {
        id: selectedProfileId,
        nameUr: matchedSeed.ownerUr,
        nameEn: matchedSeed.ownerEn,
        cityUr: matchedSeed.cityUr,
        cityEn: matchedSeed.cityEn,
        whatsapp: matchedSeed.whatsapp,
        hidePhone: Boolean(matchedSeed.hidePhone),
        bioUr: `${matchedSeed.cityUr} سے تعلق رکھنے والے خالص دیسی بیج محافظ اور کاشتکار۔`,
        bioEn: `Pure heirloom seed keeper and farmer from ${matchedSeed.cityEn}.`,
        completedExchanges: 2,
      };
    }

    if (matchedPost) {
      return {
        id: selectedProfileId,
        nameUr: matchedPost.authorUr,
        nameEn: matchedPost.authorEn,
        cityUr: matchedPost.cityUr,
        cityEn: matchedPost.cityEn,
        whatsapp: '923000000000',
        hidePhone: true,
        bioUr: `${matchedPost.cityUr} سے کسان ڈائری کے مصنف اور دیسی زراعت کے شوقین۔`,
        bioEn: `Kisan Diary contributor and organic grower from ${matchedPost.cityEn}.`,
        completedExchanges: 1,
      };
    }

    return myProfile;
  }, [selectedProfileId, myProfile, seeds, diaryPosts]);

  const activeProfileSeeds = useMemo(() => {
    if (!activeFarmerProfile) return [];
    return seeds.filter(
      (s) =>
        getSeedOwnerKey(s) === activeFarmerProfile.id ||
        s.ownerUr === activeFarmerProfile.nameUr
    );
  }, [seeds, activeFarmerProfile]);

  const activeProfileDiaryPosts = useMemo(() => {
    if (!activeFarmerProfile) return [];
    return diaryPosts.filter(
      (p) =>
        getDiaryAuthorKey(p) === activeFarmerProfile.id ||
        p.authorUr === activeFarmerProfile.nameUr
    );
  }, [diaryPosts, activeFarmerProfile]);

  const wishlistSeeds = useMemo(
    () => seeds.filter((s) => wishlistIds.includes(s.id)),
    [seeds, wishlistIds]
  );

  const syncSeedUrlParam = (seedId: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (seedId) {
        url.searchParams.set('seed', seedId);
      } else {
        url.searchParams.delete('seed');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore history API errors
    }
  };

  const allFarmerProfiles = useMemo<FarmerProfile[]>(() => {
    const map = new Map<string, FarmerProfile>();
    map.set(myProfile.id, myProfile);
    for (const p of cloudProfiles) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    for (const p of Object.values(INITIAL_FARMER_PROFILES)) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [myProfile, cloudProfiles]);

  const activeOriginCoords = useMemo(() => {
    if (userCoords) return userCoords;
    return getCityCoords(referenceCity);
  }, [userCoords, referenceCity]);

  const getSeedDistanceKm = (seed: SeedItem): number => {
    const cityCenter = getCityCoords(seed.cityEn || seed.cityUr);
    const targetCoords =
      !seed.hideExactLocation && seed.lat !== undefined && seed.lng !== undefined
        ? { lat: seed.lat, lng: seed.lng }
        : cityCenter;
    return calculateDistanceKm(
      activeOriginCoords.lat,
      activeOriginCoords.lng,
      targetCoords.lat,
      targetCoords.lng
    );
  };

  const handleMarketplaceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage(
        isUrdu
          ? 'آپ کا براؤزر GPS لوکیشن کو سپورٹ نہیں کرتا؛ نیچے شہر منتخب کریں۔'
          : 'Geolocation unavailable; select a reference city instead.'
      );
      return;
    }
    setGpsStatus('loading');
    setGpsMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsStatus('idle');
        setGpsMessage(
          isUrdu
            ? 'آپ کے موجودہ GPS مقام سے فاصلہ ناپا جا رہا ہے۔'
            : 'Distances measured from your current GPS location.'
        );
      },
      () => {
        setGpsStatus('error');
        setGpsMessage(
          isUrdu
            ? 'GPS مقام کی اجازت نہیں ملی؛ منتخب کردہ شہر سے فاصلہ دکھایا جا رہا ہے۔'
            : 'GPS permission denied; using selected city for distance.'
        );
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  const openSeedDetail = (seed: SeedItem, focusChat = false) => {
    setActiveTab('marketplace');
    setSelectedSeedId(seed.id);
    setAutoFocusChat(focusChat);
    syncSeedUrlParam(seed.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeSeedDetail = () => {
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFarmerProfile = (
    profileId: string,
    initialTab: 'seeds' | 'diary' | 'reviews' | 'wishlist' = 'seeds'
  ) => {
    setSelectedProfileId(profileId);
    setProfileInitialTab(initialTab);
    setActiveTab('profile');
    setSelectedSeedId(null);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToHome = () => {
    setActiveTab('home');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToMarketplace = () => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    setSelectedType('all');
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToCategories = () => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById('categories-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  const switchToDiary = () => {
    setActiveTab('diary');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToFarmers = () => {
    setActiveTab('farmers');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToAddSeed = () => {
    setActiveTab('add-seed');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToChatHub = () => {
    setActiveTab('chat-hub');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToRatings = () => {
    setActiveTab('ratings');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToNearby = () => {
    setActiveTab('nearby');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCommissionSection = (section: CommissionShopSection) => {
    setCommissionShopSection(section);
    setActiveTab('commission-shop');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToCommissionShop = () => openCommissionSection('shops');
  const switchToMandiRates = () => openCommissionSection('mandi-rates');
  const switchToShopkeeperDashboard = () =>
    openCommissionSection('shopkeeper-dashboard');
  const switchToAdminShops = () => openCommissionSection('admin-shops');

  const switchToSeedSale = () => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    setSelectedType('sale');
    setSelectedCategory('all');
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToSeedExchange = () => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setAutoFocusChat(false);
    setSelectedType('exchange');
    setSelectedCategory('all');
    syncSeedUrlParam(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSidebarSelectCategory = (cat: CategoryId) => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setSelectedCategory(cat);
    setTimeout(() => {
      const el = document.getElementById('latest-seeds');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const handleSidebarSelectType = (type: 'all' | ListingType) => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setSelectedType(type);
    setTimeout(() => {
      const el = document.getElementById('latest-seeds');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const handleSidebarHowItWorks = () => {
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setTimeout(() => {
      const el = document.getElementById('how-it-works');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const handleAddReview = (
    seedId: string,
    reviewInput: { reviewerName: string; rating: number; comment: string }
  ) => {
    const now = new Date();
    const newReview: SeedReview = {
      id: `rev-${Date.now()}`,
      seedId,
      reviewerUid: firebaseUser?.uid,
      reviewerName: reviewInput.reviewerName,
      rating: reviewInput.rating,
      comment: reviewInput.comment,
      dateLabelUr: now.toLocaleDateString('ur-PK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      dateLabelEn: now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      createdAt: Date.now(),
    };

    setReviewsBySeed((prev) => ({
      ...prev,
      [seedId]: [newReview, ...(prev[seedId] || [])],
    }));

    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        addSeedReviewInFirestore(seedId, newReview, firebaseUser.uid)
      );
    }
  };

  const t = UI_COPY[lang];
  const isUrdu = lang === 'ur';

  const reportFirestoreError = (err: unknown) => {
    const isQuota = isQuotaExceededFirestoreError(err);
    setFirestoreNotice({
      isQuota,
      message: isQuota
        ? isUrdu
          ? 'فائر اسٹور کی یومیہ مفت حد پوری ہو گئی ہے (کل دوبارہ بحال ہو جائے گی)۔'
          : 'Daily Firestore free-tier quota reached; it resets tomorrow.'
        : isUrdu
          ? 'کلاؤڈ ڈیٹابیس سے ہم آہنگی میں عارضی مسئلہ پیش آیا۔'
          : 'Temporary issue syncing with Cloud Firestore.',
    });
  };

  const runFirestoreOp = (promise: Promise<unknown>) => {
    void promise.catch((err) => {
      reportFirestoreError(err);
    });
  };

  useEffect(() => {
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
    document.documentElement.lang = isUrdu ? 'ur' : 'en';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors gracefully
    }
  }, [isUrdu, lang]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          if (isFirebaseBootstrappedAdmin(fbUser)) {
            await seedInitialDatabaseIfEmpty(fbUser.uid);
          }
          const synced = await syncSignedInUserProfile(fbUser);
          setAuthUser(synced.authUser);
          setWishlistIds((prev) =>
            synced.wishlistIds.length > 0 ? synced.wishlistIds : prev
          );
          if (synced.cartItems.length > 0) {
            setCloudCartItems(synced.cartItems);
          }
          const cityObj = PAKISTANI_CITIES.find(
            (c) => c.en === synced.authUser.cityEn
          );
          setMyProfile((prev) => ({
            ...prev,
            nameEn: synced.authUser.name,
            nameUr: synced.authUser.name,
            cityEn: cityObj ? cityObj.en : synced.authUser.cityEn,
            cityUr: cityObj ? cityObj.ur : prev.cityUr,
            bioUr: synced.bioUr || prev.bioUr,
            bioEn: synced.bioEn || prev.bioEn,
            hidePhone: synced.hidePhone ?? prev.hidePhone,
          }));
        } catch (err) {
          console.error('Auth sync error:', err);
        }
      } else {
        setAuthUser((prev) => (prev?.firebaseUid ? null : prev));
        setCloudCartItems(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const unsubSeeds = subscribePublicSeeds(
      (fbSeeds) => {
        if (fbSeeds.length > 0) {
          setSeeds(fbSeeds);
        }
      },
      reportFirestoreError
    );
    const unsubDiary = subscribePublicDiaryPosts(
      (fbPosts) => {
        if (fbPosts.length > 0) {
          setDiaryPosts((prev) => {
            const prevMap = new Map(prev.map((p) => [p.id, p]));
            return fbPosts.map((fp) => {
              const existing = prevMap.get(fp.id);
              return {
                ...fp,
                likedByMe: existing?.likedByMe,
                comments: existing?.comments || [],
              };
            });
          });
        }
      },
      reportFirestoreError
    );
    const unsubProfiles = subscribePublicFarmerProfiles(
      (fbProfiles) => {
        if (fbProfiles.length > 0) {
          setCloudProfiles(fbProfiles);
        }
      },
      reportFirestoreError
    );
    return () => {
      unsubSeeds();
      unsubDiary();
      unsubProfiles();
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !selectedSeedId) return;
    const unsub = subscribeSeedReviews(
      selectedSeedId,
      (fbReviews) => {
        if (fbReviews.length > 0) {
          setReviewsBySeed((prev) => ({
            ...prev,
            [selectedSeedId]: fbReviews,
          }));
        }
      },
      reportFirestoreError
    );
    return () => unsub();
  }, [authReady, selectedSeedId]);

  useEffect(() => {
    if (!authReady || activeTab !== 'diary' || diaryPosts.length === 0) return;
    const unsubs = diaryPosts.slice(0, 12).map((post) =>
      subscribeDiaryComments(
        post.id,
        (comments) => {
          if (comments.length > 0) {
            setDiaryPosts((prev) =>
              prev.map((p) => (p.id === post.id ? { ...p, comments } : p))
            );
          }
        },
        reportFirestoreError
      )
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, activeTab, diaryPosts.length]);

  useEffect(() => {
    try {
      if (authUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors gracefully
    }
  }, [authUser]);

  useEffect(() => {
    try {
      localStorage.setItem(SEEDS_STORAGE_KEY, JSON.stringify(seeds));
    } catch {
      // Ignore quota exceeded errors gracefully
    }
  }, [seeds]);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviewsBySeed));
    } catch {
      // Ignore quota exceeded errors gracefully
    }
  }, [reviewsBySeed]);

  useEffect(() => {
    try {
      localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(diaryPosts));
      setDiaryStorageWarning('');
    } catch {
      setDiaryStorageWarning(
        isUrdu
          ? 'براؤزر اسٹوریج بھر جانے کی وجہ سے تازہ ترین تبدیلی محفوظ نہیں ہو سکی۔'
          : 'Browser storage limit reached; recent changes may not persist.'
      );
    }
  }, [diaryPosts, isUrdu]);

  useEffect(() => {
    try {
      localStorage.setItem(MY_PROFILE_STORAGE_KEY, JSON.stringify(myProfile));
    } catch {
      // Ignore quota exceeded errors gracefully
    }
  }, [myProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Ignore quota exceeded errors gracefully
    }
  }, [wishlistIds]);

  const handleToggleWishlist = (seedId: string) => {
    setWishlistIds((prev) => {
      const next = prev.includes(seedId)
        ? prev.filter((id) => id !== seedId)
        : [seedId, ...prev];
      if (firebaseUser?.emailVerified) {
        runFirestoreOp(saveUserWishlistToFirestore(firebaseUser.uid, next));
      }
      return next;
    });
  };

  const handleUpdateMyProfile = (updated: FarmerProfile) => {
    setMyProfile(updated);
    setSeeds((prev) =>
      prev.map((s) =>
        s.ownerId === updated.id
          ? {
              ...s,
              ownerUr: updated.nameUr,
              ownerEn: updated.nameEn,
              cityUr: updated.cityUr,
              cityEn: updated.cityEn,
              whatsapp: updated.whatsapp,
              hidePhone: updated.hidePhone,
            }
          : s
      )
    );
    setDiaryPosts((prev) =>
      prev.map((p) =>
        p.ownerId === updated.id
          ? {
              ...p,
              authorUr: updated.nameUr,
              authorEn: updated.nameEn,
              cityUr: updated.cityUr,
              cityEn: updated.cityEn,
            }
          : p
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        updateFirestoreUserPublicProfile(firebaseUser.uid, updated)
      );
    }
  };

  const handleAuthLoginSuccess = (
    user: AuthUser,
    syncedWishlist?: string[],
    syncedCart?: CartItem[]
  ) => {
    setAuthUser(user);
    if (syncedWishlist && syncedWishlist.length > 0) {
      setWishlistIds(syncedWishlist);
    }
    if (syncedCart && syncedCart.length > 0) {
      setCloudCartItems(syncedCart);
    }
    const cityObj = PAKISTANI_CITIES.find((c) => c.en === user.cityEn);
    const digitsOnly = user.emailOrPhone.replace(/\D/g, '');
    const normalizedPhone =
      digitsOnly.length >= 10 ? digitsOnly : myProfile.whatsapp;

    setMyProfile((prev) => ({
      ...prev,
      nameEn: user.name,
      nameUr: user.name,
      cityEn: cityObj ? cityObj.en : user.cityEn,
      cityUr: cityObj ? cityObj.ur : prev.cityUr,
      whatsapp: normalizedPhone,
    }));
  };

  const handleAuthLogout = () => {
    setAuthUser(null);
    setCloudCartItems(null);
  };

  const handleAddDiaryPost = (post: DiaryPost) => {
    setDiaryPosts((prev) => [post, ...prev]);
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(createDiaryPostInFirestore(post, firebaseUser.uid));
    }
  };

  const handleToggleDiaryLike = (postId: string) => {
    setDiaryPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const nextLiked = !post.likedByMe;
        return {
          ...post,
          likedByMe: nextLiked,
          likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)),
        };
      })
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(toggleDiaryLikeInFirestore(postId, firebaseUser.uid));
    }
  };

  const handleAddDiaryComment = (postId: string, comment: DiaryComment) => {
    setDiaryPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, comment] }
          : post
      )
    );
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(
        addDiaryCommentInFirestore(postId, comment, firebaseUser.uid)
      );
    }
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ur' ? 'en' : 'ur'));
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryId, number> = {
      all: seeds.length,
      vegetables: 0,
      fruits: 0,
      grains: 0,
      herbs: 0,
      fodder: 0,
    };
    for (const s of seeds) {
      counts[s.category] += 1;
    }
    return counts;
  }, [seeds]);

  const filteredSeeds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return seeds.filter((seed) => {
      const matchesCategory =
        selectedCategory === 'all' || seed.category === selectedCategory;
      const matchesType =
        selectedType === 'all' || seed.listingType === selectedType;
      const matchesCity =
        selectedCity === 'all' ||
        seed.cityUr === selectedCity ||
        seed.cityEn === selectedCity;
      const distance = getSeedDistanceKm(seed);
      const matchesDistance =
        maxDistanceKm === 'all' || distance <= maxDistanceKm;
      const matchesQuery =
        !q ||
        seed.nameUr.toLowerCase().includes(q) ||
        seed.nameEn.toLowerCase().includes(q) ||
        seed.descriptionUr.toLowerCase().includes(q) ||
        seed.descriptionEn.toLowerCase().includes(q) ||
        seed.ownerUr.toLowerCase().includes(q) ||
        seed.ownerEn.toLowerCase().includes(q) ||
        (!seed.hideExactLocation &&
          seed.areaUr &&
          seed.areaUr.toLowerCase().includes(q)) ||
        (!seed.hideExactLocation &&
          seed.areaEn &&
          seed.areaEn.toLowerCase().includes(q));

      return (
        matchesCategory &&
        matchesType &&
        matchesCity &&
        matchesDistance &&
        matchesQuery
      );
    });
  }, [
    seeds,
    searchQuery,
    selectedCity,
    selectedCategory,
    selectedType,
    maxDistanceKm,
    activeOriginCoords,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCity !== 'all' ||
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    maxDistanceKm !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCity('all');
    setSelectedCategory('all');
    setSelectedType('all');
    setMaxDistanceKm('all');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setNavSearchOpen(false);
    setTimeout(() => {
      const target = document.getElementById('latest-seeds');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  const handleAddSeed = (newSeed: SeedItem) => {
    const withUid: SeedItem = firebaseUser
      ? { ...newSeed, ownerUid: firebaseUser.uid }
      : newSeed;
    setSeeds((prev) => [withUid, ...prev]);
    if (firebaseUser?.emailVerified) {
      runFirestoreOp(createSeedInFirestore(withUid, firebaseUser.uid));
    }
    setActiveTab('marketplace');
    setSelectedSeedId(null);
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedCity('all');
    setMaxDistanceKm('all');
    setSearchQuery('');
    setJustAddedSeedName(isUrdu ? newSeed.nameUr : newSeed.nameEn);
    setTimeout(() => {
      setJustAddedSeedName(null);
    }, 5000);
    setTimeout(() => {
      const target = document.getElementById('latest-seeds');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col bg-[#102B19] text-[#F8F7EA] overflow-x-clip"
    >
      {/* Premium Dark Green Glass Navigation Bar */}
      <header className="bg-[#102B19]/85 backdrop-blur-md border-b border-[#E5C65A]/20 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Sidebar Toggle + Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={isUrdu ? 'سائیڈبار مینو کھولیں' : 'Open sidebar menu'}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-[#44633B] bg-[#183822] hover:bg-[#263B20] flex items-center justify-center text-[#FFF0A3] shrink-0 cursor-pointer transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!desktopSidebarOpen && (
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(true)}
                title={isUrdu ? 'سائیڈبار کھولیں' : 'Open sidebar'}
                aria-label={isUrdu ? 'سائیڈبار کھولیں' : 'Open sidebar'}
                className="hidden lg:flex w-9 h-9 rounded-lg border border-[#44633B] bg-[#183822] hover:bg-[#263B20] items-center justify-center text-[#E5C65A] shrink-0 cursor-pointer transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={switchToHome}
              className="flex items-center gap-2 sm:gap-2.5 min-w-0 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A] rounded-lg"
            >
              <BrandMark />
              <span className="text-[16px] leading-[58px] text-center [font-family:Verdana] font-bold text-[#FFF0A3] tracking-tight truncate">
                {t.brandName}
              </span>
            </button>
          </div>

          {/* Primary Navigation Links (Desktop lg+) */}
          <nav
            aria-label={isUrdu ? 'مرکزی مینو' : 'Main Navigation'}
            className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium text-[#D7E2CE]"
          >
            <button
              type="button"
              onClick={switchToHome}
              className={`hover:text-[#FFF0A3] underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#FFF0A3] font-bold underline decoration-[#E5C65A]'
                  : 'hover:underline'
              }`}
            >
              {t.navHome}
            </button>
            <button
              type="button"
              onClick={switchToMarketplace}
              className={`hover:text-[#FFF0A3] underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'marketplace' && selectedCategory === 'all'
                  ? 'text-[#FFF0A3] font-bold underline decoration-[#E5C65A]'
                  : 'hover:underline'
              }`}
            >
              {t.navMarketplace}
            </button>
            <button
              type="button"
              onClick={switchToCategories}
              className="hover:text-[#FFF0A3] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navCategories}
            </button>
            <button
              type="button"
              onClick={switchToAddSeed}
              className={`hover:text-[#FFF0A3] underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'add-seed'
                  ? 'text-[#FFF0A3] font-bold underline decoration-[#E5C65A]'
                  : 'hover:underline'
              }`}
            >
              {t.navSellSeeds}
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTopic('about')}
              className="hover:text-[#FFF0A3] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navAbout}
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTopic('contact')}
              className="hover:text-[#FFF0A3] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navContact}
            </button>
          </nav>

          {/* Header Actions: Search Icon, Always-Visible Language Switcher, My Profile / Login */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setNavSearchOpen((prev) => !prev)}
              aria-label={isUrdu ? 'بیج تلاش کریں' : 'Search seeds'}
              aria-expanded={navSearchOpen}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                navSearchOpen
                  ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19]'
                  : 'bg-[#183822] border-[#44633B] hover:bg-[#263B20] text-[#FFF0A3]'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Language Switcher — always visible on mobile (< 640px) & desktop */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={
                isUrdu
                  ? 'زبان تبدیل کریں: اردو سے English'
                  : 'Switch language: English to Urdu'
              }
              className="min-h-[36px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[#E5C65A]/45 bg-[#183822] hover:bg-[#263B20] text-xs sm:text-sm font-bold text-[#FFF0A3] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
            >
              <Globe
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E5C65A] shrink-0"
                aria-hidden="true"
              />
              <span className="sm:hidden">اردو / EN</span>
              <span className="hidden sm:inline">{t.langToggle}</span>
            </button>

            <button
              type="button"
              onClick={() => openFarmerProfile(myProfile.id)}
              className={`hidden md:inline-flex min-h-[40px] items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'profile' && selectedProfileId === myProfile.id
                  ? 'bg-[#263B20] border-[#E5C65A] text-[#FFF0A3]'
                  : 'border-[#44633B] bg-[#183822] hover:bg-[#263B20] text-[#F8F7EA]'
              }`}
            >
              <User className="w-4 h-4 text-[#E5C65A] shrink-0" aria-hidden="true" />
              <span>{t.navMyProfile}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0A3]"
            >
              {authUser ? (
                <>
                  <User className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="max-w-[110px] truncate">{authUser.name}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.navLoginSignup}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Header Quick Search Bar */}
        {navSearchOpen && (
          <div className="border-t border-[#44633B]/60 bg-[#13311D]/95 backdrop-blur-md">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2.5"
            >
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchSeedPlaceholder}
                  className="w-full min-h-[42px] ps-10 pe-4 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold whitespace-nowrap cursor-pointer"
              >
                {t.searchBtn}
              </button>
              <button
                type="button"
                onClick={() => setNavSearchOpen(false)}
                aria-label={isUrdu ? 'تلاش بند کریں' : 'Close search'}
                className="w-10 h-10 rounded-xl border border-[#44633B] bg-[#183822] hover:bg-[#263B20] text-[#F8F7EA] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      <div className="flex-1 flex min-w-0">
        <SidebarMenu
          lang={lang}
          activeTab={activeTab}
          commissionSection={commissionShopSection}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          categoryCounts={categoryCounts}
          mobileOpen={mobileMenuOpen}
          desktopOpen={desktopSidebarOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onToggleDesktop={() => setDesktopSidebarOpen((prev) => !prev)}
          onSelectHome={switchToHome}
          onSelectMarketplace={switchToMarketplace}
          onSelectChatHub={switchToChatHub}
          onSelectRatings={switchToRatings}
          onSelectDiary={switchToDiary}
          onSelectCommissionShop={switchToCommissionShop}
          onSelectMandiRates={switchToMandiRates}
          onSelectShopkeeperDashboard={switchToShopkeeperDashboard}
          onSelectAdminShops={switchToAdminShops}
          onSelectFarmers={switchToFarmers}
          onSelectNearby={switchToNearby}
          onSelectMyProfile={() => openFarmerProfile(myProfile.id)}
          onSelectCategory={handleSidebarSelectCategory}
          onSelectType={handleSidebarSelectType}
          onOpenAddSeed={switchToAddSeed}
          onOpenHowItWorks={handleSidebarHowItWorks}
          onOpenInfo={(topic) => setActiveInfoTopic(topic)}
        />

        <main id="top" className="flex-1 min-w-0">
          {firestoreNotice && (
            <div
              role="alert"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"
            >
              <div className="rounded-xl border border-amber-400/45 bg-amber-950/60 px-4 py-2.5 text-xs sm:text-sm text-amber-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
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
            </div>
          )}
          {activeTab === 'home' ? (
            <HomeDashboardView
              lang={lang}
              seeds={seeds}
              profiles={allFarmerProfiles}
              reviewsBySeed={reviewsBySeed}
              wishlistIds={wishlistIds}
              diaryPosts={diaryPosts}
              commissionShopsCount={commissionShopsCount}
              isAuthenticated={Boolean(authUser)}
              onToggleSave={handleToggleWishlist}
              onSelectSeed={openSeedDetail}
              onSelectOwner={(s) => openFarmerProfile(getSeedOwnerKey(s))}
              onSelectProfile={(profileId) => openFarmerProfile(profileId)}
              onContactWhatsApp={(s) => setActiveWhatsAppSeed(s)}
              onOpenMarketplace={switchToMarketplace}
              onOpenSeedSale={switchToSeedSale}
              onOpenSeedExchange={switchToSeedExchange}
              onSelectCategory={handleSidebarSelectCategory}
              onOpenAddSeed={switchToAddSeed}
              onOpenDiary={switchToDiary}
              onOpenFarmers={switchToFarmers}
              onOpenNearby={switchToNearby}
              onOpenChatHub={switchToChatHub}
              onOpenRatings={switchToRatings}
              onOpenCommissionShop={switchToCommissionShop}
              onOpenWishlist={() => openFarmerProfile(myProfile.id, 'wishlist')}
              onOpenMyProfile={() => openFarmerProfile(myProfile.id)}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          ) : activeTab === 'commission-shop' ? (
            <CommissionShopView
              lang={lang}
              myProfile={myProfile}
              authUser={authUser}
              firebaseUser={firebaseUser}
              authReady={authReady}
              cloudCartItems={cloudCartItems}
              onSyncCartToCloud={(nextCart) => {
                if (firebaseUser?.emailVerified) {
                  runFirestoreOp(
                    saveUserCartToFirestore(firebaseUser.uid, nextCart)
                  );
                }
              }}
              initialSection={commissionShopSection}
              initialShopId={initialCommissionShopId}
              initialProductId={initialCommissionProductId}
              onBackHome={switchToHome}
              onOpenAddSeed={switchToAddSeed}
              onOpenChatHub={switchToChatHub}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          ) : activeTab === 'add-seed' ? (
            <AddSeedView
              lang={lang}
              defaultProfile={myProfile}
              onBackHome={switchToHome}
              onAddSeed={handleAddSeed}
            />
          ) : activeTab === 'chat-hub' ? (
            <VoiceChatHubView
              lang={lang}
              seeds={seeds}
              onBackHome={switchToHome}
              onOpenSeedDetail={openSeedDetail}
              onSelectOwner={(s) => openFarmerProfile(getSeedOwnerKey(s))}
            />
          ) : activeTab === 'ratings' ? (
            <RatingsReviewsView
              lang={lang}
              seeds={seeds}
              profiles={allFarmerProfiles}
              reviewsBySeed={reviewsBySeed}
              onAddReview={handleAddReview}
              onBackHome={switchToHome}
              onSelectSeed={(s) => openSeedDetail(s)}
              onSelectProfile={(profileId) => openFarmerProfile(profileId)}
            />
          ) : activeTab === 'nearby' ? (
            <LocationNearbyView
              lang={lang}
              seeds={seeds}
              userCoords={userCoords}
              referenceCity={referenceCity}
              onSetUserCoords={setUserCoords}
              onSetReferenceCity={setReferenceCity}
              onBackHome={switchToHome}
              onOpenSeedDetail={openSeedDetail}
              onSelectOwner={(s) => openFarmerProfile(getSeedOwnerKey(s))}
            />
          ) : activeTab === 'farmers' ? (
            <FarmersDirectoryView
              lang={lang}
              profiles={allFarmerProfiles}
              myProfile={myProfile}
              seeds={seeds}
              diaryPosts={diaryPosts}
              reviewsBySeed={reviewsBySeed}
              userCoords={userCoords}
              referenceCity={referenceCity}
              onSetUserCoords={setUserCoords}
              onSetReferenceCity={setReferenceCity}
              onBackHome={switchToHome}
              onSelectProfile={openFarmerProfile}
              onContactWhatsAppProfile={(p) => setActiveWhatsAppFarmer(p)}
            />
          ) : activeTab === 'profile' && activeFarmerProfile ? (
            <KisanProfileView
              profile={activeFarmerProfile}
              isOwnProfile={activeFarmerProfile.id === myProfile.id}
              lang={lang}
              seeds={activeProfileSeeds}
              diaryPosts={activeProfileDiaryPosts}
              reviewsBySeed={reviewsBySeed}
              wishlistIds={wishlistIds}
              wishlistSeeds={wishlistSeeds}
              initialTab={profileInitialTab}
              onToggleWishlist={handleToggleWishlist}
              onSelectOwner={(s) => openFarmerProfile(getSeedOwnerKey(s))}
              onBack={switchToHome}
              onSelectSeed={(s, focusChat) => openSeedDetail(s, focusChat)}
              onContactWhatsAppSeed={(s) => setActiveWhatsAppSeed(s)}
              onContactWhatsAppProfile={(p) => setActiveWhatsAppFarmer(p)}
              onUpdateMyProfile={handleUpdateMyProfile}
              onOpenDiaryTab={switchToDiary}
              onOpenAddSeed={switchToAddSeed}
            />
          ) : activeTab === 'diary' ? (
            <KisanDiaryView
              lang={lang}
              posts={diaryPosts}
              myProfile={myProfile}
              storageWarning={diaryStorageWarning}
              onAddPost={handleAddDiaryPost}
              onToggleLike={handleToggleDiaryLike}
              onAddComment={handleAddDiaryComment}
              onSelectAuthor={(post) =>
                openFarmerProfile(getDiaryAuthorKey(post))
              }
              onBackHome={switchToHome}
            />
          ) : selectedSeed ? (
            <SeedDetailView
              seed={selectedSeed}
              lang={lang}
              reviews={reviewsBySeed[selectedSeed.id] || []}
              isPhoneHidden={getIsSeedPhoneHidden(selectedSeed)}
              autoFocusChat={autoFocusChat}
              isSaved={wishlistIds.includes(selectedSeed.id)}
              onToggleSave={handleToggleWishlist}
              onAddReview={handleAddReview}
              onBack={closeSeedDetail}
              onSelectOwner={(s) => openFarmerProfile(getSeedOwnerKey(s))}
              onContactWhatsApp={(s) => setActiveWhatsAppSeed(s)}
            />
          ) : (
            <>
              {/* Marketplace Search Hero Section */}
              <section
                id="search-section"
                className="border-b border-[#44633B]/60 bg-gradient-to-b from-[#1A3B24] to-[#102B19]"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
                  {/* Marketplace Breadcrumb */}
                  <nav aria-label={isUrdu ? 'بریڈ کرمب' : 'Breadcrumb'} className="mb-5">
                    <ol className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
                      <li>
                        <button
                          type="button"
                          onClick={switchToHome}
                          className="inline-flex items-center gap-1.5 text-[#E5C65A] hover:text-[#FFF0A3] hover:underline font-semibold cursor-pointer"
                        >
                          <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>{t.breadcrumbHome}</span>
                        </button>
                      </li>
                      <li aria-hidden="true" className="text-[#8DA182]">
                        &gt;
                      </li>
                      <li className="text-[#FFF0A3] font-semibold">
                        {t.navMarketplace}
                      </li>
                    </ol>
                  </nav>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                    {/* Text & Search Column */}
                    <div className="lg:col-span-7 flex flex-col justify-center">
                      <p className="text-sm sm:text-base font-semibold text-[#E5C65A] mb-2">
                        {t.heroKicker}
                      </p>

                      <h1
                        className={`font-bold text-[#FFF0A3] text-balance mb-4 ${
                          isUrdu
                            ? 'font-urdu-display text-2xl sm:text-3xl lg:text-4xl leading-[2.15]'
                            : 'font-display-heading text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight'
                        }`}
                      >
                        {t.heroTitle}
                      </h1>

                      <p className="text-base sm:text-lg text-[#D7E2CE] leading-relaxed max-w-2xl mb-6">
                        {t.heroSubtitle}
                      </p>

                      {/* Quick Search Form */}
                      <form
                        onSubmit={handleSearchSubmit}
                        className="agri-glass-elevated p-3.5 rounded-2xl"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          {/* Seed Name Input */}
                          <div className="sm:col-span-5 relative">
                            <label htmlFor="hero-seed-search" className="sr-only">
                              {isUrdu ? 'بیج کا نام' : 'Seed Name'}
                            </label>
                            <Search
                              className={`w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                                isUrdu ? 'right-3.5' : 'left-3.5'
                              }`}
                              aria-hidden="true"
                            />
                            <input
                              id="hero-seed-search"
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder={t.searchSeedPlaceholder}
                              className={`w-full min-h-[46px] py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm sm:text-base text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A] ${
                                isUrdu ? 'pr-10 pl-3' : 'pl-10 pr-3'
                              }`}
                            />
                          </div>

                          {/* City / District Select */}
                          <div className="sm:col-span-4 relative">
                            <label htmlFor="hero-city-select" className="sr-only">
                              {isUrdu ? 'شہر / ضلع' : 'City / District'}
                            </label>
                            <MapPin
                              className={`w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                                isUrdu ? 'right-3.5' : 'left-3.5'
                              }`}
                              aria-hidden="true"
                            />
                            <select
                              id="hero-city-select"
                              value={selectedCity}
                              onChange={(e) => setSelectedCity(e.target.value)}
                              className={`w-full min-h-[46px] py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm sm:text-base text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A] ${
                                isUrdu ? 'pr-10 pl-3' : 'pl-10 pr-3'
                              }`}
                            >
                              <option value="all">{t.searchCityDefault}</option>
                              {PAKISTANI_CITIES.map((city) => (
                                <option key={city.en} value={city.en}>
                                  {isUrdu ? city.ur : city.en}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Search Submit Button */}
                          <div className="sm:col-span-3">
                            <button
                              type="submit"
                              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0A3]"
                            >
                              {t.searchBtn}
                            </button>
                          </div>
                        </div>

                        {/* Nearby Distance Filter Row */}
                        <div className="mt-3 pt-3 border-t border-[#44633B]/60 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleMarketplaceGps}
                              disabled={gpsStatus === 'loading'}
                              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/40 text-xs font-semibold text-[#FFF0A3] cursor-pointer disabled:opacity-60 transition-colors"
                            >
                              <Compass
                                className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]"
                                aria-hidden="true"
                              />
                              <span>
                                {gpsStatus === 'loading'
                                  ? isUrdu
                                    ? 'GPS تلاش...'
                                    : 'Detecting...'
                                  : isUrdu
                                    ? 'قریبی GPS مقام'
                                    : 'Use My GPS'}
                              </span>
                            </button>

                            <select
                              aria-label={isUrdu ? 'مرکزی شہر' : 'Reference city'}
                              value={userCoords ? 'gps' : referenceCity}
                              onChange={(e) => {
                                if (e.target.value !== 'gps') {
                                  setUserCoords(null);
                                  setReferenceCity(e.target.value);
                                }
                              }}
                              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#0D2314] border border-[#44633B] text-xs font-semibold text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                            >
                              {userCoords && (
                                <option value="gps">
                                  {isUrdu ? 'موجودہ GPS مقام' : 'Current GPS'}
                                </option>
                              )}
                              {PAKISTANI_CITIES.map((c) => (
                                <option key={c.en} value={c.en}>
                                  {isUrdu ? `از ${c.ur}` : `From ${c.en}`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="marketplace-distance"
                              className="text-xs font-semibold text-[#C7D3BD]"
                            >
                              {isUrdu ? 'قریبی فاصلہ:' : 'Nearby:'}
                            </label>
                            <select
                              id="marketplace-distance"
                              value={
                                maxDistanceKm === 'all'
                                  ? 'all'
                                  : String(maxDistanceKm)
                              }
                              onChange={(e) =>
                                setMaxDistanceKm(
                                  e.target.value === 'all'
                                    ? 'all'
                                    : Number(e.target.value)
                                )
                              }
                              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#0D2314] border border-[#44633B] text-xs font-semibold text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                            >
                              <option value="all">{t.nearbyAllDistances}</option>
                              <option value="25">
                                {isUrdu ? '25 کلومیٹر' : 'Within 25 km'}
                              </option>
                              <option value="50">
                                {isUrdu ? '50 کلومیٹر' : 'Within 50 km'}
                              </option>
                              <option value="100">
                                {isUrdu ? '100 کلومیٹر' : 'Within 100 km'}
                              </option>
                              <option value="250">
                                {isUrdu ? '250 کلومیٹر' : 'Within 250 km'}
                              </option>
                            </select>
                          </div>
                        </div>

                        {gpsMessage && (
                          <p
                            className={`mt-2 text-xs font-medium ${
                              gpsStatus === 'error'
                                ? 'text-[#E5C65A]'
                                : 'text-[#FFF0A3]'
                            }`}
                          >
                            {gpsMessage}
                          </p>
                        )}
                      </form>

                      {/* Quick Mobile CTA + Unboxed Trust Markers */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
                          <span>{t.heroTrust1}</span>
                          <span aria-hidden="true">·</span>
                          <span>{t.heroTrust2}</span>
                          <span aria-hidden="true">·</span>
                          <span>{t.heroTrust3}</span>
                        </div>

                        <button
                          type="button"
                          onClick={switchToAddSeed}
                          className="sm:hidden w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
                        >
                          <span>{t.addSeedBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* Hero Visual Column */}
                    <div className="lg:col-span-5 flex">
                      <div className="w-full rounded-2xl overflow-hidden border border-[#E5C65A]/30 bg-[#13311D] aspect-[16/10] lg:aspect-auto lg:min-h-[360px]">
                        {!heroImgFailed ? (
                          <img
                            src={HERO_IMAGE_URL}
                            alt={
                              isUrdu
                                ? 'پاکستانی کسان خالص دیسی بیجوں کی چھانٹی کرتے ہوئے'
                                : 'Pakistani farmer sorting pure heirloom desi seeds in terracotta bowls'
                            }
                            referrerPolicy="no-referrer"
                            onError={() => setHeroImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#183822] to-[#263B20]">
                            <Wheat className="w-12 h-12 text-[#E5C65A] mb-3" />
                            <p className="text-base font-bold text-[#FFF0A3]">
                              {t.brandName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Categories Bar */}
              <section
                id="categories-section"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
                  <div>
                    <h2 className="font-display-heading text-xl sm:text-2xl font-bold text-[#FFF0A3]">
                      {t.categoriesTitle}
                    </h2>
                    <p className="text-sm text-[#C7D3BD] mt-1">
                      {t.categoriesSubtitle}
                    </p>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={t.categoriesTitle}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
                >
                  {CATEGORIES.map((cat) => {
                    const Icon = getCategoryIcon(cat.id);
                    const isActive = selectedCategory === cat.id;
                    const count = categoryCounts[cat.id];
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        aria-pressed={isActive}
                        className={`min-h-[76px] p-3.5 rounded-xl border text-start flex flex-col justify-between gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A] ${
                          isActive
                            ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19] shadow-md'
                            : 'agri-glass text-[#F8F7EA] hover:border-[#E5C65A]/60 hover:bg-[#1E442A]/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Icon
                            className={`w-5 h-5 shrink-0 ${
                              isActive ? 'text-[#102B19]' : 'text-[#E5C65A]'
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              isActive ? 'text-[#102B19]' : 'text-[#C7D3BD]'
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                        <span className="text-sm sm:text-base font-bold leading-snug">
                          {isUrdu ? cat.ur : cat.en}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Latest Seeds Grid */}
              <section
                id="latest-seeds"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
              >
                {/* Confirmation banner when a new seed is published */}
                {justAddedSeedName && (
                  <div
                    role="status"
                    className="mb-6 p-4 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 flex items-center justify-between gap-3 text-[#FFF0A3]"
                  >
                    <div className="flex items-center gap-2.5 text-sm sm:text-base font-semibold">
                      <CheckCircle2
                        className="w-5 h-5 shrink-0 text-[#E5C65A]"
                        aria-hidden="true"
                      />
                      <span>
                        {isUrdu
                          ? `آپ کا بیج "${justAddedSeedName}" کامیابی سے فہرست میں شامل کر دیا گیا ہے۔`
                          : `Your seed "${justAddedSeedName}" has been published to the exchange.`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJustAddedSeedName(null)}
                      aria-label={isUrdu ? 'بند کریں' : 'Dismiss'}
                      className="p-1 rounded-lg hover:bg-[#102B19]/40 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Header & Listing Type Segmented Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-display-heading text-2xl sm:text-3xl font-bold text-[#FFF0A3]">
                      {t.latestTitle}
                    </h2>
                    <p className="text-sm text-[#C7D3BD] mt-1 tabular-nums">
                      {filteredSeeds.length} {t.latestCountSuffix}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Listing Type Filter */}
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0D2314] border border-[#44633B]">
                      {(
                        [
                          { id: 'all', label: t.filterAllTypes },
                          { id: 'exchange', label: t.filterExchangeOnly },
                          { id: 'sale', label: t.filterSaleOnly },
                        ] as const
                      ).map((tab) => {
                        const active = selectedType === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedType(tab.id)}
                            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-[#E5C65A] text-[#102B19] font-bold'
                                : 'text-[#D7E2CE] hover:text-[#FFF0A3]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.clearFilters}
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid or Empty State */}
                {filteredSeeds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSeeds.map((seed) => {
                      const seedReviews = reviewsBySeed[seed.id] || [];
                      const avgRating =
                        seedReviews.length > 0
                          ? seedReviews.reduce((sum, r) => sum + r.rating, 0) /
                            seedReviews.length
                          : null;
                      return (
                        <SeedCard
                          key={seed.id}
                          seed={seed}
                          lang={lang}
                          rating={avgRating}
                          reviewCount={seedReviews.length}
                          distanceKm={
                            userCoords || maxDistanceKm !== 'all'
                              ? getSeedDistanceKm(seed)
                              : null
                          }
                          isPhoneHidden={getIsSeedPhoneHidden(seed)}
                          isSaved={wishlistIds.includes(seed.id)}
                          onToggleSave={handleToggleWishlist}
                          onSelectSeed={openSeedDetail}
                          onSelectOwner={(s) =>
                            openFarmerProfile(getSeedOwnerKey(s))
                          }
                          onContactWhatsApp={(s) => setActiveWhatsAppSeed(s)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-14 px-6 rounded-2xl agri-glass text-center max-w-xl mx-auto">
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#FFF0A3]/15 border border-[#E5C65A]/30 text-[#E5C65A] flex items-center justify-center mb-4">
                      <Sprout className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#FFF0A3] mb-2">
                      {t.emptyTitle}
                    </h3>
                    <p className="text-sm sm:text-base text-[#D7E2CE] mb-5">
                      {t.emptySubtitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
                      >
                        {t.clearFilters}
                      </button>
                      <button
                        type="button"
                        onClick={switchToAddSeed}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-[#FFF0A3] text-sm font-semibold transition-colors cursor-pointer"
                      >
                        {t.addSeedBtn}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* How It Works (3-Step Section) */}
              <section
                id="how-it-works"
                className="bg-[#13311D] border-t border-[#44633B]/60 py-12 sm:py-16"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-2xl mb-8 sm:mb-10">
                    <h2 className="font-display-heading text-2xl sm:text-3xl font-bold text-[#FFF0A3] mb-2">
                      {t.howTitle}
                    </h2>
                    <p className="text-sm sm:text-base text-[#D7E2CE]">
                      {t.howSubtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {t.steps.map((step, idx) => {
                      const StepIcon =
                        idx === 0 ? Plus : idx === 1 ? MessageCircle : Sprout;
                      return (
                        <div
                          key={step.num}
                          className="agri-glass rounded-2xl p-6 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-bold text-[#E5C65A] tabular-nums">
                                {step.num}.
                              </span>
                              <div className="w-10 h-10 rounded-lg bg-[#FFF0A3]/15 border border-[#E5C65A]/30 text-[#FFF0A3] flex items-center justify-center">
                                <StepIcon className="w-5 h-5" aria-hidden="true" />
                              </div>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-[#F8F7EA] mb-2">
                              {step.title}
                            </h3>
                            <p className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-[#0B1E11] text-[#D7E2CE] border-t border-[#44633B]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8 border-b border-[#44633B]/50">
            {/* Mission Note */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <BrandMark />
                <span className="font-display-heading text-lg sm:text-xl font-bold text-[#FFF0A3]">
                  {t.brandName}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#E5C65A]">
                {t.footerMissionTitle}
              </h3>
              <p className="text-sm text-[#C7D3BD] leading-relaxed max-w-md">
                {t.footerMissionText}
              </p>
            </div>

            {/* Pure / Non-GMO Seed Reminder */}
            <div className="lg:col-span-4">
              <div className="p-4 sm:p-5 rounded-xl bg-[#13311D] border border-[#E5C65A]/25 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-[#FFF0A3]">
                  {t.footerPurityTitle}
                </h3>
                <p className="text-xs sm:text-sm text-[#D7E2CE] leading-relaxed">
                  {t.footerPurityText}
                </p>
              </div>
            </div>

            {/* Contact & Support Links */}
            <div className="lg:col-span-3 space-y-3">
              <h3 className="text-base font-bold text-[#FFF0A3]">
                {t.footerSupportHeading}
              </h3>
              <ul className="space-y-2 text-sm text-[#C7D3BD]">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTopic('about')}
                    className="hover:text-[#FFF0A3] hover:underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    {t.navAbout}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTopic('contact')}
                    className="hover:text-[#FFF0A3] hover:underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    {t.footerContactLink}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTopic('purity')}
                    className="hover:text-[#FFF0A3] hover:underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    {t.footerPurityLink}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={switchToAddSeed}
                    className="hover:text-[#FFF0A3] hover:underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    {t.addSeedBtn}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with Privacy Policy & Terms of Service */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#A5B89B]">
            <p>{t.footerCopyright}</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setActiveInfoTopic('privacy')}
                className="hover:text-[#FFF0A3] hover:underline underline-offset-4 transition-colors cursor-pointer"
              >
                {t.footerPrivacyLink}
              </button>
              <button
                type="button"
                onClick={() => setActiveInfoTopic('terms')}
                className="hover:text-[#FFF0A3] hover:underline underline-offset-4 transition-colors cursor-pointer"
              >
                {t.footerTermsLink}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        lang={lang}
        currentUser={authUser}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleAuthLoginSuccess}
        onLogout={handleAuthLogout}
        onOpenMyProfile={() => openFarmerProfile(myProfile.id)}
        onOpenSellSeed={switchToAddSeed}
        onOpenShopDashboard={switchToShopkeeperDashboard}
        onOpenAdminPanel={switchToAdminShops}
      />

      <WhatsAppModal
        key={
          activeWhatsAppSeed?.id ??
          activeWhatsAppFarmer?.id ??
          'wa-closed'
        }
        seed={activeWhatsAppSeed}
        farmer={activeWhatsAppFarmer}
        lang={lang}
        onClose={() => {
          setActiveWhatsAppSeed(null);
          setActiveWhatsAppFarmer(null);
        }}
      />

      <InfoModal
        topic={activeInfoTopic}
        lang={lang}
        onClose={() => setActiveInfoTopic(null)}
      />
    </div>
  );
}
