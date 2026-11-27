import { useState } from 'react';
import { Eye, MapPin, ShoppingBag, Sprout, Store } from 'lucide-react';
import { CATEGORIES } from '../../data/seeds';
import { CommissionShopItem, Language, ShopProduct } from '../../types';

interface ShopProductCardProps {
  lang: Language;
  product: ShopProduct;
  shop: CommissionShopItem;
  highlighted?: boolean;
  hideShopLink?: boolean;
  onViewDetails: (shopId: string, productId: string) => void;
  onOrderNow: (shopId: string, productId: string) => void;
  onOpenShop?: (shopId: string) => void;
}

export function getCategoryFallbackImage(
  category: ShopProduct['category']
): string {
  switch (category) {
    case 'vegetables':
      return '/src/assets/images/seed_desi_bhindi_1795580775443.jpg';
    case 'fruits':
      return '/src/assets/images/seed_desi_tarbooz_1795580777464.jpg';
    case 'herbs':
      return '/src/assets/images/prod_mustard_sarson_seed_1795753821358.jpg';
    case 'fodder':
      return '/src/assets/images/hero_desi_seeds_harvest_1795580774790.jpg';
    case 'grains':
    default:
      return '/src/assets/images/seed_desi_gandum_1795580778746.jpg';
  }
}

