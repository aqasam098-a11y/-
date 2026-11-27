import { useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Home,
  Lock,
  MapPin,
  MessageSquareText,
  Send,
  Sprout,
  User,
} from 'lucide-react';
import {
  getCityCoords,
  getInitialSeedChatMessages,
  getSeedMapUrl,
  PAKISTANI_CITIES,
  UI_COPY,
} from '../data/seeds';
import { ChatMessage, Language, SeedItem } from '../types';
import { calculateDistanceKm, getCurrentTimestamp } from '../utils/media';

interface LocationNearbyViewProps {
  lang: Language;
  seeds: SeedItem[];
  userCoords: { lat: number; lng: number } | null;
  referenceCity: string;
  onSetUserCoords: (coords: { lat: number; lng: number } | null) => void;
  onSetReferenceCity: (cityEn: string) => void;
  onBackHome: () => void;
  onOpenSeedDetail: (seed: SeedItem, focusChat?: boolean) => void;
  onSelectOwner: (seed: SeedItem) => void;
}

export function LocationNearbyView({
  lang,
  seeds,
  userCoords,
  referenceCity,
  onSetUserCoords,
  onSetReferenceCity,
  onBackHome,
  onOpenSeedDetail,
  onSelectOwner,
}: LocationNearbyViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [maxDistanceKm, setMaxDistanceKm] = useState<'all' | number>(250);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle'
  );
  const [gpsMessage, setGpsMessage] = useState('');

  const handleUseGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage(
        isUrdu
          ? 'آپ کا براؤزر GPS لوکیشن کو سپورٹ نہیں کرتا؛ نیچے شہر منتخب کریں۔'
          : 'Browser geolocation unavailable; select a city below.'
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
            : 'Using your current GPS coordinates.'
        );
      },
      () => {
        setGpsStatus('error');
        setGpsMessage(
          isUrdu
            ? 'GPS کی اجازت نہیں ملی؛ منتخب کردہ شہر سے فاصلہ ناپا جا رہا ہے۔'
            : 'GPS permission denied; using selected city coordinates.'
        );
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  const activeOrigin = useMemo(() => {
    if (userCoords) return userCoords;
    return getCityCoords(referenceCity);
  }, [userCoords, referenceCity]);

  const sortedSeeds = useMemo(() => {
    return seeds
      .map((seed) => {
        const cityCenter = getCityCoords(seed.cityEn || seed.cityUr);
        const coords =
          !seed.hideExactLocation &&
          seed.lat !== undefined &&
          seed.lng !== undefined
            ? { lat: seed.lat, lng: seed.lng }
            : cityCenter;
        const distanceKm = calculateDistanceKm(
          activeOrigin.lat,
          activeOrigin.lng,
          coords.lat,
          coords.lng
        );
        return {
          seed,
          distanceKm,
          mapUrl: getSeedMapUrl(seed),
        };
      })
      .filter(
        (item) =>
          maxDistanceKm === 'all' || item.distanceKm <= maxDistanceKm
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [seeds, activeOrigin, maxDistanceKm]);

  const handleShareLocationAndOpenChat = (seed: SeedItem, mapUrl: string) => {
    const storageKey = `desibeej_chat_${seed.id}`;
    let existing: ChatMessage[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          existing = parsed;
        }
      }
    } catch {
      // ignore
    }
    if (existing.length === 0) {
      existing = getInitialSeedChatMessages(seed);
    }

    const originLabel = userCoords
      ? isUrdu
        ? 'میرا موجودہ GPS مقام'
        : 'My current GPS location'
      : isUrdu
        ? PAKISTANI_CITIES.find((c) => c.en === referenceCity)?.ur ||
          referenceCity
        : referenceCity;

    const myMapLink = `https://www.google.com/maps/search/?api=1&query=${activeOrigin.lat.toFixed(
      4
    )},${activeOrigin.lng.toFixed(4)}`;

    const locMsg: ChatMessage = {
      id: `loc-${Date.now()}`,
      sender: 'buyer',
      type: 'text',
      text: isUrdu
        ? `السلام علیکم! میں ${originLabel} کے قریب سے رابطہ کر رہا ہوں (میرا نقشہ لنک: ${myMapLink} | بیج کا مقام: ${mapUrl})`
        : `Salam! Messaging from near ${originLabel} (My map: ${myMapLink} | Seed map: ${mapUrl})`,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify([...existing, locMsg]));
    } catch {
      // ignore
    }
    onOpenSeedDetail(seed, true);
  };

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      {/* Header Banner */}
      <section className="border-b border-[#44633B]/60 bg-gradient-to-b from-[#1A3B24] to-[#102B19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label={isUrdu ? 'بریڈ کرمب' : 'Breadcrumb'}>
              <ol className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
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
                <li className="text-[#FFF0A3] font-semibold">{t.navNearby}</li>
              </ol>
            </nav>

            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
            >
              <span>{t.backToHome}</span>
            </button>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#E5C65A] mb-1">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>
                {isUrdu
                  ? 'قریبی دیسی بیج اور نقشہ لنکس'
                  : 'Nearby Seeds & Map Links'}
              </span>
            </div>
            <h1
              className={`font-bold text-[#FFF0A3] ${
                isUrdu
                  ? 'font-urdu-display text-2xl sm:text-3xl lg:text-4xl leading-[2.05]'
                  : 'font-display-heading text-3xl sm:text-4xl font-bold tracking-tight'
              }`}
            >
              {t.navNearby}
            </h1>
            <p className="text-sm sm:text-base text-[#D7E2CE] mt-1">
              {isUrdu
                ? 'فاصلے کے مطابق قریبی بیج فلٹر کریں، گوگل میپس پر مقام دیکھیں اور چیٹ میں لوکیشن شیئر کریں (رازداری کے تحفظ کے ساتھ)۔'
                : 'Filter nearby seeds by distance in km, open Google Maps links, and share your location directly in seed chats.'}
            </p>
          </div>

          {/* Distance & GPS Filter Card */}
          <div className="agri-glass-elevated rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={gpsStatus === 'loading'}
                  className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>
                    {gpsStatus === 'loading'
                      ? isUrdu
                        ? 'مقام تلاش کیا جا رہا ہے...'
                        : 'Detecting GPS...'
                      : t.useMyGpsBtn}
                  </span>
                </button>

                <select
                  aria-label={isUrdu ? 'مرکزی شہر' : 'Reference city'}
                  value={userCoords ? 'gps' : referenceCity}
                  onChange={(e) => {
                    if (e.target.value !== 'gps') {
                      onSetUserCoords(null);
                      onSetReferenceCity(e.target.value);
                    }
                  }}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm font-semibold text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                >
                  {userCoords && (
                    <option value="gps">
                      {isUrdu ? 'موجودہ GPS مقام' : 'Current GPS'}
                    </option>
                  )}
                  {PAKISTANI_CITIES.map((c) => (
                    <option key={c.en} value={c.en}>
                      {isUrdu ? `شہر: ${c.ur}` : `City: ${c.en}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { val: 25, label: isUrdu ? '25 کلومیٹر' : '25 km' },
                    { val: 50, label: isUrdu ? '50 کلومیٹر' : '50 km' },
                    { val: 100, label: isUrdu ? '100 کلومیٹر' : '100 km' },
                    { val: 250, label: isUrdu ? '250 کلومیٹر' : '250 km' },
                    { val: 'all', label: t.nearbyAllDistances },
                  ] as const
                ).map((opt) => {
                  const active = maxDistanceKm === opt.val;
                  return (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setMaxDistanceKm(opt.val)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19] font-bold'
                          : 'bg-[#0D2314] border-[#44633B] text-[#F8F7EA] hover:border-[#E5C65A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
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

      {/* Nearby Seeds Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-[#FFF0A3]">
            {isUrdu
              ? `${sortedSeeds.length} قریبی دیسی بیج`
              : `${sortedSeeds.length} Nearby Desi Seeds`}
          </h2>
        </div>

        {sortedSeeds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSeeds.map(({ seed, distanceKm, mapUrl }) => {
              const city = isUrdu ? seed.cityUr : seed.cityEn;
              const area = seed.hideExactLocation
                ? ''
                : isUrdu
                  ? seed.areaUr
                  : seed.areaEn;
              const loc = area ? `${city} · ${area}` : city;
              return (
                <article
                  key={seed.id}
                  className="agri-glass rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#E5C65A]/55 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#FFF0A3]/15 border border-[#E5C65A]/30 text-[#E5C65A] flex items-center justify-center shrink-0">
                          <Sprout className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-[#F8F7EA] truncate">
                            {isUrdu ? seed.nameUr : seed.nameEn}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onSelectOwner(seed)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#E5C65A] hover:text-[#FFF0A3] hover:underline cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>{isUrdu ? seed.ownerUr : seed.ownerEn}</span>
                          </button>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-[#263B20] border border-[#E5C65A]/40 text-xs font-bold text-[#FFF0A3] tabular-nums whitespace-nowrap shrink-0">
                        {isUrdu ? `~${distanceKm} کلومیٹر` : `~${distanceKm} km`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#C7D3BD]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#F8F7EA]">
                        <MapPin className="w-3.5 h-3.5 text-[#E5C65A]" />
                        {loc}
                      </span>
                      {seed.hideExactLocation && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#263B20] border border-[#E5C65A]/35 text-[11px] font-semibold text-[#FFF0A3]">
                          <Lock className="w-3 h-3 text-[#E5C65A]" />
                          {isUrdu ? 'صرف شہر' : 'City-only'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#D7E2CE] line-clamp-2">
                      {isUrdu ? seed.descriptionUr : seed.descriptionEn}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#44633B]/50 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-[#FFF0A3] text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" />
                        <span>{t.viewOnMapBtn}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onOpenSeedDetail(seed, true)}
                        className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] hover:bg-[#263B20] text-[#F8F7EA] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <MessageSquareText className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" />
                        <span>{t.viewDetailsBtn}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleShareLocationAndOpenChat(seed, mapUrl)
                      }
                      className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.shareLocationInChatBtn}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-6 rounded-2xl agri-glass text-center max-w-lg mx-auto space-y-3">
            <MapPin className="w-10 h-10 mx-auto text-[#E5C65A]" />
            <h3 className="text-lg font-bold text-[#FFF0A3]">
              {isUrdu
                ? 'اس فاصلے میں کوئی بیج نہیں ملا'
                : 'No seeds found within this radius'}
            </h3>
            <button
              type="button"
              onClick={() => setMaxDistanceKm('all')}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer transition-colors"
            >
              {t.nearbyAllDistances}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
