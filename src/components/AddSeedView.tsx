import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Home,
  ImagePlus,
  Lock,
  MapPin,
  ShieldCheck,
  Sprout,
  Trash2,
} from 'lucide-react';
import {
  CATEGORIES,
  getCityCoords,
  PAKISTANI_CITIES,
  UI_COPY,
} from '../data/seeds';
import {
  CategoryId,
  FarmerProfile,
  Language,
  ListingType,
  SeedItem,
} from '../types';
import { compressImageToDataUrl } from '../utils/media';

interface AddSeedViewProps {
  lang: Language;
  defaultProfile?: FarmerProfile;
  onBackHome: () => void;
  onAddSeed: (seed: SeedItem) => void;
}

export function AddSeedView({
  lang,
  defaultProfile,
  onBackHome,
  onAddSeed,
}: AddSeedViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] =
    useState<Exclude<CategoryId, 'all'>>('vegetables');
  const [quantity, setQuantity] = useState('50 گرام');
  const [listingType, setListingType] = useState<ListingType>('exchange');
  const [pricePkr, setPricePkr] = useState('250');
  const [exchangeNote, setExchangeNote] = useState('');
  const [cityIndex, setCityIndex] = useState(0);
  const [area, setArea] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [gpsMessage, setGpsMessage] = useState('');
  const [hideExactLocation, setHideExactLocation] = useState(false);

  const [owner, setOwner] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hidePhone, setHidePhone] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [description, setDescription] = useState('');
  const [pureConfirmed, setPureConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!defaultProfile) return;
    setOwner((prev) =>
      prev || (isUrdu ? defaultProfile.nameUr : defaultProfile.nameEn)
    );
    setWhatsapp((prev) => prev || defaultProfile.whatsapp);
    setHidePhone(defaultProfile.hidePhone);
    setHideExactLocation(Boolean(defaultProfile.hideExactLocation));
    const idx = PAKISTANI_CITIES.findIndex(
      (c) =>
        c.ur === defaultProfile.cityUr || c.en === defaultProfile.cityEn
    );
    if (idx >= 0) {
      setCityIndex(idx);
    }
  }, [defaultProfile, isUrdu]);

  const selectableCategories = CATEGORIES.filter((c) => c.id !== 'all');

  const handleCaptureGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const fallbackCity = PAKISTANI_CITIES[cityIndex] || PAKISTANI_CITIES[0];
      setGpsCoords({ lat: fallbackCity.lat, lng: fallbackCity.lng });
      setGpsStatus('error');
      setGpsMessage(
        isUrdu
          ? `براؤزر GPS دستیاب نہیں؛ ${fallbackCity.ur} کا مقامی مقام منتخب کر لیا گیا ہے۔`
          : `Browser GPS unavailable; using ${fallbackCity.en} city coordinates.`
      );
      return;
    }

    setGpsStatus('loading');
    setGpsMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        });
        setGpsStatus('ready');
        setGpsMessage(
          isUrdu
            ? 'آپ کا موجودہ GPS مقام کامیابی سے حاصل کر لیا گیا ہے۔'
            : 'Current GPS coordinates captured.'
        );
      },
      () => {
        const fallbackCity = PAKISTANI_CITIES[cityIndex] || PAKISTANI_CITIES[0];
        setGpsCoords({ lat: fallbackCity.lat, lng: fallbackCity.lng });
        setGpsStatus('error');
        setGpsMessage(
          isUrdu
            ? `GPS کی اجازت نہیں ملی؛ ${fallbackCity.ur} کا شہر والا مقام استعمال کیا جا رہا ہے۔`
            : `GPS permission denied; falling back to ${fallbackCity.en} coordinates.`
        );
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg(
        isUrdu
          ? 'براہِ کرم صرف تصویر کی فائل (JPG یا PNG) منتخب کریں۔'
          : 'Please choose an image file (JPG or PNG).'
      );
      return;
    }

    try {
      const compressed = await compressImageToDataUrl(file);
      setImageDataUrl(compressed);
      setImageName(file.name);
      setErrorMsg('');
    } catch {
      setErrorMsg(
        isUrdu
          ? 'تصویر لوڈ کرنے میں مسئلہ پیش آیا۔'
          : 'Could not load the selected image.'
      );
    }
  };

  const removeImage = () => {
    setImageDataUrl('');
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity.trim() || !owner.trim() || !whatsapp.trim()) {
      setErrorMsg(
        isUrdu
          ? 'براہِ کرم بیج کا نام، مقدار، نام اور واٹس ایپ نمبر لازمی درج کریں۔'
          : 'Please fill in the seed name, quantity, your name, and WhatsApp number.'
      );
      return;
    }
    if (!pureConfirmed) {
      setErrorMsg(
        isUrdu
          ? 'براہِ کرم تصدیق کریں کہ یہ خالص دیسی بیج ہے۔'
          : 'Please check the confirmation box that these are pure desi seeds.'
      );
      return;
    }

    const cleanedPhone = whatsapp.replace(/[^\d]/g, '');
    const normalizedPhone = cleanedPhone.startsWith('0')
      ? `92${cleanedPhone.slice(1)}`
      : cleanedPhone.startsWith('92')
        ? cleanedPhone
        : `92${cleanedPhone}`;

    const selectedCity = PAKISTANI_CITIES[cityIndex] || PAKISTANI_CITIES[0];
    const cityFallback = getCityCoords(selectedCity.en);
    const finalCoords = hideExactLocation
      ? cityFallback
      : gpsCoords || cityFallback;

    const trimmedQty = quantity.trim();
    const trimmedArea = area.trim();

    const newSeed: SeedItem = {
      id: `seed-${Date.now()}`,
      ownerId: defaultProfile?.id || 'my-profile',
      nameUr: name.trim(),
      nameEn: name.trim(),
      category,
      quantityUr: trimmedQty,
      quantityEn: trimmedQty,
      listingType,
      pricePkr: listingType === 'sale' ? Number(pricePkr) || 200 : undefined,
      unitUr: trimmedQty,
      unitEn: trimmedQty,
      exchangeNoteUr:
        exchangeNote.trim() || 'کسی بھی دیسی سبزی کے بیج سے تبادلہ',
      exchangeNoteEn: exchangeNote.trim() || 'Swap for pure desi seeds',
      cityUr: selectedCity.ur,
      cityEn: selectedCity.en,
      areaUr: hideExactLocation ? undefined : trimmedArea || undefined,
      areaEn: hideExactLocation ? undefined : trimmedArea || undefined,
      lat: finalCoords.lat,
      lng: finalCoords.lng,
      hideExactLocation,
      ownerUr: owner.trim(),
      ownerEn: owner.trim(),
      whatsapp: normalizedPhone,
      hidePhone,
      seasonUr: 'موسمی کاشت',
      seasonEn: 'Seasonal sowing',
      descriptionUr:
        description.trim() ||
        'خالص گھریلو اور دیسی طریقہ سے محفوظ کردہ بیج۔',
      descriptionEn:
        description.trim() ||
        'Pure home-saved open-pollinated heirloom seeds.',
      imageUrl: imageDataUrl || undefined,
      createdAt: Date.now(),
    };

    onAddSeed(newSeed);
  };

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <section className="border-b border-[#E5C65A]/20 bg-gradient-to-b from-[#263B20]/70 to-[#102B19]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4">
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
                  {isUrdu ? 'نیا بیج شامل کریں' : 'Sell / List Desi Seed'}
                </li>
              </ol>
            </nav>

            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5C65A]/35 bg-[#183822]/80 hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer"
            >
              <span>{t.backToHome}</span>
            </button>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#E5C65A] mb-1">
              <Sprout className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isUrdu
                  ? 'خالص دیسی بیج درج کریں'
                  : 'Publish Heirloom Seeds'}
              </span>
            </div>
            <h1
              className={`font-bold text-[#FFF0A3] ${
                isUrdu
                  ? 'font-urdu-display text-2xl sm:text-3xl leading-[2.05]'
                  : 'font-display-heading text-2xl sm:text-3xl font-bold tracking-tight'
              }`}
            >
              {isUrdu
                ? 'اپنا خالص دیسی بیج شامل کریں'
                : 'List Your Pure Desi Seed'}
            </h1>
            <p className="text-sm text-[#C7D3BD] mt-1">
              {isUrdu
                ? 'تبادلے یا فروخت کے لیے بیج کی تفصیلات، GPS مقام اور نمبر/مقام رازداری کی سیٹنگز درج کریں۔'
                : 'Add seed details, optional current GPS coordinates, and privacy preferences for direct exchange or sale.'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Dedicated Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form
          onSubmit={handleSubmit}
          className="agri-glass-elevated rounded-2xl p-5 sm:p-8 space-y-6"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-400/40 text-sm text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Seed Name */}
          <div>
            <label
              htmlFor="seed-name"
              className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
            >
              {isUrdu ? 'بیج کا نام *' : 'Seed Name *'}
            </label>
            <input
              id="seed-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isUrdu
                  ? 'مثلاً دیسی تورئی یا سرخ مولی'
                  : 'e.g., Desi Tori or Red Radish'
              }
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm sm:text-base text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
            />
          </div>

          {/* Crop Category & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="seed-category"
                className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
              >
                {isUrdu ? 'فصل کی قسم' : 'Crop Category'}
              </label>
              <select
                id="seed-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Exclude<CategoryId, 'all'>)
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
              >
                {selectableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {isUrdu ? cat.ur : cat.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="seed-quantity"
                className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
              >
                {isUrdu ? 'مقدار *' : 'Quantity *'}
              </label>
              <input
                id="seed-quantity"
                type="text"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={isUrdu ? 'مثلاً 50 گرام یا 1 کلو' : 'e.g., 50g or 1 kg'}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
              />
            </div>
          </div>

          {/* Exchange / Sale Toggle */}
          <div className="space-y-3">
            <div>
              <span className="block text-sm font-semibold text-[#FFF0A3] mb-1.5">
                {isUrdu ? 'تبادلہ / فروخت' : 'Exchange / Sale'}
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0D2314] border border-[#44633B]/70">
                <button
                  type="button"
                  onClick={() => setListingType('exchange')}
                  className={`min-h-[42px] py-2 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    listingType === 'exchange'
                      ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                      : 'text-[#C7D3BD] hover:text-[#FFF0A3]'
                  }`}
                >
                  {isUrdu ? 'تبادلے کے لیے' : 'For Exchange'}
                </button>
                <button
                  type="button"
                  onClick={() => setListingType('sale')}
                  className={`min-h-[42px] py-2 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    listingType === 'sale'
                      ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                      : 'text-[#C7D3BD] hover:text-[#FFF0A3]'
                  }`}
                >
                  {isUrdu ? 'فروخت کے لیے' : 'For Sale'}
                </button>
              </div>
            </div>

            {listingType === 'exchange' ? (
              <div>
                <label
                  htmlFor="seed-exchange-note"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu
                    ? 'بدلے میں کون سا بیج چاہیے؟'
                    : 'Which seed do you want in exchange?'}
                </label>
                <input
                  id="seed-exchange-note"
                  type="text"
                  value={exchangeNote}
                  onChange={(e) => setExchangeNote(e.target.value)}
                  placeholder={
                    isUrdu
                      ? 'مثلاً دیسی پالک، دھنیا یا گندم کا بیج'
                      : 'e.g., Desi spinach, coriander, or wheat seeds'
                  }
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="seed-price"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'قیمت (روپے میں)' : 'Price (in PKR)'}
                </label>
                <input
                  id="seed-price"
                  type="number"
                  min={0}
                  value={pricePkr}
                  onChange={(e) => setPricePkr(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] tabular-nums focus:outline-none focus:border-[#E5C65A]"
                />
              </div>
            )}
          </div>

          {/* City/District, Area + Current GPS & Location Privacy */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#102B19]/75 border border-[#44633B]/70 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#FFF0A3]">
              <MapPin className="w-4 h-4 text-[#E5C65A]" aria-hidden="true" />
              <span>
                {isUrdu
                  ? 'مقام اور GPS کی تفصیلات'
                  : 'Location & GPS Settings'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="seed-city"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'شہر / ضلع' : 'City / District'}
                </label>
                <select
                  id="seed-city"
                  value={cityIndex}
                  onChange={(e) => setCityIndex(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                >
                  {PAKISTANI_CITIES.map((c, idx) => (
                    <option key={c.en} value={idx}>
                      {isUrdu ? c.ur : c.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="seed-area"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'علاقہ / تحصیل / گاؤں' : 'Area / Locality'}
                </label>
                <input
                  id="seed-area"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={hideExactLocation}
                  placeholder={
                    isUrdu
                      ? 'مثلاً بستی ملوک یا چک ۱۲'
                      : 'e.g., Basti Malook'
                  }
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] disabled:opacity-50 focus:outline-none focus:border-[#E5C65A]"
                />
              </div>
            </div>

            {/* Current GPS Capture */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={gpsStatus === 'loading'}
                className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#263B20] hover:bg-[#314C29] border border-[#E5C65A]/40 text-xs sm:text-sm font-semibold text-[#FFF0A3] transition-colors cursor-pointer disabled:opacity-60"
              >
                <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {gpsStatus === 'loading'
                    ? isUrdu
                      ? 'GPS مقام حاصل کیا جا رہا ہے...'
                      : 'Capturing GPS...'
                    : t.useMyGpsBtn}
                </span>
              </button>

              {gpsCoords && (
                <span
                  dir="ltr"
                  className="text-xs font-semibold text-[#FFF0A3] bg-[#263B20] border border-[#E5C65A]/30 px-3 py-1.5 rounded-lg tabular-nums"
                >
                  GPS: {gpsCoords.lat.toFixed(3)}, {gpsCoords.lng.toFixed(3)}
                </span>
              )}
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

            {/* Location Privacy Toggle */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#183822]/80 border border-[#44633B] cursor-pointer">
              <input
                type="checkbox"
                checked={hideExactLocation}
                onChange={(e) => setHideExactLocation(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#E5C65A] rounded"
              />
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FFF0A3]">
                  <ShieldCheck
                    className="w-4 h-4 text-[#E5C65A] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{t.locationPrivacyLabel}</span>
                </span>
                <span className="block text-[11px] sm:text-xs text-[#C7D3BD] mt-0.5">
                  {isUrdu
                    ? 'آن کرنے پر گاؤں/علاقے یا درست GPS کے بجائے صرف شہر کا نام اور اندازاً فاصلہ دکھایا جائے گا۔'
                    : 'When enabled, your village/area and exact GPS coordinates stay private; only city name is displayed.'}
                </span>
              </div>
            </label>
          </div>

          {/* Owner Name & WhatsApp Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="seed-owner"
                className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
              >
                {isUrdu ? 'نام *' : 'Name *'}
              </label>
              <input
                id="seed-owner"
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder={isUrdu ? 'مثلاً محمد بلال' : 'e.g., Muhammad Bilal'}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
              />
            </div>

            <div>
              <label
                htmlFor="seed-whatsapp"
                className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
              >
                {isUrdu ? 'واٹس ایپ نمبر *' : 'WhatsApp Number *'}
              </label>
              <input
                id="seed-whatsapp"
                type="tel"
                required
                dir="ltr"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="0300-1234567"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] tabular-nums focus:outline-none focus:border-[#E5C65A]"
              />
            </div>
          </div>

          {/* Hide WhatsApp / Phone Number Toggle */}
          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#263B20]/70 border border-[#E5C65A]/30 cursor-pointer">
            <input
              type="checkbox"
              checked={hidePhone}
              onChange={(e) => setHidePhone(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#E5C65A] rounded"
            />
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FFF0A3]">
                <Lock className="w-3.5 h-3.5 text-[#E5C65A] shrink-0" aria-hidden="true" />
                <span>{t.hidePhoneLabel}</span>
              </span>
              <span className="block text-[11px] sm:text-xs text-[#C7D3BD] mt-0.5">
                {isUrdu
                  ? 'اگر منتخب کیا تو آپ کا نمبر عوامی طور پر نہیں دکھایا جائے گا؛ لوگ صرف ایپ چیٹ سے رابطہ کریں گے۔'
                  : 'Your phone number stays hidden publicly; buyers contact you through in-app chat.'}
              </span>
            </div>
          </label>

          {/* Seed Image Upload */}
          <div>
            <label
              htmlFor="seed-image-upload"
              className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
            >
              {isUrdu ? 'بیج کی تصویر (اختیاری)' : 'Seed Image (Optional)'}
            </label>
            <input
              ref={fileInputRef}
              id="seed-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
            {imageDataUrl ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0D2314] border border-[#44633B]">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={imageDataUrl}
                    alt={
                      isUrdu
                        ? 'منتخب کردہ بیج کی تصویر'
                        : 'Uploaded seed preview'
                    }
                    className="w-16 h-12 rounded-lg object-cover border border-[#44633B] shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-[#D7E2CE] truncate">
                    {imageName || (isUrdu ? 'تصویر منتخب ہو گئی' : 'Image ready')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:bg-red-950/60 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'ہٹائیں' : 'Remove'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[52px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#E5C65A]/45 bg-[#0D2314]/80 hover:bg-[#102B19] text-sm font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
              >
                <ImagePlus className="w-4 h-4 text-[#E5C65A] shrink-0" aria-hidden="true" />
                <span>
                  {isUrdu ? 'بیج کی تصویر اپ لوڈ کریں' : 'Upload Seed Photo'}
                </span>
              </button>
            )}
          </div>

          {/* Short Description */}
          <div>
            <label
              htmlFor="seed-desc"
              className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
            >
              {isUrdu
                ? 'مختصر تفصیل (اختیاری)'
                : 'Short Description (Optional)'}
            </label>
            <textarea
              id="seed-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isUrdu
                  ? 'بیج کی خاصیت، کاشت کا وقت یا محفوظ کرنے کا سال لکھیں'
                  : 'Harvest year, taste profile, or growing tips'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
            />
          </div>

          {/* Pure Desi Seed Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#263B20]/70 border border-[#E5C65A]/30 cursor-pointer">
            <input
              type="checkbox"
              checked={pureConfirmed}
              onChange={(e) => setPureConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#E5C65A] rounded"
            />
            <span className="text-xs sm:text-sm font-semibold text-[#FFF0A3] leading-relaxed">
              {isUrdu
                ? 'میں تصدیق کرتا ہوں کہ یہ خالص دیسی بیج ہے'
                : 'I confirm that these are pure, open-pollinated desi seeds'}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 min-w-[200px] min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] font-bold text-sm sm:text-base transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isUrdu ? 'بیج شائع کریں' : 'Publish Seed'}</span>
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[46px] px-5 py-2.5 rounded-xl border border-[#44633B] bg-[#183822] hover:bg-[#263B20] text-[#F8F7EA] font-semibold text-sm transition-colors cursor-pointer"
            >
              {isUrdu ? 'منسوخ کریں' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
