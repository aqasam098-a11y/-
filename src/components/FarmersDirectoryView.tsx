import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Compass,
  Home,
  Lock,
  MapPin,
  MessageCircle,
  Search,
  Sprout,
  Star,
  User,
  Users,
} from 'lucide-react';
import { getCityCoords, PAKISTANI_CITIES, UI_COPY } from '../data/seeds';
import {
  DiaryPost,
  FarmerProfile,
  Language,
  SeedItem,
  SeedReview,
} from '../types';
import { calculateDistanceKm } from '../utils/media';

interface FarmersDirectoryViewProps {
  lang: Language;
  profiles: FarmerProfile[];
  myProfile: FarmerProfile;
  seeds: SeedItem[];
  diaryPosts: DiaryPost[];
  reviewsBySeed: Record<string, SeedReview[]>;
  userCoords: { lat: number; lng: number } | null;
  referenceCity: string;
  onSetUserCoords: (coords: { lat: number; lng: number } | null) => void;
  onSetReferenceCity: (cityEn: string) => void;
  onBackHome: () => void;
  onSelectProfile: (profileId: string) => void;
  onContactWhatsAppProfile: (profile: FarmerProfile) => void;
}

export function FarmersDirectoryView({
  lang,
  profiles,
  myProfile,
  seeds,
  diaryPosts,
  reviewsBySeed,
  userCoords,
  referenceCity,
  onSetUserCoords,
  onSetReferenceCity,
  onBackHome,
  onSelectProfile,
  onContactWhatsAppProfile,
}: FarmersDirectoryViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<'all' | number>('all');
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle'
  );
  const [gpsMessage, setGpsMessage] = useState('');

  const handleUseCurrentGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage(
        isUrdu
          ? 'آپ کا براؤزر GPS لوکیشن کو سپورٹ نہیں کرتا۔ نیچے سے اپنا شہر منتخب کریں۔'
          : 'Geolocation is not supported in this browser. Please select a reference city below.'
      );
      return;
    }

    setGpsStatus('loading');
    setGpsMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSetUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsStatus('idle');
        setGpsMessage(
          isUrdu
            ? 'آپ کا موجودہ GPS مقام حاصل کر لیا گیا ہے۔'
            : 'Using your current GPS location.'
        );
      },
      () => {
        setGpsStatus('error');
        setGpsMessage(
          isUrdu
            ? 'GPS مقام تک رسائی نہیں ملی؛ براہِ کرم اپنا قریبی شہر منتخب کریں۔'
            : 'Location permission denied; please pick a reference city.'
        );
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  const activeOriginCoords = useMemo(() => {
    if (userCoords) return userCoords;
    return getCityCoords(referenceCity);
  }, [userCoords, referenceCity]);

  const enrichedProfiles = useMemo(() => {
    return profiles.map((p) => {
      const farmerSeeds = seeds.filter(
        (s) => s.ownerId === p.id || s.ownerUr === p.nameUr
      );
      const farmerDiary = diaryPosts.filter(
        (d) => d.ownerId === p.id || d.authorUr === p.nameUr
      );

      let ratingSum = 0;
      let ratingCount = 0;
      for (const s of farmerSeeds) {
        const revs = reviewsBySeed[s.id] || [];
        for (const r of revs) {
          ratingSum += r.rating;
          ratingCount += 1;
        }
      }

      const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null;
      const isTrusted = avgRating !== null && avgRating >= 4.5;

      const cityCenter = getCityCoords(p.cityEn || p.cityUr);
      const targetCoords =
        !p.hideExactLocation && p.lat !== undefined && p.lng !== undefined
          ? { lat: p.lat, lng: p.lng }
          : cityCenter;

      const distanceKm = calculateDistanceKm(
        activeOriginCoords.lat,
        activeOriginCoords.lng,
        targetCoords.lat,
        targetCoords.lng
      );

      return {
        profile: p,
        seedsCount: farmerSeeds.length,
        diaryCount: farmerDiary.length,
        avgRating,
        ratingCount,
        isTrusted,
        distanceKm,
      };
    });
  }, [profiles, seeds, diaryPosts, reviewsBySeed, activeOriginCoords]);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedProfiles
      .filter((item) => {
        const p = item.profile;
        const matchesCity =
          selectedCity === 'all' ||
          p.cityUr === selectedCity ||
          p.cityEn === selectedCity;
        const matchesTrusted = !trustedOnly || item.isTrusted;
        const matchesDistance =
          maxDistanceKm === 'all' || item.distanceKm <= maxDistanceKm;
        const matchesQuery =
          !q ||
          p.nameUr.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.cityUr.toLowerCase().includes(q) ||
          p.cityEn.toLowerCase().includes(q) ||
          p.bioUr.toLowerCase().includes(q) ||
          p.bioEn.toLowerCase().includes(q);
        return matchesCity && matchesTrusted && matchesDistance && matchesQuery;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [enrichedProfiles, query, selectedCity, trustedOnly, maxDistanceKm]);

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      {/* Header Banner */}
      <section className="border-b border-[#E5C65A]/20 bg-gradient-to-b from-[#263B20]/70 to-[#102B19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-5">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label={isUrdu ? 'بریڈ کرمب' : 'Breadcrumb'}>
              <ol className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
                <li>
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="inline-flex items-center gap-1.5 text-[#FFF0A3] hover:underline font-semibold cursor-pointer"
                  >
                    <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.breadcrumbHome}</span>
                  </button>
                </li>
                <li aria-hidden="true" className="text-[#E5C65A]/60">
                  &gt;
                </li>
                <li className="text-[#F8F7EA] font-semibold">
                  {t.navFarmers}
                </li>
              </ol>
            </nav>

            <button
              type="button"
              onClick={() => onSelectProfile(myProfile.id)}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isUrdu
                  ? 'میری پروفائل اور رازداری سیٹنگز'
                  : 'My Profile & Privacy Settings'}
              </span>
            </button>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#E5C65A] mb-1.5">
              <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isUrdu
                  ? 'پاکستان بھر کے بیج محافظ اور قریبی کسان'
                  : 'Verified Seed Keepers & Nearby Growers'}
              </span>
            </div>
            <h1
              className={`font-bold text-[#FFF0A3] ${
                isUrdu
                  ? 'font-urdu-display text-2xl sm:text-3xl lg:text-4xl leading-[2.05]'
                  : 'font-display-heading text-3xl sm:text-4xl font-bold tracking-tight'
              }`}
            >
              {isUrdu
                ? 'کسان پروفائلز اور قریبی کسان'
                : 'Kisan Profiles & Nearby Farmers'}
            </h1>
            <p className="text-sm sm:text-base text-[#D7E2CE] mt-1.5 leading-relaxed">
              {isUrdu
                ? 'اپنے قریبی شہر یا GPS فاصلے کے حساب سے کسان تلاش کریں، ان کے دستیاب بیج، کسان ڈائری اور ریٹنگز دیکھیں۔'
                : 'Discover nearby farmers by city or GPS radius, check trust ratings, and inspect their available heirloom seeds.'}
            </p>
          </div>

          {/* Search & Nearby Distance Controls */}
          <div className="agri-glass-elevated rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Name/Keyword */}
              <div className="sm:col-span-5 relative">
                <Search
                  className={`w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                    isUrdu ? 'right-3.5' : 'left-3.5'
                  }`}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    isUrdu
                      ? 'کسان کا نام یا علاقہ تلاش کریں...'
                      : 'Search farmer name or specialty...'
                  }
                  className={`w-full min-h-[44px] py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A] ${
                    isUrdu ? 'pr-10 pl-3' : 'pl-10 pr-3'
                  }`}
                />
              </div>

              {/* City Filter */}
              <div className="sm:col-span-3 relative">
                <MapPin
                  className={`w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                    isUrdu ? 'right-3.5' : 'left-3.5'
                  }`}
                  aria-hidden="true"
                />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  aria-label={isUrdu ? 'شہر فلٹر' : 'City filter'}
                  className={`w-full min-h-[44px] py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A] ${
                    isUrdu ? 'pr-10 pl-3' : 'pl-10 pr-3'
                  }`}
                >
                  <option value="all">{t.searchCityDefault}</option>
                  {PAKISTANI_CITIES.map((c) => (
                    <option key={c.en} value={c.en}>
                      {isUrdu ? c.ur : c.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distance Filter */}
              <div className="sm:col-span-4 relative">
                <Compass
                  className={`w-4 h-4 text-[#E5C65A] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                    isUrdu ? 'right-3.5' : 'left-3.5'
                  }`}
                  aria-hidden="true"
                />
                <select
                  value={maxDistanceKm === 'all' ? 'all' : String(maxDistanceKm)}
                  onChange={(e) =>
                    setMaxDistanceKm(
                      e.target.value === 'all' ? 'all' : Number(e.target.value)
                    )
                  }
                  aria-label={isUrdu ? 'فاصلہ فلٹر' : 'Distance filter'}
                  className={`w-full min-h-[44px] py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A] ${
                    isUrdu ? 'pr-10 pl-3' : 'pl-10 pr-3'
                  }`}
                >
                  <option value="all">{t.nearbyAllDistances}</option>
                  <option value="25">
                    {isUrdu ? '25 کلومیٹر کے اندر' : 'Within 25 km'}
                  </option>
                  <option value="50">
                    {isUrdu ? '50 کلومیٹر کے اندر' : 'Within 50 km'}
                  </option>
                  <option value="100">
                    {isUrdu ? '100 کلومیٹر کے اندر' : 'Within 100 km'}
                  </option>
                  <option value="250">
                    {isUrdu ? '250 کلومیٹر کے اندر' : 'Within 250 km'}
                  </option>
                </select>
              </div>
            </div>

            {/* GPS Location Row + Reference City + Trusted Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5C65A]/15">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={gpsStatus === 'loading'}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#263B20] hover:bg-[#314C29] border border-[#E5C65A]/35 text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer disabled:opacity-60"
                >
                  <Compass className="w-4 h-4 text-[#E5C65A] shrink-0" aria-hidden="true" />
                  <span>
                    {gpsStatus === 'loading'
                      ? isUrdu
                        ? 'مقام تلاش کیا جا رہا ہے...'
                        : 'Detecting GPS...'
                      : t.useMyGpsBtn}
                  </span>
                </button>

                <div className="inline-flex items-center gap-1.5 text-xs text-[#C7D3BD]">
                  <span>
                    {userCoords
                      ? isUrdu
                        ? 'یا شہر منتخب کریں:'
                        : 'or city:'
                      : isUrdu
                        ? 'مرکزی شہر:'
                        : 'From city:'}
                  </span>
                  <select
                    value={userCoords ? 'gps' : referenceCity}
                    onChange={(e) => {
                      if (e.target.value !== 'gps') {
                        onSetUserCoords(null);
                        onSetReferenceCity(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0D2314] border border-[#44633B] text-xs font-semibold text-[#F8F7EA]"
                  >
                    {userCoords && (
                      <option value="gps">
                        {isUrdu ? 'موجودہ GPS مقام' : 'Current GPS'}
                      </option>
                    )}
                    {PAKISTANI_CITIES.map((c) => (
                      <option key={c.en} value={c.en}>
                        {isUrdu ? c.ur : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={trustedOnly}
                  onChange={(e) => setTrustedOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#E5C65A] rounded"
                />
                <span>{t.trustedFarmerBadge}</span>
              </label>
            </div>

            {gpsMessage && (
              <p
                className={`text-xs font-medium ${
                  gpsStatus === 'error' ? 'text-[#E5C65A]' : 'text-[#FFF0A3]'
                }`}
              >
                {gpsMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Directory Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-2 mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-[#FFF0A3]">
            {isUrdu
              ? `${filteredProfiles.length} کسان پروفائلز دستیاب ہیں`
              : `${filteredProfiles.length} Farmer Profiles`}
          </h2>
        </div>

        {filteredProfiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map(
              ({
                profile: farmer,
                seedsCount,
                diaryCount,
                avgRating,
                ratingCount,
                isTrusted,
                distanceKm,
              }) => {
                const name = isUrdu ? farmer.nameUr : farmer.nameEn;
                const city = isUrdu ? farmer.cityUr : farmer.cityEn;
                const bio = isUrdu ? farmer.bioUr : farmer.bioEn;
                return (
                  <article
                    key={farmer.id}
                    className="agri-glass rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#E5C65A]/60 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Identity Row */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-[#FFF0A3] text-[#102B19] overflow-hidden flex items-center justify-center shrink-0">
                          {farmer.avatarUrl ? (
                            <img
                              src={farmer.avatarUrl}
                              alt={name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-7 h-7" aria-hidden="true" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-base sm:text-lg font-bold text-[#FFF0A3] truncate">
                              {name}
                            </h3>
                            {farmer.isMyProfile && (
                              <span className="px-2 py-0.5 rounded bg-[#263B20] border border-[#E5C65A]/40 text-[11px] font-bold text-[#E5C65A]">
                                {isUrdu ? 'آپ' : 'You'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#C7D3BD] mt-1">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#F8F7EA]">
                              <MapPin className="w-3.5 h-3.5 text-[#E5C65A]" />
                              {city}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#FFF0A3] tabular-nums">
                              <Compass className="w-3.5 h-3.5 text-[#E5C65A]" />
                              {isUrdu
                                ? `~${distanceKm} کلومیٹر`
                                : `~${distanceKm} km`}
                            </span>
                            {farmer.hideExactLocation && (
                              <span
                                title={t.locationPrivacyNotice}
                                className="inline-flex items-center gap-0.5 text-[11px] text-[#E5C65A]"
                              >
                                <Lock className="w-3 h-3" />
                                {isUrdu ? 'صرف شہر' : 'City-only'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {avgRating !== null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#263B20] border border-[#E5C65A]/35 text-xs font-bold text-[#FFF0A3] tabular-nums">
                            <Star className="w-3.5 h-3.5 text-[#E5C65A] fill-[#E5C65A]" />
                            <span>{avgRating.toFixed(1)}</span>
                            <span className="font-normal text-[#C7D3BD]">
                              ({ratingCount})
                            </span>
                          </span>
                        )}
                        {isTrusted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E5C65A]/15 border border-[#E5C65A]/40 text-xs font-semibold text-[#FFF0A3]">
                            <BadgeCheck className="w-3.5 h-3.5 text-[#E5C65A]" />
                            <span>{t.trustedFarmerBadge}</span>
                          </span>
                        )}
                        {farmer.hidePhone && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#102B19] border border-[#44633B] text-xs font-medium text-[#C7D3BD]">
                            <Lock className="w-3 h-3 text-[#E5C65A]" />
                            <span>{isUrdu ? 'نمبر مخفی' : 'Phone hidden'}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-[#D7E2CE] leading-relaxed line-clamp-2">
                        {bio}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[#E5C65A]/15">
                      {/* Compact Stats Row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-[#102B19]/75 border border-[#44633B]/60">
                          <div className="text-sm font-bold text-[#FFF0A3] tabular-nums flex items-center justify-center gap-1">
                            <Sprout className="w-3.5 h-3.5 text-[#E5C65A]" />
                            {seedsCount}
                          </div>
                          <div className="text-[11px] text-[#C7D3BD]">
                            {isUrdu ? 'بیج' : 'Seeds'}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#102B19]/75 border border-[#44633B]/60">
                          <div className="text-sm font-bold text-[#E5C65A] tabular-nums">
                            {farmer.completedExchanges}
                          </div>
                          <div className="text-[11px] text-[#C7D3BD]">
                            {isUrdu ? 'تبادلے' : 'Swaps'}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#102B19]/75 border border-[#44633B]/60">
                          <div className="text-sm font-bold text-[#FFF0A3] tabular-nums flex items-center justify-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-[#E5C65A]" />
                            {diaryCount}
                          </div>
                          <div className="text-[11px] text-[#C7D3BD]">
                            {isUrdu ? 'ڈائری' : 'Diary'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectProfile(farmer.id)}
                          className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                        >
                          <User className="w-4 h-4 shrink-0" />
                          <span>
                            {isUrdu ? 'پروفائل دیکھیں' : 'View Profile'}
                          </span>
                        </button>
                        {!farmer.hidePhone && (
                          <button
                            type="button"
                            onClick={() => onContactWhatsAppProfile(farmer)}
                            title={t.whatsappBtn}
                            aria-label={t.whatsappBtn}
                            className="min-h-[42px] px-3 py-2 rounded-xl border border-[#E5C65A]/45 bg-[#263B20] hover:bg-[#314C29] text-[#FFF0A3] text-xs font-semibold inline-flex items-center justify-center cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="py-12 px-6 rounded-2xl agri-glass text-center max-w-lg mx-auto space-y-3">
            <Users className="w-10 h-10 mx-auto text-[#E5C65A]" />
            <h3 className="text-lg font-bold text-[#FFF0A3]">
              {isUrdu
                ? 'اس فاصلے یا شہر میں کوئی کسان نہیں ملا'
                : 'No farmers matched your filters'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCity('all');
                setMaxDistanceKm('all');
                setTrustedOnly(false);
              }}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
            >
              {t.clearFilters}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
