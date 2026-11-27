import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Camera,
  CheckCircle2,
  Edit3,
  Heart,
  Home,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  ShieldCheck,
  Sprout,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  DIARY_TOPICS,
  getCityCoords,
  PAKISTANI_CITIES,
  UI_COPY,
} from '../data/seeds';
import {
  DiaryPost,
  FarmerProfile,
  Language,
  SeedItem,
  SeedReview,
} from '../types';
import { compressImageToDataUrl } from '../utils/media';
import { SeedCard } from './SeedCard';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

type ProfileTab = 'seeds' | 'diary' | 'reviews' | 'wishlist';

interface KisanProfileViewProps {
  profile: FarmerProfile;
  isOwnProfile: boolean;
  lang: Language;
  seeds: SeedItem[];
  diaryPosts: DiaryPost[];
  reviewsBySeed: Record<string, SeedReview[]>;
  wishlistIds?: string[];
  wishlistSeeds?: SeedItem[];
  initialTab?: ProfileTab;
  onToggleWishlist?: (seedId: string) => void;
  onSelectOwner?: (seed: SeedItem) => void;
  onBack: () => void;
  onSelectSeed: (seed: SeedItem, focusChat?: boolean) => void;
  onContactWhatsAppSeed: (seed: SeedItem) => void;
  onContactWhatsAppProfile: (profile: FarmerProfile) => void;
  onUpdateMyProfile: (updated: FarmerProfile) => void;
  onOpenDiaryTab: () => void;
  onOpenAddSeed: () => void;
}

