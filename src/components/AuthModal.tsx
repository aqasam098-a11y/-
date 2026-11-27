import { useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Store,
  User,
  X,
} from 'lucide-react';
import { PAKISTANI_CITIES, SHOPKEEPER_DIRECTORY } from '../data/seeds';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  signInWithGooglePopup,
  signOutFirebase,
} from '../firebase';
import { syncSignedInUserProfile } from '../services/firestoreSync';
import { AuthRole, AuthUser, CartItem, Language } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  lang: Language;
  currentUser: AuthUser | null;
  onClose: () => void;
  onLoginSuccess: (
    user: AuthUser,
    wishlistIds?: string[],
    cartItems?: CartItem[]
  ) => void;
  onLogout: () => void;
  onOpenMyProfile: () => void;
  onOpenSellSeed: () => void;
  onOpenShopDashboard?: () => void;
  onOpenAdminPanel?: () => void;
}

export function AuthModal({
  isOpen,
  lang,
  currentUser,
  onClose,
  onLoginSuccess,
  onLogout,
  onOpenMyProfile,
  onOpenSellSeed,
  onOpenShopDashboard,
  onOpenAdminPanel,
}: AuthModalProps) {
  const isUrdu = lang === 'ur';
  const [cityEn, setCityEn] = useState(currentUser?.cityEn || 'Multan');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState<AuthRole>(
    currentUser?.role || 'farmer'
  );
  const [shopkeeperAccountId, setShopkeeperAccountId] = useState(
    currentUser?.role === 'shopkeeper' && currentUser.id
      ? currentUser.id
      : 'my-profile'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const isBootAdminEmail =
    currentUser?.emailOrPhone?.toLowerCase() ===
    BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  const getRoleLabel = (r: AuthRole) => {
    switch (r) {
      case 'admin':
        return isUrdu ? 'پلیٹ فارم ایڈمن' : 'Platform Admin';
      case 'shopkeeper':
        return isUrdu ? 'دکاندار (کمیشن شاپ)' : 'Shopkeeper';
      case 'seller':
        return isUrdu ? 'بیج فروش' : 'Seed Seller';
      case 'buyer':
        return isUrdu ? 'خریدار' : 'Buyer';
      default:
        return isUrdu ? 'کسان / باغبان' : 'Farmer / Grower';
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);
    try {
      const fbUser = await signInWithGooglePopup();
      const chosenKeeper = SHOPKEEPER_DIRECTORY.find(
        (k) => k.id === shopkeeperAccountId
      );
      const isAdminEmail =
        fbUser.emailVerified &&
        fbUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      const desiredRole: AuthRole = isAdminEmail
        ? role === 'admin'
          ? 'admin'
          : role
        : role === 'admin'
          ? 'farmer'
          : role;

      const synced = await syncSignedInUserProfile(fbUser, {
        role: desiredRole,
        displayName:
          fbUser.displayName ||
          (desiredRole === 'shopkeeper' && chosenKeeper
            ? isUrdu
              ? chosenKeeper.nameUr
              : chosenKeeper.nameEn
            : fbUser.email?.split('@')[0]) ||
          (isUrdu ? 'کسان صارف' : 'Kisan Member'),
        cityEn:
          desiredRole === 'shopkeeper' && chosenKeeper
            ? chosenKeeper.cityEn
            : cityEn,
        whatsapp: whatsapp.trim(),
        assignedKeeperId:
          desiredRole === 'shopkeeper' ? shopkeeperAccountId : undefined,
      });

      onLoginSuccess(synced.authUser, synced.wishlistIds, synced.cartItems);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('popup-closed-by-user')) {
        setErrorMsg(
          isUrdu
            ? 'گوگل لاگ ان ونڈو بند کر دی گئی۔ دوبارہ کوشش کریں۔'
            : 'Google Sign-In popup was closed. Please try again.'
        );
      } else {
        setErrorMsg(
          isUrdu
            ? `لاگ ان میں خرابی: ${message}`
            : `Sign-In error: ${message}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCurrentRole = async (nextRole: AuthRole) => {
    if (!auth.currentUser) return;
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);
    try {
      const chosenKeeper = SHOPKEEPER_DIRECTORY.find(
        (k) => k.id === shopkeeperAccountId
      );
      const synced = await syncSignedInUserProfile(auth.currentUser, {
        role: nextRole,
        cityEn:
          nextRole === 'shopkeeper' && chosenKeeper
            ? chosenKeeper.cityEn
            : cityEn,
        whatsapp: whatsapp.trim() || undefined,
        assignedKeeperId:
          nextRole === 'shopkeeper' ? shopkeeperAccountId : undefined,
      });
      onLoginSuccess(synced.authUser, synced.wishlistIds, synced.cartItems);
      setRole(synced.authUser.role);
      setStatusMsg(
        isUrdu ? 'اکاؤنٹ کا کردار محفوظ ہو گیا۔' : 'Account role updated.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutFirebase();
      onLogout();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08170D]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#13311D]/95 backdrop-blur-xl border border-[#E5C65A]/30 shadow-2xl overflow-hidden text-[#F8F7EA] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1B4227] border-b border-[#E5C65A]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF0A3] text-[#102B19] flex items-center justify-center shrink-0">
              <Sprout className="w-4 h-4" aria-hidden="true" />
            </div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-[#FFF0A3]">
              {currentUser
                ? isUrdu
                  ? 'گوگل اکاؤنٹ ڈیش بورڈ'
                  : 'Google Account Dashboard'
                : isUrdu
                  ? 'گوگل کے ذریعے سائن ان کریں'
                  : 'Sign In to Desi Beej Exchange'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isUrdu ? 'بند کریں' : 'Close'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#F8F7EA] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#263B20]/70 border border-[#E5C65A]/25 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#FFF0A3] text-[#102B19] flex items-center justify-center shrink-0">
                <User className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-[#FFF0A3] truncate">
                  {currentUser.name}
                </div>
                <div className="text-xs text-[#C7D3BD] truncate">
                  {currentUser.emailOrPhone} · {currentUser.cityEn}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#102B19] border border-[#E5C65A]/40 text-[11px] font-bold text-[#E5C65A]">
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            {statusMsg && (
              <div className="p-3 rounded-xl bg-[#263B20] border border-[#E5C65A]/40 text-xs text-[#FFF0A3]">
                {statusMsg}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-[#E5C65A]">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {currentUser.role === 'admin'
                  ? isUrdu
                    ? 'تصدیق شدہ ایڈمن: آپ کو شاپ مینجمنٹ، سالانہ کرایہ اور منڈی ریٹس کے مکمل اختیارات حاصل ہیں۔'
                    : 'Verified Admin: Full shop rental & mandi rate controls are active.'
                  : currentUser.role === 'shopkeeper'
                    ? isUrdu
                      ? 'دکاندار اکاؤنٹ فعال ہے: آپ اپنی کمیشن شاپ، مصنوعات اور کرایہ کی تفصیلات منظم کر سکتے ہیں۔'
                      : 'Shopkeeper role active: manage your rental shop, products & renewal.'
                    : isUrdu
                      ? 'آپ کا گوگل اکاؤنٹ محفوظ طریقے سے کلاؤڈ ڈیٹابیس سے منسلک ہے۔'
                      : 'Your Google account is synced with Cloud Firestore.'}
              </span>
            </div>

            {auth.currentUser && (
              <div className="p-3.5 rounded-xl bg-[#0D2314]/80 border border-[#44633B] space-y-2.5">
                <label
                  htmlFor="switch-role-select"
                  className="block text-xs font-semibold text-[#FFF0A3]"
                >
                  {isUrdu ? 'اکاؤنٹ کردار تبدیل کریں' : 'Switch Marketplace Role'}
                </label>
                <div className="flex gap-2">
                  <select
                    id="switch-role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as AuthRole)}
                    className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#102B19] border border-[#44633B] text-xs text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                  >
                    <option value="farmer">
                      {isUrdu ? 'کسان / باغبان' : 'Farmer / Grower'}
                    </option>
                    <option value="seller">
                      {isUrdu ? 'بیج فروش' : 'Seed Seller'}
                    </option>
                    <option value="buyer">
                      {isUrdu ? 'خریدار' : 'Buyer'}
                    </option>
                    <option value="shopkeeper">
                      {isUrdu ? 'دکاندار' : 'Shopkeeper'}
                    </option>
                    {(isBootAdminEmail || currentUser.role === 'admin') && (
                      <option value="admin">
                        {isUrdu ? 'پلیٹ فارم ایڈمن' : 'Platform Admin'}
                      </option>
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleUpdateCurrentRole(role)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/45 text-xs font-bold text-[#FFF0A3] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUrdu ? 'محفوظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentUser.role === 'admin' && onOpenAdminPanel && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdminPanel();
                  }}
                  className="sm:col-span-2 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    {isUrdu
                      ? 'ایڈمن شاپ مینجمنٹ کھولیں'
                      : 'Open Admin Shop Management'}
                  </span>
                </button>
              )}

              {(currentUser.role === 'shopkeeper' ||
                currentUser.role === 'admin') &&
                onOpenShopDashboard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenShopDashboard();
                    }}
                    className="sm:col-span-2 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5C65A]/45 bg-[#263B20] hover:bg-[#314B29] text-[#FFF0A3] text-sm font-bold transition-colors cursor-pointer"
                  >
                    <Store className="w-4 h-4 shrink-0 text-[#E5C65A]" />
                    <span>
                      {isUrdu
                        ? 'دکاندار کرایہ و شاپ ڈیش بورڈ'
                        : 'Shopkeeper Rent & Shop Dashboard'}
                    </span>
                  </button>
                )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMyProfile();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1E442A] hover:bg-[#263B20] border border-[#44633B] text-[#FFF0A3] text-sm font-bold transition-colors cursor-pointer"
              >
                {isUrdu ? 'میری پروفائل' : 'My Profile'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSellSeed();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#44633B] bg-[#0D2314] hover:bg-[#263B20] text-[#F8F7EA] text-sm font-semibold transition-colors cursor-pointer"
              >
                {isUrdu ? 'نیا بیج شامل کریں' : 'Sell Your Seeds'}
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleSignOut()}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-400/35 bg-red-950/40 hover:bg-red-900/50 text-red-200 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>{isUrdu ? 'لاگ آؤٹ کریں' : 'Sign Out'}</span>
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-[#D7E2CE] leading-relaxed">
              {isUrdu
                ? 'اپنے گوگل اکاؤنٹ سے سائن ان کریں تاکہ آپ کے بیج، کسان ڈائری، وش لسٹ، کارٹ اور کمیشن شاپ کی تفصیلات کلاؤڈ ڈیٹابیس میں محفوظ رہیں۔'
                : 'Sign in with your Google account to save your seed listings, wishlist, shopping cart, orders, and shopkeeper rental profile in Cloud Firestore.'}
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-xs sm:text-sm text-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="auth-role"
                  className="block text-xs font-semibold text-[#FFF0A3] mb-1"
                >
                  {isUrdu ? 'اکاؤنٹ کی قسم (کردار)' : 'Select Marketplace Role'}
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AuthRole)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                >
                  <option value="farmer">
                    {isUrdu ? 'کسان / باغبان' : 'Farmer / Grower'}
                  </option>
                  <option value="seller">
                    {isUrdu ? 'بیج فروش' : 'Seed Seller'}
                  </option>
                  <option value="buyer">
                    {isUrdu ? 'خریدار / گاہک' : 'Buyer / Customer'}
                  </option>
                  <option value="shopkeeper">
                    {isUrdu
                      ? 'دکاندار (کمیشن شاپ کرایہ دار)'
                      : 'Shopkeeper (Commission Shop)'}
                  </option>
                  <option value="admin">
                    {isUrdu
                      ? 'پلیٹ فارم ایڈمن (صرف مجاز ای میل)'
                      : 'Platform Admin (Authorized Email Only)'}
                  </option>
                </select>
              </div>

              {role === 'shopkeeper' && (
                <div>
                  <label
                    htmlFor="auth-keeper-account"
                    className="block text-xs font-semibold text-[#FFF0A3] mb-1"
                  >
                    {isUrdu
                      ? 'تفویض کردہ دکاندار پروفائل'
                      : 'Assigned Shopkeeper Profile'}
                  </label>
                  <select
                    id="auth-keeper-account"
                    value={shopkeeperAccountId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShopkeeperAccountId(val);
                      const found = SHOPKEEPER_DIRECTORY.find(
                        (k) => k.id === val
                      );
                      if (found) {
                        setCityEn(found.cityEn);
                        setWhatsapp(found.contact);
                      }
                    }}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                  >
                    {SHOPKEEPER_DIRECTORY.map((k) => (
                      <option key={k.id} value={k.id}>
                        {isUrdu ? k.nameUr : k.nameEn} (
                        {isUrdu ? k.cityUr : k.cityEn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-city"
                  className="block text-xs font-semibold text-[#FFF0A3] mb-1"
                >
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#E5C65A]" />
                    {isUrdu ? 'شہر' : 'City'}
                  </span>
                </label>
                <select
                  id="auth-city"
                  value={cityEn}
                  onChange={(e) => setCityEn(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                >
                  {PAKISTANI_CITIES.map((c) => (
                    <option key={c.en} value={c.en}>
                      {isUrdu ? c.ur : c.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="auth-whatsapp"
                  className="block text-xs font-semibold text-[#FFF0A3] mb-1"
                >
                  {isUrdu
                    ? 'واٹس ایپ نمبر (اختیاری)'
                    : 'WhatsApp Number (Optional)'}
                </label>
                <input
                  id="auth-whatsapp"
                  type="text"
                  dir="ltr"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="03001234567"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-[#C7D3BD]">
                <ShieldCheck className="w-4 h-4 text-[#E5C65A] shrink-0" />
                <span>
                  {isUrdu
                    ? 'ایڈمن اختیارات صرف تصدیق شدہ پلیٹ فارم ایڈمن گوگل ای میل کے لیے محفوظ ہیں۔'
                    : 'Admin access is verified server-side via Google Auth & Firestore rules.'}
                </span>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGoogleSignIn()}
                className="w-full min-h-[46px] inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <LogIn className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {loading
                    ? isUrdu
                      ? 'سائن ان ہو رہا ہے...'
                      : 'Signing in...'
                    : isUrdu
                      ? 'گوگل کے ساتھ سائن ان کریں'
                      : 'Continue with Google'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
