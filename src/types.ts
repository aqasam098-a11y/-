export type Language = 'ur' | 'en';

export type AppTab =
  | 'home'
  | 'marketplace'
  | 'diary'
  | 'farmers'
  | 'profile'
  | 'add-seed'
  | 'chat-hub'
  | 'ratings'
  | 'nearby'
  | 'commission-shop';

export type CommissionShopSection =
  | 'shops'
  | 'mandi-rates'
  | 'shopkeeper-dashboard'
  | 'admin-shops';

export type CategoryId =
  | 'all'
  | 'vegetables'
  | 'fruits'
  | 'grains'
  | 'herbs'
  | 'fodder';

export type ListingType = 'exchange' | 'sale';

export interface SeedItem {
  id: string;
  ownerId?: string;
  ownerUid?: string;
  nameUr: string;
  nameEn: string;
  category: Exclude<CategoryId, 'all'>;
  quantityUr: string;
  quantityEn: string;
  listingType: ListingType;
  pricePkr?: number;
  unitUr?: string;
  unitEn?: string;
  exchangeNoteUr?: string;
  exchangeNoteEn?: string;
  cityUr: string;
  cityEn: string;
  areaUr?: string;
  areaEn?: string;
  lat?: number;
  lng?: number;
  hideExactLocation?: boolean;
  ownerUr: string;
  ownerEn: string;
  whatsapp: string;
  hidePhone?: boolean;
  seasonUr: string;
  seasonEn: string;
  descriptionUr: string;
  descriptionEn: string;
  detailedDescriptionUr?: string;
  detailedDescriptionEn?: string;
  imageUrl?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  sender: 'owner' | 'buyer';
  type: 'text' | 'voice';
  text?: string;
  audioDataUrl?: string;
  durationSec?: number;
  timestamp: string;
  createdAt: number;
}

export interface SeedReview {
  id: string;
  seedId: string;
  reviewerUid?: string;
  reviewerName: string;
  rating: number;
  comment: string;
  dateLabelUr: string;
  dateLabelEn: string;
  createdAt: number;
}

export type DiaryTopicId =
  | 'all'
  | 'soil_prep'
  | 'organic_fertilizer'
  | 'pest_control'
  | 'seed_saving';

export interface DiaryComment {
  id: string;
  authorUid?: string;
  authorName: string;
  text: string;
  timestamp: string;
  createdAt: number;
}

export interface DiaryPost {
  id: string;
  ownerId?: string;
  ownerUid?: string;
  titleUr: string;
  titleEn: string;
  topic: Exclude<DiaryTopicId, 'all'>;
  contentUr: string;
  contentEn: string;
  authorUr: string;
  authorEn: string;
  cityUr: string;
  cityEn: string;
  dateUr: string;
  dateEn: string;
  imageUrl?: string;
  voiceDataUrl?: string;
  voiceDurationSec?: number;
  likes: number;
  likedByMe?: boolean;
  comments: DiaryComment[];
  createdAt: number;
}

export interface FarmerProfile {
  id: string;
  nameUr: string;
  nameEn: string;
  cityUr: string;
  cityEn: string;
  lat?: number;
  lng?: number;
  hideExactLocation?: boolean;
  whatsapp: string;
  hidePhone: boolean;
  bioUr: string;
  bioEn: string;
  avatarUrl?: string;
  completedExchanges: number;
  isMyProfile?: boolean;
}

export type ShopStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'expired'
  | 'rejected';

export type RentPaymentMethod =
  | 'Easypaisa'
  | 'JazzCash'
  | 'Bank Transfer'
  | 'Cash';

export type RentPaymentStatus = 'confirmed' | 'pending' | 'rejected';

export interface ShopRentPayment {
  id: string;
  shopId: string;
  shopkeeperUid?: string;
  recordedByUid?: string;
  amountPkr: number;
  method: RentPaymentMethod;
  reference: string;
  paymentDate: string;
  status: RentPaymentStatus;
  note?: string;
  recordedBy: string;
  createdAt: number;
}

export interface ShopProduct {
  id: string;
  shopId: string;
  shopkeeperUid?: string;
  nameUr: string;
  nameEn: string;
  varietyUr?: string;
  varietyEn?: string;
  category: Exclude<CategoryId, 'all'>;
  pricePkr: number;
  pricePerBagPkr?: number;
  pricePerKgPkr?: number;
  unitUr: string;
  unitEn: string;
  stockQty: string;
  stockCount?: number;
  minOrderQty?: number;
  inStock: boolean;
  featured?: boolean;
  imageUrl?: string;
  galleryUrls?: string[];
  descriptionUr: string;
  descriptionEn: string;
  cropInfoUr?: string;
  cropInfoEn?: string;
  createdAt: number;
}

export type ShopOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'dispatched'
  | 'completed'
  | 'cancelled';

export interface ShopOrder {
  id: string;
  shopId: string;
  shopkeeperUid?: string;
  buyerUid?: string;
  productId: string;
  productNameUr: string;
  productNameEn: string;
  quantity: number;
  unitLabel?: string;
  totalPkr: number;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  paymentNote: string;
  status: ShopOrderStatus;
  createdAt: number;
}

export interface CartItem {
  id: string;
  shopId: string;
  productId: string;
  unitMode: 'bag' | 'kg';
  quantity: number;
}

export interface MandiRateItem {
  id: string;
  cropNameUr: string;
  cropNameEn: string;
  cityUr: string;
  cityEn: string;
  ratePkr: number;
  unitUr: string;
  unitEn: string;
  trend: 'up' | 'down' | 'stable';
  updatedDate: string;
  linkedShopId?: string;
  linkedProductId?: string;
}

export interface CommissionShopItem {
  id: string;
  shopNameUr: string;
  shopNameEn: string;
  logoEmoji?: string;
  coverImageUrl?: string;
  descriptionUr?: string;
  descriptionEn?: string;
  ownerUr: string;
  ownerEn: string;
  applicantUid?: string;
  assignedShopkeeperUid?: string;
  assignedShopkeeperId?: string;
  assignedShopkeeperContact?: string;
  cityUr: string;
  cityEn: string;
  districtUr?: string;
  districtEn?: string;
  mandiUr: string;
  mandiEn: string;
  specialtyUr: string;
  specialtyEn: string;
  rateNoteUr: string;
  rateNoteEn: string;
  commissionPercent: string;
  whatsapp: string;
  hidePhone?: boolean;
  verified?: boolean;
  featured?: boolean;
  annualRentPkr: number;
  startDate: string;
  expiryDate: string;
  status: ShopStatus;
  renewalRequested?: boolean;
  rejectionReason?: string;
  products: ShopProduct[];
  orders: ShopOrder[];
  paymentHistory: ShopRentPayment[];
  createdAt: number;
}

export type AuthRole =
  | 'admin'
  | 'shopkeeper'
  | 'farmer'
  | 'seller'
  | 'buyer';

export interface AuthUser {
  id: string;
  firebaseUid?: string;
  emailVerified?: boolean;
  name: string;
  emailOrPhone: string;
  cityEn: string;
  role: AuthRole;
  createdAt: number;
}

export type InfoModalTopic =
  | 'contact'
  | 'purity'
  | 'privacy'
  | 'terms'
  | 'about'
  | null;
