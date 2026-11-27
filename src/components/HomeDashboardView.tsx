import { useMemo } from 'react';
import {
  Apple,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Compass,
  Flower2,
  Heart,
  LayoutGrid,
  Leaf,
  MapPin,
  MessageSquareText,
  Mic,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  Store,
  TrendingUp,
  User,
  Users,
  Wheat,
} from 'lucide-react';
import {
  CATEGORIES,
  HERO_IMAGE_URL,
  UI_COPY,
  WHEAT_HERO_IMAGE_URL,
} from '../data/seeds';
import {
  CategoryId,
  DiaryPost,
  FarmerProfile,
  Language,
  SeedItem,
  SeedReview,
} from '../types';
import { SeedCard } from './SeedCard';

interface HomeDashboardViewProps {
  lang: Language;
  seeds: SeedItem[];
  profiles: FarmerProfile[];
  reviewsBySeed: Record<string, SeedReview[]>;
  wishlistIds: string[];
  diaryPosts: DiaryPost[];
  commissionShopsCount: number;
  isAuthenticated: boolean;
  onToggleSave: (seedId: string) => void;
  onSelectSeed: (seed: SeedItem, focusChat?: boolean) => void;
  onSelectOwner: (seed: SeedItem) => void;
  onSelectProfile: (profileId: string) => void;
  onContactWhatsApp: (seed: SeedItem) => void;
  onOpenMarketplace: () => void;
  onOpenSeedSale: () => void;
  onOpenSeedExchange: () => void;
  onSelectCategory: (category: CategoryId) => void;
  onOpenAddSeed: () => void;
  onOpenDiary: () => void;
  onOpenFarmers: () => void;
  onOpenNearby: () => void;
  onOpenChatHub: () => void;
  onOpenRatings: () => void;
  onOpenCommissionShop: () => void;
  onOpenWishlist: () => void;
  onOpenMyProfile: () => void;
  onOpenAuth: () => void;
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

export function HomeDashboardView({
  lang,
  seeds,
  profiles,
  reviewsBySeed,
  wishlistIds,
  diaryPosts,
  commissionShopsCount,
  isAuthenticated,
  onToggleSave,
  onSelectSeed,
  onSelectOwner,
  onSelectProfile,
  onContactWhatsApp,
  onOpenMarketplace,
  onOpenSeedSale,
  onOpenSeedExchange,
  onSelectCategory,
  onOpenAddSeed,
  onOpenDiary,
  onOpenFarmers,
  onOpenNearby,
  onOpenChatHub,
  onOpenRatings,
  onOpenCommissionShop,
  onOpenWishlist,
  onOpenMyProfile,
  onOpenAuth,
}: HomeDashboardViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

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

  const stats = useMemo(() => {
    const uniqueSellerKeys = new Set(
      seeds.map((s) => s.ownerId || s.ownerEn || s.ownerUr)
    );
    const totalCompletedOrders = profiles.reduce(
      (sum, p) => sum + (p.completedExchanges || 0),
      0
    );
    return {
      totalSeeds: seeds.length,
      registeredFarmers: profiles.length,
      activeSellers: uniqueSellerKeys.size + commissionShopsCount,
      completedOrders: totalCompletedOrders,
    };
  }, [seeds, profiles, commissionShopsCount]);

  const getSeedRatingMeta = (seedId: string) => {
    const list = reviewsBySeed[seedId] || [];
    const avg =
      list.length > 0
        ? list.reduce((sum, r) => sum + r.rating, 0) / list.length
        : null;
    return { avg, count: list.length };
  };

  const featuredSeeds = useMemo(() => {
    return [...seeds]
      .sort((a, b) => {
        const ra = reviewsBySeed[a.id] || [];
        const rb = reviewsBySeed[b.id] || [];
        const avgA =
          ra.length > 0
            ? ra.reduce((s, r) => s + r.rating, 0) / ra.length
            : 0;
        const avgB =
          rb.length > 0
            ? rb.reduce((s, r) => s + r.rating, 0) / rb.length
            : 0;
        return avgB - avgA || rb.length - ra.length;
      })
      .slice(0, 3);
  }, [seeds, reviewsBySeed]);

  const bestSellingSeeds = useMemo(() => {
    const saleSeeds = seeds.filter((s) => s.listingType === 'sale');
    return (saleSeeds.length > 0 ? saleSeeds : seeds).slice(0, 3);
  }, [seeds]);

  const latestSeeds = useMemo(() => {
    return [...seeds].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  }, [seeds]);

  const featuredFarmers = useMemo(() => {
    return profiles
      .map((profile) => {
        const farmerSeeds = seeds.filter(
          (s) => s.ownerId === profile.id || s.ownerUr === profile.nameUr
        );
        let sum = 0;
        let count = 0;
        for (const s of farmerSeeds) {
          const revs = reviewsBySeed[s.id] || [];
          for (const r of revs) {
            sum += r.rating;
            count += 1;
          }
        }
        const avg = count > 0 ? sum / count : null;
        return {
          profile,
          seedsCount: farmerSeeds.length,
          avg,
          count,
          isTrusted: avg !== null && avg >= 4.5,
        };
      })
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
      .slice(0, 3);
  }, [profiles, seeds, reviewsBySeed]);

  const recentReviews = useMemo(() => {
    const flat: Array<{ review: SeedReview; seed: SeedItem }> = [];
    for (const seed of seeds) {
      const list = reviewsBySeed[seed.id] || [];
      for (const review of list) {
        flat.push({ review, seed });
      }
    }
    return flat
      .sort((a, b) => b.review.createdAt - a.review.createdAt)
      .slice(0, 3);
  }, [seeds, reviewsBySeed]);

  const featureCards = [
    {
      id: 'quality-seeds',
      Icon: Sprout,
      title: isUrdu ? 'خالص اور معیاری بیج' : 'Quality Seeds',
      desc: isUrdu
        ? 'غیر ترمیم شدہ، خالص دیسی بیج جن کی اُگاؤ کی شرح کسانوں سے تصدیق شدہ ہے۔'
        : 'Lab-free, open-pollinated heirloom seeds verified by growers for germination and purity.',
      onClick: onOpenSeedSale,
    },
    {
      id: 'trusted-sellers',
      Icon: BadgeCheck,
      title: isUrdu ? 'قابلِ اعتماد کسان' : 'Trusted Sellers',
      desc: isUrdu
        ? 'پاکستان بھر کے تصدیق شدہ کسان، بیج محافظ اور غلہ منڈی آڑھتی۔'
        : 'Verified regional farmers, seed keepers, and trusted mandi sellers with transparent reviews.',
      onClick: onOpenFarmers,
    },
    {
      id: 'crop-protection',
      Icon: ShieldCheck,
      title: isUrdu ? 'فصل کا قدرتی تحفظ' : 'Crop Protection',
      desc: isUrdu
        ? 'کسان ڈائری میں نیم، لہسن اور دیسی کھاد سے فصل بچانے کے آزمودہ طریقے۔'
        : 'Organic pest protection notes, neem sprays, and compost methods shared in Kisan Diary.',
      onClick: onOpenDiary,
    },
    {
      id: 'agri-innovation',
      Icon: Compass,
      title: isUrdu ? 'جدید زرعی رابطہ' : 'Agricultural Innovation',
      desc: isUrdu
        ? 'GPS فاصلہ فلٹر، ایپ وائس چیٹ اور براہِ راست کسان سے کسان تبادلہ۔'
        : 'GPS distance matching, voice-note messaging, and zero-middleman digital exchange.',
      onClick: onOpenChatHub,
    },
  ];

  const quickEcosystemTools = [
    {
      id: 'exchange',
      Icon: RefreshCw,
      label: isUrdu ? 'بیجوں کا تبادلہ' : 'Seed Exchange',
      meta: isUrdu ? 'براہِ راست' : 'Direct Swap',
      onClick: onOpenSeedExchange,
    },
    {
      id: 'chat',
      Icon: Mic,
      label: t.navChatHub,
      meta: isUrdu ? 'وائس اور ٹیکسٹ' : 'Voice & Text',
      onClick: onOpenChatHub,
    },
    {
      id: 'mandi',
      Icon: Store,
      label: t.navCommissionShop,
      meta: `${commissionShopsCount} ${isUrdu ? 'شاپس' : 'Shops'}`,
      onClick: onOpenCommissionShop,
    },
    {
      id: 'nearby',
      Icon: MapPin,
      label: t.navNearby,
      meta: isUrdu ? 'GPS و نقشہ' : 'GPS & Maps',
      onClick: onOpenNearby,
    },
    {
      id: 'diary',
      Icon: BookOpen,
      label: t.navKisanDiary,
      meta: `${diaryPosts.length} ${isUrdu ? 'تحریریں' : 'Entries'}`,
      onClick: onOpenDiary,
    },
    {
      id: 'wishlist',
      Icon: Heart,
      label: t.navWishlist,
      meta: `${wishlistIds.length} ${isUrdu ? 'محفوظ' : 'Saved'}`,
      onClick: onOpenWishlist,
    },
  ];

  const whyChoosePillars = [
    {
      Icon: Wheat,
      title: isUrdu ? '۱۰۰٪ خالص غیر ہائبرڈ بیج' : '100% Pure Non-GMO Heritage',
      desc: isUrdu
        ? 'مقامی آب و ہوا کے عادی بیج جو اگلی فصل کے لیے دوبارہ محفوظ کیے جا سکتے ہیں۔'
        : 'Climate-resilient landrace seeds you can save and replant season after season.',
    },
    {
      Icon: MessageSquareText,
      title: isUrdu ? 'وائس نوٹس اور محفوظ چیٹ' : 'Voice Notes & Privacy Control',
      desc: isUrdu
        ? 'اپنا فون نمبر چھپائیں اور ایپ میں اردو وائس میسج یا ٹیکسٹ چیٹ کے ذریعے بات کریں۔'
        : 'Keep your phone number private and talk via built-in voice messages or text chat.',
    },
    {
      Icon: MapPin,
      title: isUrdu ? 'قریبی کسانوں تک رسائی' : 'Hyper-Local GPS Discovery',
      desc: isUrdu
        ? 'اپنے ضلع یا 25 سے 250 کلومیٹر کے دائرے میں دستیاب بیج اور منڈی ریٹس دیکھیں۔'
        : 'Locate nearby seed keepers within 25–250 km while protecting exact farm coordinates.',
    },
    {
      Icon: Award,
      title: isUrdu ? 'بغیر کمیشن کسان نیٹ ورک' : 'Zero-Middleman Pricing',
      desc: isUrdu
        ? 'براہِ راست کاشتکار سے خریداری یا تبادلہ، شفاف ریٹنگ اور تصدیق شدہ آراء کے ساتھ۔'
        : 'Fair grower-direct pricing and verified community ratings with no unnecessary markups.',
    },
  ];

  return (
    <div className="bg-[#102B19] text-[#F8F7EA]">
      {/* 1. FULL-WIDTH GOLDEN WHEAT HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[#E5C65A]/20">
        {/* Background Wheat Image + Deep Forest Green Overlay */}
        <img
          src={WHEAT_HERO_IMAGE_URL}
          alt={
            isUrdu
              ? 'سنہری گندم کے کھیت کا خوبصورت منظر'
              : 'Golden ripe wheat field at sunrise'
          }
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#102B19]/85 via-[#102B19]/78 to-[#102B19]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#102B19]/92 via-[#102B19]/70 to-[#263B20]/45"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Hero Typography Column */}
            <div className="lg:col-span-7 space-y-5 animate-agri-fade-up">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#263B20]/85 backdrop-blur-md border border-[#E5C65A]/35 text-xs sm:text-sm font-semibold text-[#FFF0A3]">
                <Wheat className="w-4 h-4 text-[#E5C65A] shrink-0" aria-hidden="true" />
                <span className="text-[#0c0c0b]">{t.brandName} · Pakistan</span>
              </div>

              <div className="space-y-2">
                <h1
                  className={`font-extrabold text-[#1d1d19] text-balance ${
                    isUrdu
                      ? 'font-urdu-display text-3xl sm:text-5xl leading-[1.65]'
                      : 'font-display-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.06]'
                  }`}
                >
                  {isUrdu ? 'زمین سے جڑی پہچان' : 'Rooted in the Land'}
                </h1>

                <h2
                  className={`font-bold text-[#0f0f0e] ${
                    isUrdu
                      ? 'font-urdu-display text-2xl sm:text-4xl leading-[1.65]'
                      : 'font-display-heading text-2xl sm:text-4xl lg:text-[42px] tracking-tight leading-[1.12]'
                  }`}
                >
                  {isUrdu ? 'جدت اور اعتماد کا سفر' : 'Driven by Innovation'}
                </h2>
              </div>

              <p className="text-base sm:text-lg text-[#141614] leading-relaxed max-w-2xl">
                {isUrdu
                  ? 'کسانوں، کاشتکاروں اور خالص دیسی بیج فراہم کرنے والوں کو ایک قابلِ اعتماد زرعی منڈی کے ذریعے براہِ راست جوڑنے والا پلیٹ فارم۔'
                  : 'Connecting farmers, growers and seed suppliers through a trusted agricultural marketplace.'}
              </p>

              {/* Two Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenMarketplace}
                  className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold shadow-lg shadow-black/25 transition-all hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0A3]"
                >
                  <Sprout className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{isUrdu ? 'بیج دیکھیں' : 'Explore Seeds'}</span>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 ${isUrdu ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={onOpenAddSeed}
                  className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#263B20]/80 hover:bg-[#2F4827] backdrop-blur-md border border-[#E5C65A]/50 text-[#FFF0A3] text-sm sm:text-base font-bold transition-all hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
                >
                  <Plus className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{isUrdu ? 'اپنے بیج فروخت کریں' : 'Sell Your Seeds'}</span>
                </button>
              </div>

              {/* Subtle Trust Strip */}
              <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckDot />
                  {t.heroTrust1}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckDot />
                  {t.heroTrust2}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckDot />
                  {t.heroTrust3}
                </span>
              </div>
            </div>

            {/* Large Framed Golden Wheat Visual */}
            <div className="lg:col-span-5 animate-agri-fade-up-delay">
              <div className="relative rounded-3xl overflow-hidden border border-[#E5C65A]/35 bg-[#183822]/70 backdrop-blur-md p-2.5 shadow-2xl shadow-black/45">
                <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/4] rounded-2xl overflow-hidden">
                  <img
                    src={WHEAT_HERO_IMAGE_URL}
                    alt={
                      isUrdu
                        ? 'سنہری گندم کی بالیاں'
                        : 'Golden wheat ears ready for heirloom seed harvest'
                    }
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102B19]/90 via-transparent to-transparent" />

                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#102B19]/80 backdrop-blur-md border border-[#E5C65A]/30">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#E5C65A] uppercase tracking-wider">
                        {isUrdu ? 'پاکستان دیسی نیٹ ورک' : 'Heirloom Harvest'}
                      </p>
                      <p className="text-sm sm:text-base font-bold text-[#FFF0A3] truncate">
                        {isUrdu
                          ? `${stats.totalSeeds} خالص دیسی بیج دستیاب`
                          : `${stats.totalSeeds} Pure Seeds Listed`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenMyProfile}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {t.navMyProfile}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. FOUR GLASSMORPHISM FEATURE CARDS */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {featureCards.map((card) => {
              const Icon = card.Icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  className="group agri-glass rounded-2xl p-5 sm:p-6 text-start transition-all duration-200 hover:-translate-y-1 hover:border-[#E5C65A]/65 hover:shadow-xl hover:shadow-black/35 flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#FFF0A3] text-[#102B19] flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#F8F7EA] group-hover:text-[#FFF0A3] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#C7D3BD] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. STATISTICS SECTION (4 GOLDEN-ACCENTED CARDS) */}
      <section
        aria-label={isUrdu ? 'اعداد و شمار' : 'Marketplace Statistics'}
        className="bg-[#263B20]/45 border-b border-[#E5C65A]/15"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {(
              [
                {
                  Icon: Sprout,
                  value: stats.totalSeeds,
                  label: isUrdu ? 'کل دستیاب بیج' : 'Total Seed Products',
                  sub: isUrdu ? 'خالص دیسی اقسام' : 'Heirloom Varieties',
                },
                {
                  Icon: Users,
                  value: stats.registeredFarmers,
                  label: isUrdu ? 'رجسٹرڈ کسان' : 'Registered Farmers',
                  sub: isUrdu ? 'تصدیق شدہ محافظ' : 'Verified Growers',
                },
                {
                  Icon: Store,
                  value: stats.activeSellers,
                  label: isUrdu ? 'فعال فروخت کنندگان' : 'Active Sellers',
                  sub: isUrdu ? 'کسان و کمیشن شاپس' : 'Growers & Mandi Shops',
                },
                {
                  Icon: PackageCheck,
                  value: stats.completedOrders,
                  label: isUrdu ? 'مکمل تبادلے و آرڈرز' : 'Completed Orders',
                  sub: isUrdu ? 'کامیاب ترسیلات' : 'Verified Exchanges',
                },
              ] as const
            ).map((stat) => {
              const StatIcon = stat.Icon;
              return (
                <div
                  key={stat.label}
                  className="agri-glass-elevated rounded-2xl p-5 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E5C65A]/15 border border-[#E5C65A]/35 text-[#FFF0A3] flex items-center justify-center shrink-0">
                    <StatIcon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#FFF0A3] tabular-nums">
                      {stat.value}+
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#F8F7EA] truncate">
                      {stat.label}
                    </div>
                    <div className="text-[11px] text-[#B7C7AC] truncate">
                      {stat.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Platform Ecosystem Access Strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickEcosystemTools.map((tool) => {
              const ToolIcon = tool.Icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={tool.onClick}
                  className="agri-glass rounded-xl px-3.5 py-3 text-start hover:border-[#E5C65A]/60 transition-all flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#FFF0A3]/15 text-[#FFF0A3] flex items-center justify-center shrink-0">
                    <ToolIcon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#F8F7EA] truncate">
                      {tool.label}
                    </div>
                    <div className="text-[11px] text-[#E5C65A] truncate">
                      {tool.meta}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. POPULAR CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
              {isUrdu ? 'اقسام کے مطابق تلاش' : 'Browse by Crop'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
              {isUrdu ? 'مقبول زرعی اقسام' : 'Popular Categories'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenMarketplace}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] cursor-pointer"
          >
            <span>{isUrdu ? 'تمام بیج دیکھیں' : 'View All Marketplace'}</span>
            <ArrowRight
              className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat.id);
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="group agri-glass rounded-2xl p-4 text-start hover:border-[#E5C65A]/70 hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF0A3] text-[#102B19] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-md bg-[#102B19]/70 text-[#E5C65A] border border-[#E5C65A]/25">
                    {count}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-bold text-[#F8F7EA] group-hover:text-[#FFF0A3] transition-colors">
                  {isUrdu ? cat.ur : cat.en}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. FEATURED SEEDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
              <Star className="w-3.5 h-3.5 fill-[#E5C65A]" aria-hidden="true" />
              {isUrdu ? 'اعلیٰ ریٹنگ یافتہ' : 'Top Rated Heirloom Stock'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
              {isUrdu ? 'نمایاں دیسی بیج' : 'Featured Seeds'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenMarketplace}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] cursor-pointer"
          >
            <span>{isUrdu ? 'مزید دیکھیں' : 'Explore All'}</span>
            <ArrowRight
              className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSeeds.map((seed) => {
            const { avg, count } = getSeedRatingMeta(seed.id);
            return (
              <SeedCard
                key={`featured-${seed.id}`}
                seed={seed}
                lang={lang}
                rating={avg}
                reviewCount={count}
                isSaved={wishlistIds.includes(seed.id)}
                onToggleSave={onToggleSave}
                onSelectSeed={onSelectSeed}
                onSelectOwner={onSelectOwner}
                onContactWhatsApp={onContactWhatsApp}
              />
            );
          })}
        </div>
      </section>

      {/* 6. BEST SELLING SEEDS */}
      <section className="bg-[#263B20]/40 border-y border-[#E5C65A]/15 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                {isUrdu ? 'زیادہ طلب والے بیج' : 'Direct From Growers'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
                {isUrdu ? 'سب سے زیادہ فروخت ہونے والے بیج' : 'Best Selling Seeds'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenSeedSale}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] cursor-pointer"
            >
              <span>{isUrdu ? 'فروخت والے بیج دیکھیں' : 'View Seeds For Sale'}</span>
              <ArrowRight
                className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bestSellingSeeds.map((seed) => {
              const { avg, count } = getSeedRatingMeta(seed.id);
              return (
                <SeedCard
                  key={`bestselling-${seed.id}`}
                  seed={seed}
                  lang={lang}
                  rating={avg}
                  reviewCount={count}
                  isSaved={wishlistIds.includes(seed.id)}
                  onToggleSave={onToggleSave}
                  onSelectSeed={onSelectSeed}
                  onSelectOwner={onSelectOwner}
                  onContactWhatsApp={onContactWhatsApp}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. LATEST SEED LISTINGS & RECENTLY ADDED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
              <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
              {isUrdu ? 'تازہ ترین فہرست اور مصنوعات' : 'Latest Listings · Recently Added Products'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
              {isUrdu
                ? 'تازہ ترین بیج اور حالیہ شامل کردہ مصنوعات'
                : 'Latest Seed Listings & Recently Added'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenAddSeed}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t.addSeedBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestSeeds.map((seed) => {
            const { avg, count } = getSeedRatingMeta(seed.id);
            return (
              <SeedCard
                key={`latest-${seed.id}`}
                seed={seed}
                lang={lang}
                rating={avg}
                reviewCount={count}
                isSaved={wishlistIds.includes(seed.id)}
                onToggleSave={onToggleSave}
                onSelectSeed={onSelectSeed}
                onSelectOwner={onSelectOwner}
                onContactWhatsApp={onContactWhatsApp}
              />
            );
          })}
        </div>
      </section>

      {/* 8. WHY CHOOSE DESI BEEJ EXCHANGE? */}
      <section className="bg-[#263B20]/45 border-y border-[#E5C65A]/15 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="rounded-3xl overflow-hidden border border-[#E5C65A]/30 bg-[#183822] p-2 shadow-xl shadow-black/30">
                <img
                  src={HERO_IMAGE_URL}
                  alt={
                    isUrdu
                      ? 'مٹی کے پیالوں میں خالص دیسی بیج'
                      : 'Traditional heirloom seeds displayed in woven baskets and bowls'
                  }
                  className="w-full aspect-[4/3] object-cover rounded-2xl"
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
                  {isUrdu ? 'ہمارا عزم' : 'Built for Farmers'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
                  {isUrdu
                    ? 'دیسی بیج ایکسچینج ہی کیوں منتخب کریں؟'
                    : 'Why Choose Desi Beej Exchange?'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {whyChoosePillars.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <div
                      key={item.title}
                      className="agri-glass rounded-2xl p-4 sm:p-5 space-y-2"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#FFF0A3] text-[#102B19] flex items-center justify-center">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <h3 className="text-base font-bold text-[#F8F7EA]">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#C7D3BD] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-2xl mx-auto mb-9">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
            {isUrdu ? 'آسان مراحل' : 'Simple Process'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
            {t.howTitle}
          </h2>
          <p className="text-sm sm:text-base text-[#C7D3BD] mt-2">
            {t.howSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.steps.map((step, idx) => {
            const StepIcon =
              idx === 0 ? Plus : idx === 1 ? MessageSquareText : Sprout;
            return (
              <div
                key={step.num}
                className="agri-glass-elevated rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold text-[#E5C65A] tabular-nums">
                    {step.num}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-[#FFF0A3] text-[#102B19] flex items-center justify-center">
                    <StepIcon className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#F8F7EA]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#C7D3BD] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. FEATURED FARMERS & CUSTOMER REVIEWS */}
      <section className="bg-[#263B20]/40 border-y border-[#E5C65A]/15 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Featured Farmers */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
                  {isUrdu ? 'بیج محافظ کسان' : 'Verified Community Growers'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
                  {isUrdu ? 'نمایاں کسان' : 'Featured Farmers'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenFarmers}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] cursor-pointer"
              >
                <span>{isUrdu ? 'تمام کسان دیکھیں' : 'All Farmers'}</span>
                <ArrowRight
                  className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredFarmers.map(
                ({ profile, seedsCount, avg, count, isTrusted }) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onSelectProfile(profile.id)}
                    className="agri-glass rounded-2xl p-5 text-start hover:border-[#E5C65A]/65 transition-all flex flex-col justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF0A3] text-[#102B19] flex items-center justify-center shrink-0 overflow-hidden">
                        {profile.avatarUrl ? (
                          <img
                            src={profile.avatarUrl}
                            alt={isUrdu ? profile.nameUr : profile.nameEn}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-[#F8F7EA] truncate">
                          {isUrdu ? profile.nameUr : profile.nameEn}
                        </h3>
                        <p className="text-xs text-[#E5C65A] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isUrdu ? profile.cityUr : profile.cityEn}
                          </span>
                        </p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#C7D3BD] line-clamp-2 leading-relaxed">
                      {isUrdu ? profile.bioUr : profile.bioEn}
                    </p>

                    <div className="pt-3 border-t border-[#E5C65A]/15 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#FFF0A3] tabular-nums">
                        {seedsCount} {isUrdu ? 'بیج' : 'Seeds'} ·{' '}
                        {profile.completedExchanges}{' '}
                        {isUrdu ? 'تبادلے' : 'Orders'}
                      </span>

                      <div className="flex items-center gap-2">
                        {avg !== null && (
                          <span className="inline-flex items-center gap-1 font-bold text-[#FFF0A3] tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-[#E5C65A] text-[#E5C65A]" />
                            {avg.toFixed(1)} ({count})
                          </span>
                        )}
                        {isTrusted && (
                          <BadgeCheck
                            className="w-4 h-4 text-[#E5C65A]"
                            aria-label={t.trustedFarmerBadge}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Customer Reviews */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
                  {isUrdu ? 'کسانوں کی آراء' : 'Verified Germination Feedback'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] mt-1 font-display-heading">
                  {isUrdu ? 'صارفین کی رائے اور ریٹنگز' : 'Customer Reviews'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenRatings}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] cursor-pointer"
              >
                <span>{isUrdu ? 'ریٹنگز اور رائے دیں' : 'All Ratings & Reviews'}</span>
                <ArrowRight
                  className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recentReviews.map(({ review, seed }) => (
                <article
                  key={review.id}
                  onClick={() => onSelectSeed(seed)}
                  className="agri-glass rounded-2xl p-5 space-y-3 hover:border-[#E5C65A]/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= review.rating
                              ? 'text-[#E5C65A] fill-[#E5C65A]'
                              : 'text-[#44633B]'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                    <span className="text-xs text-[#B7C7AC]">
                      {isUrdu ? review.dateLabelUr : review.dateLabelEn}
                    </span>
                  </div>

                  <p
                    dir="auto"
                    className="text-sm text-[#F8F7EA] leading-relaxed line-clamp-3"
                  >
                    “{review.comment}”
                  </p>

                  <div className="pt-2 border-t border-[#E5C65A]/15 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#FFF0A3] truncate">
                      {review.reviewerName}
                    </span>
                    <span className="text-[#E5C65A] truncate">
                      {isUrdu ? seed.nameUr : seed.nameEn}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 11. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="relative rounded-3xl overflow-hidden border border-[#E5C65A]/35 bg-gradient-to-br from-[#263B20] via-[#183822] to-[#102B19] p-7 sm:p-10 lg:p-12 shadow-2xl shadow-black/35">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E5C65A]">
                <Wheat className="w-4 h-4" aria-hidden="true" />
                {t.brandName}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FFF0A3] font-display-heading">
                {isUrdu
                  ? 'آج ہی خالص دیسی بیج نیٹ ورک میں شامل ہوں'
                  : 'Ready to Grow & Trade Pure Desi Seeds?'}
              </h2>
              <p className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
                {isUrdu
                  ? 'اپنا دیسی بیج درج کریں، قریبی کسانوں سے رابطہ کریں اور کسان ڈائری میں اپنے تجربات بانٹیں۔'
                  : 'List your harvest in seconds, connect directly with verified Pakistani growers, and protect native seed biodiversity.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenMarketplace}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
              >
                {isUrdu ? 'بیج دیکھیں' : 'Explore Seeds'}
              </button>
              <button
                type="button"
                onClick={onOpenAddSeed}
                className="min-h-[46px] px-5 py-2.5 rounded-xl border border-[#E5C65A]/50 bg-[#102B19]/70 hover:bg-[#102B19] text-[#FFF0A3] text-sm font-bold transition-colors cursor-pointer"
              >
                {isUrdu ? 'اپنے بیج فروخت کریں' : 'Sell Your Seeds'}
              </button>
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="min-h-[46px] px-5 py-2.5 rounded-xl border border-[#4E7143] bg-[#263B20]/80 hover:bg-[#263B20] text-[#F8F7EA] text-sm font-semibold transition-colors cursor-pointer"
                >
                  {t.navLoginSignup}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckDot() {
  return (
    <span
      className="w-2 h-2 rounded-full bg-[#E5C65A] shrink-0"
      aria-hidden="true"
    />
  );
}