export function ShopProductCard({
  lang,
  product,
  shop,
  highlighted = false,
  hideShopLink = false,
  onViewDetails,
  onOrderNow,
  onOpenShop,
}: ShopProductCardProps) {
  const isUrdu = lang === 'ur';
  const [imgError, setImgError] = useState(false);

  const catMeta = CATEGORIES.find((c) => c.id === product.category);
  const categoryLabel = catMeta
    ? isUrdu
      ? catMeta.ur
      : catMeta.en
    : product.category;

  const varietyLabel = isUrdu
    ? product.varietyUr || 'خالص دیسی قسم'
    : product.varietyEn || 'Heirloom Landrace';

  const bagPrice = product.pricePerBagPkr ?? product.pricePkr;
  const kgPrice = product.pricePerKgPkr ?? bagPrice;
  const resolvedImage =
    product.imageUrl || getCategoryFallbackImage(product.category);

  const cityLabel = isUrdu ? shop.cityUr : shop.cityEn;
  const districtLabel = isUrdu
    ? shop.districtUr || `ضلع ${shop.cityUr}`
    : shop.districtEn || `${shop.cityEn} District`;

  const availableText = product.inStock
    ? `${product.stockQty}${isUrdu ? ' دستیاب' : ' available'}`
    : isUrdu
      ? 'اسٹاک ختم'
      : 'Out of stock';

  return (
    <article
      className={`agri-glass rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
        highlighted
          ? 'ring-2 ring-[#E5C65A] bg-[#263B20]/80'
          : 'hover:border-[#E5C65A]/55'
      }`}
    >
      <div>
        {/* 4:3 Product Media */}
        <button
          type="button"
          onClick={() => onViewDetails(shop.id, product.id)}
          className="relative block w-full aspect-[4/3] bg-[#0D2314] overflow-hidden group cursor-pointer text-start"
          aria-label={isUrdu ? product.nameUr : product.nameEn}
        >
          {!imgError && resolvedImage ? (
            <img
              src={resolvedImage}
              alt={isUrdu ? product.nameUr : product.nameEn}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#183822] to-[#0D2314] text-[#E5C65A] gap-2 p-4">
              <Sprout className="w-10 h-10 opacity-80" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#D7E2CE]">
                {categoryLabel}
              </span>
            </div>
          )}

          {/* Subtle gradient scrim + single top-start status marker when needed */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#102B19]/75 via-transparent to-transparent pointer-events-none" />
          {!product.inStock ? (
            <span className="absolute top-3 start-3 px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-400/50 text-[11px] font-bold text-red-100">
              {isUrdu ? 'اسٹاک ختم' : 'Out of Stock'}
            </span>
          ) : product.featured ? (
            <span className="absolute top-3 start-3 px-2.5 py-1 rounded-lg bg-[#102B19]/90 border border-[#E5C65A]/55 text-[11px] font-bold text-[#FFF0A3]">
              {isUrdu ? 'نمایاں بیج' : 'Featured'}
            </span>
          ) : null}
        </button>

        {/* Card Content */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Unboxed Metadata Line (Zero-Pill) */}
          <p className="text-[11px] sm:text-xs font-semibold text-[#E5C65A] truncate">
            {categoryLabel} · {varietyLabel}
          </p>

          <h3 className="text-base sm:text-lg font-bold text-[#F8F7EA] leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => onViewDetails(shop.id, product.id)}
              className="text-start hover:text-[#FFF0A3] transition-colors cursor-pointer"
            >
              {isUrdu ? product.nameUr : product.nameEn}
            </button>
          </h3>

          {/* Pricing Breakdown: Per Kg & Per Bag */}
          <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-[#0D2314]/85 border border-[#44633B]/65 p-3">
            <div>
              <div className="text-[11px] text-[#C7D3BD]">
                {isUrdu ? 'فی بوری / پیک' : 'Price / Bag'}
              </div>
              <div className="text-sm sm:text-base font-extrabold text-[#FFF0A3] tabular-nums">
                Rs. {bagPrice.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#8DA182]">
                {isUrdu ? product.unitUr : product.unitEn}
              </div>
            </div>

            <div className="border-s border-[#44633B]/60 ps-2.5">
              <div className="text-[11px] text-[#C7D3BD]">
                {isUrdu ? 'فی کلو قیمت' : 'Price / kg'}
              </div>
              <div className="text-sm sm:text-base font-extrabold text-[#E5C65A] tabular-nums">
                Rs. {kgPrice.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#8DA182]">
                {isUrdu ? 'فی کلو گرام' : 'per kg'}
              </div>
            </div>
          </div>

          {/* Available Stock + Shop & Location */}
          <div className="space-y-1.5 text-xs text-[#D7E2CE]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#C7D3BD]">
                {isUrdu ? 'دستیاب اسٹاک:' : 'Available Stock:'}
              </span>
              <span
                className={`font-bold tabular-nums ${
                  product.inStock ? 'text-[#FFF0A3]' : 'text-red-300'
                }`}
              >
                {availableText}
              </span>
            </div>

            {!hideShopLink && onOpenShop && (
              <div className="pt-1 border-t border-[#44633B]/45 space-y-1">
                <button
                  type="button"
                  onClick={() => onOpenShop(shop.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFF0A3] hover:text-[#E5C65A] hover:underline text-start cursor-pointer line-clamp-1"
                >
                  <Store className="w-3.5 h-3.5 text-[#E5C65A] shrink-0" />
                  <span className="truncate">
                    {isUrdu ? shop.shopNameUr : shop.shopNameEn}
                  </span>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-[#C7D3BD]">
                  <MapPin className="w-3 h-3 text-[#E5C65A] shrink-0" />
                  <span className="truncate">
                    {cityLabel}, {districtLabel}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: View Details & Order Now */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onViewDetails(shop.id, product.id)}
          className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs font-bold text-[#F8F7EA] transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-[#E5C65A] shrink-0" />
          <span>{isUrdu ? 'تفصیلات' : 'View Details'}</span>
        </button>

        <button
          type="button"
          disabled={!product.inStock}
          onClick={() => onOrderNow(shop.id, product.id)}
          className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] disabled:bg-[#263B20] disabled:text-[#8DA182] text-xs font-bold text-[#102B19] transition-colors cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span>
            {product.inStock
              ? isUrdu
                ? 'آرڈر کریں'
                : 'Order Now'
              : isUrdu
                ? 'ختم'
                : 'Sold Out'}
          </span>
        </button>
      </div>
    </article>
  );
}
