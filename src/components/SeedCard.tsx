import { useState } from 'react';
import {
  BadgeCheck,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Sprout,
  Star,
  User,
} from 'lucide-react';
import { CATEGORIES, UI_COPY } from '../data/seeds';
import { Language, SeedItem } from '../types';

interface SeedCardProps {
  seed: SeedItem;
  lang: Language;
  rating?: number | null;
  reviewCount?: number;
  distanceKm?: number | null;
  isPhoneHidden?: boolean;
  isSaved?: boolean;
  onToggleSave?: (seedId: string) => void;
  onSelectSeed: (seed: SeedItem, focusChat?: boolean) => void;
  onSelectOwner?: (seed: SeedItem) => void;
  onContactWhatsApp: (seed: SeedItem) => void;
}

export function SeedCard({
  seed,
  lang,
  rating = null,
  reviewCount = 0,
  distanceKm = null,
  isPhoneHidden = Boolean(seed.hidePhone),
  isSaved = false,
  onToggleSave,
  onSelectSeed,
  onSelectOwner,
  onContactWhatsApp,
}: SeedCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const t = UI_COPY[lang];
  const isUrdu = lang === 'ur';

  const categoryObj = CATEGORIES.find((c) => c.id === seed.category);
  const categoryLabel = categoryObj
    ? isUrdu
      ? categoryObj.ur
      : categoryObj.en
    : '';
  const seedName = isUrdu ? seed.nameUr : seed.nameEn;
  const season = isUrdu ? seed.seasonUr : seed.seasonEn;
  const quantity = isUrdu ? seed.quantityUr : seed.quantityEn;
  const city = isUrdu ? seed.cityUr : seed.cityEn;
  const area = seed.hideExactLocation ? '' : isUrdu ? seed.areaUr : seed.areaEn;
  const locationLabel = area ? `${city} · ${area}` : city;
  const owner = isUrdu ? seed.ownerUr : seed.ownerEn;
  const description = isUrdu ? seed.descriptionUr : seed.descriptionEn;

  const isExchange = seed.listingType === 'exchange';

  return (
    <article
      onClick={() => onSelectSeed(seed)}
      className="group flex flex-col rounded-2xl bg-[#183822]/75 backdrop-blur-md border border-[#44633B]/70 hover:border-[#E5C65A]/60 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 cursor-pointer"
    >
      {/* 4:3 Photo Frame with Mandatory Resilient Fallback */}
      <div className="relative aspect-[4/3] w-full bg-[#263B20] overflow-hidden border-b border-[#44633B]/50">
        {seed.imageUrl && !imgFailed ? (
          <img
            src={seed.imageUrl}
            alt={seedName}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#1B4227] via-[#263B20] to-[#102B19]">
            <div className="w-14 h-14 rounded-full bg-[#FFF0A3]/15 border border-[#E5C65A]/30 flex items-center justify-center text-[#FFF0A3] mb-3">
              <Sprout className="w-7 h-7" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-[#FFF0A3]">
              {seedName}
            </span>
            <span className="text-xs text-[#C7D3BD] mt-1">{categoryLabel}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#102B19]/75 to-transparent pointer-events-none" />

        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(seed.id);
            }}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? isUrdu
                  ? 'پسندیدہ فہرست سے ہٹائیں'
                  : 'Remove from My Wishlist'
                : isUrdu
                  ? 'پسندیدہ فہرست میں محفوظ کریں'
                  : 'Save to My Wishlist'
            }
            title={
              isSaved
                ? isUrdu
                  ? 'پسندیدہ میں محفوظ ہے'
                  : 'Saved in My Wishlist'
                : isUrdu
                  ? 'پسندیدہ میں شامل کریں'
                  : 'Save to My Wishlist'
            }
            className={`absolute top-3 end-3 w-10 h-10 rounded-full border backdrop-blur-md shadow-sm flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A] ${
              isSaved
                ? 'bg-[#FFF0A3] border-[#E5C65A] text-[#9E2A1F]'
                : 'bg-[#102B19]/75 hover:bg-[#102B19] border-[#E5C65A]/35 text-[#F8F7EA] hover:text-[#FFF0A3]'
            }`}
          >
            <Heart
              className={`w-5 h-5 ${isSaved ? 'fill-[#9E2A1F] text-[#9E2A1F]' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Quiet unboxed metadata line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#C7D3BD] mb-2">
          <span className="text-[#E5C65A] font-semibold">{categoryLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{isUrdu ? `مقدار: ${quantity}` : `Qty: ${quantity}`}</span>
          <span aria-hidden="true">·</span>
          <span>{season}</span>
          {distanceKm !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#FFF0A3] tabular-nums">
                {isUrdu ? `~${distanceKm} کلومیٹر` : `~${distanceKm} km`}
              </span>
            </>
          )}
        </div>

        {/* Seed Title */}
        <h3 className="text-lg sm:text-xl font-bold text-[#F8F7EA] leading-snug mb-2 group-hover:text-[#FFF0A3] transition-colors">
          {seedName}
        </h3>

        <p className="text-sm text-[#C7D3BD] leading-relaxed line-clamp-2 mb-4">
          {description}
        </p>

        {/* Exchange / Sale Status + Price */}
        <div className="mt-auto pt-3 border-t border-[#E5C65A]/15 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${
                isExchange
                  ? 'bg-[#E5C65A]/15 text-[#FFF0A3] border-[#E5C65A]/40'
                  : 'bg-[#263B20] text-[#E5C65A] border-[#4E7143]'
              }`}
            >
              {isExchange ? t.badgeExchange : t.badgeSale}
            </span>

            {isExchange ? (
              <span className="text-xs font-medium text-[#FFF0A3] truncate max-w-[190px]">
                {isUrdu
                  ? seed.exchangeNoteUr || 'برابر تبادلہ'
                  : seed.exchangeNoteEn || 'Direct swap'}
              </span>
            ) : (
              <span className="text-base font-bold text-[#FFF0A3] tabular-nums whitespace-nowrap">
                {seed.pricePkr ?? 0} {t.currency}{' '}
                <span className="text-xs font-normal text-[#C7D3BD]">
                  / {isUrdu ? seed.unitUr || 'پیکٹ' : seed.unitEn || 'packet'}
                </span>
              </span>
            )}
          </div>

          {/* City/Area and Clickable Owner Name + Trust & Rating */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm text-[#D7E2CE]">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin
                  className="w-4 h-4 text-[#E5C65A] shrink-0"
                  aria-hidden="true"
                />
                <span className="font-semibold truncate">{locationLabel}</span>
              </div>

              {onSelectOwner ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOwner(seed);
                  }}
                  title={isUrdu ? 'کسان پروفائل دیکھیں' : 'View Kisan Profile'}
                  className="inline-flex items-center gap-1.5 min-w-0 text-[#FFF0A3] hover:underline underline-offset-4 font-semibold cursor-pointer"
                >
                  <User className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{owner}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <User
                    className="w-4 h-4 text-[#E5C65A] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{owner}</span>
                </div>
              )}
            </div>

            {rating !== null && (
              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-[#FFF0A3] tabular-nums whitespace-nowrap">
                  <Star
                    className="w-3.5 h-3.5 text-[#E5C65A] fill-[#E5C65A] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{rating.toFixed(1)}</span>
                  <span className="font-normal text-[#C7D3BD]">
                    ({reviewCount})
                  </span>
                </span>

                {rating >= 4.5 && reviewCount >= 1 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#E5C65A] whitespace-nowrap">
                    <BadgeCheck
                      className="w-3.5 h-3.5 text-[#FFF0A3] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t.trustedFarmerBadge}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons or Hidden-Phone Notice */}
          {isPhoneHidden ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#263B20]/80 border border-[#E5C65A]/25 text-xs font-medium text-[#FFF0A3]">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t.phoneHiddenNotice}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSeed(seed, true);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0A3]"
              >
                <MessageSquareText className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t.openAppChatBtn}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSeed(seed);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#E5C65A]/45 bg-[#102B19]/60 hover:bg-[#263B20] text-[#FFF0A3] text-xs sm:text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
              >
                <MessageSquareText className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t.viewDetailsBtn}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onContactWhatsApp(seed);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] active:scale-[0.99] text-[#102B19] text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0A3]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t.whatsappBtn}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