export function KisanProfileView({
  profile,
  isOwnProfile,
  lang,
  seeds,
  diaryPosts,
  reviewsBySeed,
  wishlistIds = [],
  wishlistSeeds = [],
  initialTab = 'seeds',
  onToggleWishlist,
  onSelectOwner,
  onBack,
  onSelectSeed,
  onContactWhatsAppSeed,
  onContactWhatsAppProfile,
  onUpdateMyProfile,
  onOpenDiaryTab,
  onOpenAddSeed,
}: KisanProfileViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  // Edit My Profile Form State
  const [editName, setEditName] = useState(profile.nameUr);
  const [editCityIndex, setEditCityIndex] = useState(() => {
    const idx = PAKISTANI_CITIES.findIndex(
      (c) => c.ur === profile.cityUr || c.en === profile.cityEn
    );
    return idx >= 0 ? idx : 0;
  });
  const [editWhatsapp, setEditWhatsapp] = useState(profile.whatsapp);
  const [editBio, setEditBio] = useState(profile.bioUr);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl || '');
  const [editHidePhone, setEditHidePhone] = useState(profile.hidePhone);
  const [editHideExactLocation, setEditHideExactLocation] = useState(
    Boolean(profile.hideExactLocation)
  );
  const [editError, setEditError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditName(isUrdu ? profile.nameUr : profile.nameEn);
    const idx = PAKISTANI_CITIES.findIndex(
      (c) => c.ur === profile.cityUr || c.en === profile.cityEn
    );
    setEditCityIndex(idx >= 0 ? idx : 0);
    setEditWhatsapp(profile.whatsapp);
    setEditBio(isUrdu ? profile.bioUr : profile.bioEn);
    setEditAvatar(profile.avatarUrl || '');
    setEditHidePhone(profile.hidePhone);
    setEditHideExactLocation(Boolean(profile.hideExactLocation));
    setEditError('');
    setIsEditing(false);
    setActiveTab(initialTab);
  }, [profile, isUrdu, initialTab]);

  // Compute aggregated reviews across all of this farmer's seeds
  const farmerReviews: Array<{ review: SeedReview; seed: SeedItem }> = [];
  for (const seed of seeds) {
    const list = reviewsBySeed[seed.id] || [];
    for (const review of list) {
      farmerReviews.push({ review, seed });
    }
  }
  farmerReviews.sort((a, b) => b.review.createdAt - a.review.createdAt);

  const avgRating =
    farmerReviews.length > 0
      ? farmerReviews.reduce((sum, item) => sum + item.review.rating, 0) /
        farmerReviews.length
      : null;

  const isTrustedFarmer = avgRating !== null && avgRating >= 4.5;

  const displayName = isUrdu ? profile.nameUr : profile.nameEn;
  const displayCity = isUrdu ? profile.cityUr : profile.cityEn;
  const displayBio = isUrdu ? profile.bioUr : profile.bioEn;

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditError(
        isUrdu
          ? 'براہِ کرم صرف تصویر کی فائل منتخب کریں۔'
          : 'Please choose an image file.'
      );
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      setEditAvatar(compressed);
      setEditError('');
    } catch {
      setEditError(
        isUrdu
          ? 'پروفائل تصویر لوڈ کرنے میں مسئلہ پیش آیا۔'
          : 'Could not load profile photo.'
      );
    }
  };

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editWhatsapp.trim()) {
      setEditError(
        isUrdu
          ? 'براہِ کرم نام اور واٹس ایپ نمبر لازمی درج کریں۔'
          : 'Please enter your name and WhatsApp number.'
      );
      return;
    }

    const cleanedPhone = editWhatsapp.replace(/[^\d]/g, '');
    const normalizedPhone = cleanedPhone.startsWith('0')
      ? `92${cleanedPhone.slice(1)}`
      : cleanedPhone.startsWith('92')
        ? cleanedPhone
        : `92${cleanedPhone}`;

    const cityObj = PAKISTANI_CITIES[editCityIndex] || PAKISTANI_CITIES[0];
    const cityCoords = getCityCoords(cityObj.en);

    const updated: FarmerProfile = {
      ...profile,
      nameUr: editName.trim(),
      nameEn: editName.trim(),
      cityUr: cityObj.ur,
      cityEn: cityObj.en,
      lat: cityCoords.lat,
      lng: cityCoords.lng,
      hideExactLocation: editHideExactLocation,
      whatsapp: normalizedPhone,
      hidePhone: editHidePhone,
      bioUr:
        editBio.trim() ||
        'خالص دیسی بیجوں کے محافظ اور کسان دوست کاشتکار۔',
      bioEn:
        editBio.trim() ||
        'Heirloom seed keeper and sustainable Pakistani farmer.',
      avatarUrl: editAvatar || undefined,
      isMyProfile: true,
    };

    onUpdateMyProfile(updated);
    setIsEditing(false);
    setEditError('');
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 4000);
  };

  const primaryChatSeed = seeds[0] || null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 text-[#F8F7EA]">
      {/* Breadcrumb & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5C65A]/35 bg-[#183822]/80 hover:bg-[#263B20] text-sm sm:text-base font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.backToHome}</span>
          </button>
        </div>

        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-sm font-bold text-[#102B19] transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {isEditing
                ? isUrdu
                  ? 'ترمیم بند کریں'
                  : 'Cancel Edit'
                : isUrdu
                  ? 'پروفائل میں ترمیم کریں'
                  : 'Edit My Profile'}
            </span>
          </button>
        )}
      </div>

      {savedBanner && (
        <div
          role="status"
          className="p-4 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 flex items-center justify-between gap-3 text-[#FFF0A3]"
        >
          <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
            <CheckCircle2 className="w-5 h-5 text-[#E5C65A] shrink-0" />
            <span>
              {isUrdu
                ? 'آپ کی کسان پروفائل کامیابی سے محفوظ کر لی گئی ہے۔'
                : 'Your Kisan Profile has been saved.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSavedBanner(false)}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="agri-glass-elevated rounded-2xl overflow-hidden">
        <div className="h-24 sm:h-28 bg-gradient-to-l from-[#102B19] via-[#263B20] to-[#4E5A28] border-b border-[#E5C65A]/20" />
        <div className="px-5 sm:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-12 sm:-mt-14">
            {/* Avatar & Identity */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-[#13311D] bg-[#FFF0A3] text-[#102B19] shadow-lg overflow-hidden flex items-center justify-center shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12" aria-hidden="true" />
                )}
              </div>

              <div className="space-y-1.5 pt-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] leading-tight font-display-heading">
                    {displayName}
                  </h1>

                  {isTrustedFarmer && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5C65A]/15 border border-[#E5C65A]/40 text-xs sm:text-sm font-semibold text-[#FFF0A3] whitespace-nowrap">
                      <BadgeCheck
                        className="w-4 h-4 text-[#E5C65A] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{t.trustedFarmerBadge}</span>
                    </span>
                  )}

                  {isOwnProfile && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#263B20] border border-[#E5C65A]/30 text-xs font-semibold text-[#E5C65A] whitespace-nowrap">
                      {t.navMyProfile}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#C7D3BD]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#F8F7EA]">
                    <MapPin
                      className="w-4 h-4 text-[#E5C65A] shrink-0"
                      aria-hidden="true"
                    />
                    {displayCity}
                  </span>

                  {avgRating !== null ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#263B20] border border-[#E5C65A]/35 text-xs sm:text-sm font-bold text-[#FFF0A3] tabular-nums">
                      <Star
                        className="w-4 h-4 text-[#E5C65A] fill-[#E5C65A] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{avgRating.toFixed(1)}</span>
                      <span className="font-normal text-[#C7D3BD]">
                        ({farmerReviews.length}{' '}
                        {isUrdu ? 'آراء' : 'reviews'})
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-[#B7C7AC]">
                      {isUrdu ? 'ابھی کوئی ریٹنگ نہیں' : 'No ratings yet'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Contact OR Privacy Notice */}
            <div className="shrink-0">
              {profile.hidePhone ? (
                <div className="p-3.5 rounded-xl bg-[#263B20]/80 border border-[#E5C65A]/30 max-w-sm space-y-2">
                  <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-[#FFF0A3]">
                    <Lock className="w-4 h-4 text-[#E5C65A] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t.phoneHiddenNotice}</span>
                  </div>
                  {primaryChatSeed && (
                    <button
                      type="button"
                      onClick={() => onSelectSeed(primaryChatSeed, true)}
                      className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                    >
                      <MessageSquareText className="w-4 h-4 shrink-0" />
                      <span>{t.openAppChatBtn}</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onContactWhatsAppProfile(profile)}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.whatsappBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Short Bio */}
          <p className="mt-5 text-sm sm:text-base text-[#D7E2CE] leading-relaxed max-w-3xl">
            {displayBio}
          </p>

          {/* 3 Clean Stat Boxes */}
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 text-center">
              <div className="text-xl sm:text-2xl font-bold text-[#FFF0A3] tabular-nums">
                {seeds.length}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[#C7D3BD] mt-1">
                {isUrdu ? 'کل بیج' : 'Total Seeds'}
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 text-center">
              <div className="text-xl sm:text-2xl font-bold text-[#E5C65A] tabular-nums">
                {profile.completedExchanges}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[#C7D3BD] mt-1">
                {isUrdu ? 'کامیاب تبادلے' : 'Completed Exchanges'}
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 text-center">
              <div className="text-xl sm:text-2xl font-bold text-[#FFF0A3] tabular-nums">
                {diaryPosts.length}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[#C7D3BD] mt-1">
                {isUrdu ? 'ڈائری تحریریں' : 'Diary Entries'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit My Profile Form */}
      {isOwnProfile && isEditing && (
        <section
          aria-label={isUrdu ? 'میری پروفائل میں ترمیم' : 'Edit My Profile'}
          className="agri-glass-elevated rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 bg-[#1B4227] border-b border-[#E5C65A]/20 text-[#FFF0A3] flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold">
              {isUrdu ? 'اپنی کسان پروفائل اپ ڈیٹ کریں' : 'Update My Farmer Profile'}
            </h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              aria-label={isUrdu ? 'بند کریں' : 'Close'}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="p-5 sm:p-6 space-y-4">
            {editError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-sm text-red-200">
                {editError}
              </div>
            )}

            {/* Profile Photo Upload */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#FFF0A3] border border-[#E5C65A] overflow-hidden flex items-center justify-center text-[#102B19] shrink-0">
                {editAvatar ? (
                  <img
                    src={editAvatar}
                    alt={editName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-9 h-9" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="sr-only"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5C65A]/40 bg-[#263B20] hover:bg-[#314C29] text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {isUrdu ? 'پروفائل تصویر تبدیل کریں' : 'Upload Profile Photo'}
                    </span>
                  </button>
                  {editAvatar && (
                    <button
                      type="button"
                      onClick={() => setEditAvatar('')}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-400/40 bg-red-950/50 text-xs font-semibold text-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isUrdu ? 'ہٹائیں' : 'Remove'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'آپ کا نام *' : 'Your Name *'}
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-city"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'شہر / ضلع' : 'City / District'}
                </label>
                <select
                  id="profile-city"
                  value={editCityIndex}
                  onChange={(e) => setEditCityIndex(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
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
                  htmlFor="profile-whatsapp"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'واٹس ایپ / فون نمبر *' : 'WhatsApp Number *'}
                </label>
                <input
                  id="profile-whatsapp"
                  type="tel"
                  required
                  dir="ltr"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] tabular-nums focus:outline-none focus:border-[#E5C65A]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-bio"
                className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
              >
                {isUrdu ? 'مختصر تعارف (Bio)' : 'Short Bio'}
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                dir="auto"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={
                  isUrdu
                    ? 'اپنے فارم، تجربے اور دیسی بیجوں کے بارے میں لکھیں...'
                    : 'Write a short note about your farm and heirloom seeds...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
              />
            </div>

            {/* Privacy Toggles */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#263B20]/70 border border-[#E5C65A]/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editHidePhone}
                  onChange={(e) => setEditHidePhone(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#E5C65A] rounded"
                />
                <div>
                  <span className="block text-sm font-bold text-[#FFF0A3]">
                    {t.hidePhoneLabel}
                  </span>
                  <span className="block text-xs text-[#C7D3BD] mt-0.5">
                    {isUrdu
                      ? 'آن کرنے پر آپ کا نمبر پروفائل اور بیج کارڈز پر ظاہر نہیں ہوگا؛ خریدار صرف ایپ چیٹ میں بات کر سکیں گے۔'
                      : 'When enabled, your phone number is hidden on public cards and profile; buyers reach you via in-app chat.'}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editHideExactLocation}
                  onChange={(e) => setEditHideExactLocation(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#E5C65A] rounded"
                />
                <div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFF0A3]">
                    <ShieldCheck className="w-4 h-4 text-[#E5C65A] shrink-0" aria-hidden="true" />
                    <span>{t.locationPrivacyLabel}</span>
                  </span>
                  <span className="block text-xs text-[#C7D3BD] mt-0.5">
                    {isUrdu
                      ? 'آن کرنے پر صرف شہر کا نام دکھایا جائے گا اور درست GPS مقام عوامی طور پر مخفی رہے گا۔'
                      : 'When enabled, only your city name is shown publicly while exact coordinates remain hidden.'}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isUrdu ? 'تبدیلیاں محفوظ کریں' : 'Save Profile'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#44633B] bg-[#183822] hover:bg-[#263B20] text-sm font-semibold text-[#F8F7EA] cursor-pointer"
              >
                {isUrdu ? 'منسوخ کریں' : 'Cancel'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Profile Content Tabs */}
      <div className="space-y-5">
        <div
          role="tablist"
          aria-label={isUrdu ? 'پروفائل سیکشنز' : 'Profile Sections'}
          className="flex flex-wrap items-center gap-2 border-b border-[#E5C65A]/15 pb-3"
        >
          {(
            [
              {
                id: 'seeds',
                label: isUrdu ? 'دستیاب بیج' : 'Available Seeds',
                count: seeds.length,
              },
              ...(isOwnProfile
                ? [
                    {
                      id: 'wishlist' as const,
                      label: isUrdu ? 'میری وش لسٹ' : 'My Wishlist',
                      count: wishlistSeeds.length,
                    },
                  ]
                : []),
              {
                id: 'diary',
                label: isUrdu ? 'کسان ڈائری' : 'Kisan Diary',
                count: diaryPosts.length,
              },
              {
                id: 'reviews',
                label: isUrdu ? 'ریٹنگز اور آراء' : 'Ratings & Reviews',
                count: farmerReviews.length,
              },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19]'
                    : 'bg-[#183822]/80 border-[#44633B] text-[#E6ECE0] hover:border-[#E5C65A]/60'
                }`}
              >
                {tab.id === 'wishlist' && (
                  <Heart
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? 'fill-[#102B19] text-[#102B19]'
                        : 'fill-[#E5C65A] text-[#E5C65A]'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={`text-xs tabular-nums px-1.5 py-0.5 rounded-md ${
                    active ? 'bg-[#102B19]/15 text-[#102B19]' : 'bg-[#102B19] text-[#E5C65A]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Available Seeds */}
        {activeTab === 'seeds' && (
          <div>
            {seeds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {seeds.map((seed) => {
                  const seedRevs = reviewsBySeed[seed.id] || [];
                  const seedAvg =
                    seedRevs.length > 0
                      ? seedRevs.reduce((sum, r) => sum + r.rating, 0) /
                        seedRevs.length
                      : null;
                  const isHidden = Boolean(
                    seed.hidePhone || (isOwnProfile && profile.hidePhone)
                  );
                  return (
                    <SeedCard
                      key={seed.id}
                      seed={seed}
                      lang={lang}
                      rating={seedAvg}
                      reviewCount={seedRevs.length}
                      isPhoneHidden={isHidden}
                      isSaved={wishlistIds.includes(seed.id)}
                      onToggleSave={onToggleWishlist}
                      onSelectSeed={(s, focus) => onSelectSeed(s, focus)}
                      onContactWhatsApp={onContactWhatsAppSeed}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl agri-glass text-center space-y-3">
                <Sprout className="w-10 h-10 mx-auto text-[#E5C65A]" />
                <p className="text-sm sm:text-base text-[#D7E2CE]">
                  {isUrdu
                    ? 'اس پروفائل پر ابھی کوئی بیج درج نہیں ہے۔'
                    : 'No seeds listed on this profile yet.'}
                </p>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={onOpenAddSeed}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
                  >
                    {t.addSeedBtn}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Wishlist */}
        {isOwnProfile && activeTab === 'wishlist' && (
          <div>
            {wishlistSeeds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistSeeds.map((seed) => {
                  const seedRevs = reviewsBySeed[seed.id] || [];
                  const seedAvg =
                    seedRevs.length > 0
                      ? seedRevs.reduce((sum, r) => sum + r.rating, 0) /
                        seedRevs.length
                      : null;
                  const isHidden = Boolean(
                    seed.hidePhone ||
                      (seed.ownerId === profile.id && profile.hidePhone)
                  );
                  return (
                    <SeedCard
                      key={seed.id}
                      seed={seed}
                      lang={lang}
                      rating={seedAvg}
                      reviewCount={seedRevs.length}
                      isPhoneHidden={isHidden}
                      isSaved={true}
                      onToggleSave={onToggleWishlist}
                      onSelectSeed={(s, focus) => onSelectSeed(s, focus)}
                      onSelectOwner={onSelectOwner}
                      onContactWhatsApp={onContactWhatsAppSeed}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl agri-glass text-center space-y-3">
                <Heart className="w-10 h-10 mx-auto text-[#E5C65A]" />
                <h3 className="text-base sm:text-lg font-bold text-[#FFF0A3]">
                  {isUrdu
                    ? 'آپ کی وش لسٹ (پسندیدہ فہرست) ابھی خالی ہے'
                    : 'Your Wishlist is Empty'}
                </h3>
                <p className="text-sm text-[#C7D3BD] max-w-md mx-auto">
                  {isUrdu
                    ? 'کسی بھی بیج کے کارڈ پر دل (Heart) کے نشان پر کلک کریں تاکہ وہ آپ کی پسندیدہ فہرست میں محفوظ ہو جائے۔'
                    : 'Tap the heart icon on any Seed Card to bookmark your favorite desi seeds here.'}
                </p>
                <button
                  type="button"
                  onClick={onBack}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
                >
                  {isUrdu ? 'دیسی بیج دیکھیں' : 'Browse Seeds'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Kisan Diary */}
        {activeTab === 'diary' && (
          <div className="space-y-4">
            {diaryPosts.length > 0 ? (
              diaryPosts.map((post) => {
                const topicMeta = DIARY_TOPICS.find((item) => item.id === post.topic);
                const topicLabel = topicMeta
                  ? isUrdu
                    ? topicMeta.ur
                    : topicMeta.en
                  : '';
                return (
                  <article
                    key={post.id}
                    className="agri-glass-elevated rounded-2xl p-5 sm:p-6 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#FFF0A3] bg-[#263B20] border border-[#E5C65A]/30 px-2.5 py-1 rounded-md">
                        {topicLabel}
                      </span>
                      <span className="text-xs text-[#C7D3BD]">
                        {isUrdu ? post.dateUr : post.dateEn}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#FFF0A3]">
                      {isUrdu ? post.titleUr : post.titleEn}
                    </h3>

                    <p
                      dir="auto"
                      className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed whitespace-pre-line"
                    >
                      {isUrdu ? post.contentUr : post.contentEn}
                    </p>

                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-[#44633B] max-h-[280px]">
                        <img
                          src={post.imageUrl}
                          alt={isUrdu ? post.titleUr : post.titleEn}
                          referrerPolicy="no-referrer"
                          className="w-full h-full max-h-[280px] object-cover"
                        />
                      </div>
                    )}

                    {post.voiceDataUrl && (
                      <div className="max-w-md">
                        <VoiceMessagePlayer
                          src={post.voiceDataUrl}
                          initialDuration={post.voiceDurationSec}
                          variant="owner"
                          isUrdu={isUrdu}
                        />
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#E5C65A]/15 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-[#C7D3BD]">
                      <div className="flex items-center gap-4 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Heart className="w-4 h-4 text-[#E5C65A]" />
                          {post.likes} {isUrdu ? 'پسند' : 'likes'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-[#E5C65A]" />
                          {post.comments.length} {isUrdu ? 'تبصرے' : 'comments'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={onOpenDiaryTab}
                        className="text-xs sm:text-sm font-semibold text-[#FFF0A3] hover:underline cursor-pointer"
                      >
                        {isUrdu ? 'کسان ڈائری میں دیکھیں ←' : 'View in Kisan Diary →'}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="p-8 rounded-2xl agri-glass text-center space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-[#E5C65A]" />
                <p className="text-sm sm:text-base text-[#D7E2CE]">
                  {isUrdu
                    ? 'ابھی تک کسان ڈائری میں کوئی تحریر شامل نہیں کی گئی۔'
                    : 'No diary entries posted yet.'}
                </p>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={onOpenDiaryTab}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold cursor-pointer"
                  >
                    {isUrdu ? 'کسان ڈائری میں لکھیں' : 'Write in Kisan Diary'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Ratings & Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {farmerReviews.length > 0 ? (
              farmerReviews.map(({ review, seed }) => (
                <article
                  key={review.id}
                  className="agri-glass-elevated rounded-2xl p-5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-[#FFF0A3]">
                        {review.reviewerName}
                      </span>
                      <span className="text-xs text-[#C7D3BD]">·</span>
                      <button
                        type="button"
                        onClick={() => onSelectSeed(seed)}
                        className="text-xs sm:text-sm font-semibold text-[#E5C65A] hover:underline cursor-pointer"
                      >
                        {isUrdu ? seed.nameUr : seed.nameEn}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
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
                      <span className="text-xs text-[#C7D3BD]">
                        {isUrdu ? review.dateLabelUr : review.dateLabelEn}
                      </span>
                    </div>
                  </div>

                  <p
                    dir="auto"
                    className="text-sm sm:text-base text-[#E6ECE0] leading-relaxed"
                  >
                    {review.comment}
                  </p>
                </article>
              ))
            ) : (
              <div className="p-8 rounded-2xl agri-glass text-center text-sm sm:text-base text-[#D7E2CE]">
                {isUrdu
                  ? 'اس کسان کے بیجوں پر ابھی تک کوئی ریٹنگ یا رائے درج نہیں ہوئی۔'
                  : 'No ratings or reviews received yet.'}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
