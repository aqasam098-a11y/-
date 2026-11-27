import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  INITIAL_COMMISSION_SHOPS,
  INITIAL_DIARY_POSTS,
  INITIAL_MANDI_RATES,
  INITIAL_REVIEWS_BY_SEED,
  INITIAL_SEEDS,
  PAKISTANI_CITIES,
} from '../data/seeds';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  clampStr,
  db,
  handleFirestoreError,
  normalizeIsoDate,
  OperationType,
  sanitizeDocId,
  sanitizeFirestoreImageUrl,
} from '../firebase';
import {
  AuthRole,
  AuthUser,
  CartItem,
  CommissionShopItem,
  DiaryComment,
  DiaryPost,
  FarmerProfile,
  MandiRateItem,
  SeedItem,
  SeedReview,
  ShopOrder,
  ShopOrderStatus,
  ShopProduct,
  ShopRentPayment,
} from '../types';
import { deductProductStock } from '../utils/shopRental';

function tsToMillis(val: unknown, fallback = Date.now()): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (val && typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return fallback;
}

export function isFirebaseBootstrappedAdmin(user: User | null): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
}

function handleSnapshotError(
  error: unknown,
  operationType: OperationType,
  path: string,
  onError?: (err: Error) => void
): void {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (formatted) {
    if (onError) {
      onError(formatted instanceof Error ? formatted : new Error(String(formatted)));
    } else {
      throw formatted;
    }
  }
}

function safeOrderPhone(rawPhone: string | undefined): string {
  const trimmed = clampStr(rawPhone, 32, '03000000000');
  if (trimmed.length >= 4) return trimmed;
  return `${trimmed}0000`.slice(0, 4);
}

/**
 * Ensures /admins/{uid}, /users_public/{uid}, and /users_private/{uid} exist
 * and returns the merged AuthUser + wishlistIds + cartItems + profile details.
 */
export async function syncSignedInUserProfile(
  fbUser: User,
  requestedOptions?: {
    role?: AuthRole;
    displayName?: string;
    cityEn?: string;
    whatsapp?: string;
    assignedKeeperId?: string;
  }
): Promise<{
  authUser: AuthUser;
  wishlistIds: string[];
  cartItems: CartItem[];
  bioUr?: string;
  bioEn?: string;
  hidePhone?: boolean;
}> {
  const uid = fbUser.uid;
  const email = fbUser.email || '';
  const isBootAdmin = isFirebaseBootstrappedAdmin(fbUser);

  if (isBootAdmin) {
    const adminRef = doc(db, 'admins', uid);
    try {
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid,
          email: clampStr(email, 200, BOOTSTRAPPED_ADMIN_EMAIL),
          grantedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
    }
  }

  const privateRef = doc(db, 'users_private', uid);
  const publicRef = doc(db, 'users_public', uid);

  let existingPriv: Record<string, unknown> | null = null;
  let existingPub: Record<string, unknown> | null = null;

  try {
    const [privSnap, pubSnap] = await Promise.all([
      getDoc(privateRef),
      getDoc(publicRef),
    ]);
    existingPriv = privSnap.exists() ? privSnap.data() : null;
    existingPub = pubSnap.exists() ? pubSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users_private/${uid}`);
  }

  let resolvedRole: AuthRole =
    requestedOptions?.role ||
    (existingPriv?.role as AuthRole | undefined) ||
    (isBootAdmin ? 'admin' : 'farmer');

  // Strict RBAC guard: only verified bootstrapped/registered admin can hold 'admin'
  if (resolvedRole === 'admin' && !isBootAdmin) {
    let hasAdminDoc = false;
    try {
      const adminCheck = await getDoc(doc(db, 'admins', uid));
      hasAdminDoc = adminCheck.exists();
    } catch {
      hasAdminDoc = false;
    }
    if (!hasAdminDoc) {
      resolvedRole = 'farmer';
    }
  }

  const resolvedName = clampStr(
    requestedOptions?.displayName ||
      (existingPriv?.displayName as string | undefined) ||
      fbUser.displayName ||
      email.split('@')[0],
    120,
    'Kisan Member'
  );
  const resolvedCityEn = clampStr(
    requestedOptions?.cityEn ||
      (existingPriv?.cityEn as string | undefined) ||
      'Multan',
    80,
    'Multan'
  );
  const cityObj =
    PAKISTANI_CITIES.find((c) => c.en === resolvedCityEn) || PAKISTANI_CITIES[0];
  const resolvedWhatsapp = clampStr(
    requestedOptions?.whatsapp ??
      (existingPriv?.whatsapp as string | undefined) ??
      '',
    32
  );
  const resolvedKeeperId = clampStr(
    requestedOptions?.assignedKeeperId ??
      (existingPriv?.assignedKeeperId as string | undefined) ??
      (resolvedRole === 'shopkeeper' ? 'my-profile' : ''),
    80
  );

  const wishlistIds = Array.isArray(existingPriv?.wishlistIds)
    ? (existingPriv.wishlistIds as unknown[])
        .filter((x): x is string => typeof x === 'string')
        .slice(0, 100)
    : [];

  const cartItems = Array.isArray(existingPriv?.cartItems)
    ? (existingPriv.cartItems as CartItem[]).slice(0, 50)
    : [];

  const batch = writeBatch(db);

  if (!existingPriv) {
    batch.set(privateRef, {
      uid,
      email: clampStr(email, 200),
      displayName: resolvedName,
      whatsapp: resolvedWhatsapp,
      cityEn: resolvedCityEn,
      role: resolvedRole,
      assignedKeeperId: resolvedKeeperId,
      wishlistIds,
      cartItems,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (requestedOptions) {
    batch.update(privateRef, {
      email: clampStr(email, 200),
      displayName: resolvedName,
      whatsapp: resolvedWhatsapp,
      cityEn: resolvedCityEn,
      role: resolvedRole,
      assignedKeeperId: resolvedKeeperId,
      updatedAt: serverTimestamp(),
    });
  }

  if (!existingPub) {
    batch.set(publicRef, {
      uid,
      nameUr: resolvedName,
      nameEn: resolvedName,
      cityUr: clampStr(cityObj.ur, 80, resolvedCityEn),
      cityEn: clampStr(cityObj.en, 80, resolvedCityEn),
      bioUr: clampStr(
        `${cityObj.ur} سے تعلق رکھنے والے دیسی بیج محافظ اور کاشتکار۔`,
        600
      ),
      bioEn: clampStr(
        `Desi Beej Exchange member and grower from ${cityObj.en}.`,
        600
      ),
      hidePhone: false,
      completedExchanges: 0,
      isPublic: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (requestedOptions) {
    batch.update(publicRef, {
      nameUr: resolvedName,
      nameEn: resolvedName,
      cityUr: clampStr(cityObj.ur, 80, resolvedCityEn),
      cityEn: clampStr(cityObj.en, 80, resolvedCityEn),
      updatedAt: serverTimestamp(),
    });
  }

  if (!existingPriv || !existingPub || requestedOptions) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users_private/${uid}`);
    }
  }

  const resolvedUserId =
    resolvedRole === 'admin'
      ? 'platform-admin'
      : resolvedRole === 'shopkeeper' && resolvedKeeperId
        ? resolvedKeeperId
        : uid;

  return {
    authUser: {
      id: resolvedUserId,
      firebaseUid: uid,
      emailVerified: fbUser.emailVerified,
      name: resolvedName,
      emailOrPhone: email || resolvedWhatsapp || uid,
      cityEn: resolvedCityEn,
      role: resolvedRole,
      createdAt: tsToMillis(existingPriv?.createdAt),
    },
    wishlistIds,
    cartItems,
    bioUr: existingPub?.bioUr as string | undefined,
    bioEn: existingPub?.bioEn as string | undefined,
    hidePhone: Boolean(existingPub?.hidePhone),
  };
}

export async function updateFirestoreUserPublicProfile(
  uid: string,
  profile: FarmerProfile
): Promise<void> {
  const ref = doc(db, 'users_public', uid);
  try {
    await updateDoc(ref, {
      nameUr: clampStr(profile.nameUr, 120, 'Kisan Member'),
      nameEn: clampStr(profile.nameEn, 120, 'Kisan Member'),
      cityUr: clampStr(profile.cityUr, 80, 'ملتان'),
      cityEn: clampStr(profile.cityEn, 80, 'Multan'),
      bioUr: clampStr(profile.bioUr, 600),
      bioEn: clampStr(profile.bioEn, 600),
      hidePhone: Boolean(profile.hidePhone),
      isPublic: true,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users_private', uid), {
      displayName: clampStr(profile.nameEn || profile.nameUr, 120, 'Kisan Member'),
      cityEn: clampStr(profile.cityEn, 80, 'Multan'),
      whatsapp: clampStr(profile.whatsapp, 32),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users_public/${uid}`);
  }
}

export async function saveUserWishlistToFirestore(
  uid: string,
  wishlistIds: string[]
): Promise<void> {
  const sanitized = wishlistIds
    .filter((id) => typeof id === 'string' && id.trim().length > 0)
    .slice(0, 100);
  try {
    await updateDoc(doc(db, 'users_private', uid), {
      wishlistIds: sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users_private/${uid}`);
  }
}

export async function saveUserCartToFirestore(
  uid: string,
  cartItems: CartItem[]
): Promise<void> {
  const sanitized = cartItems.slice(0, 50).map((item) => ({
    id: clampStr(item.id, 128, `cart-${Date.now()}`),
    shopId: clampStr(item.shopId, 128),
    productId: clampStr(item.productId, 128),
    unitMode: item.unitMode === 'kg' ? 'kg' : 'bag',
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
  }));
  try {
    await updateDoc(doc(db, 'users_private', uid), {
      cartItems: sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users_private/${uid}`);
  }
}

// --- Seed Initial Collections (Only runs once when Bootstrapped Admin signs in on empty DB) ---
export async function seedInitialDatabaseIfEmpty(adminUid: string): Promise<void> {
  try {
    const [seedsSnap, shopsSnap, ratesSnap, diarySnap] = await Promise.all([
      getDocs(query(collection(db, 'seeds'), where('isPublic', '==', true))),
      getDocs(
        query(collection(db, 'commission_shops'), where('status', '==', 'active'))
      ),
      getDocs(query(collection(db, 'mandi_rates'), where('isPublic', '==', true))),
      getDocs(query(collection(db, 'diary_posts'), where('isPublic', '==', true))),
    ]);

    if (seedsSnap.empty) {
      const parentBatch = writeBatch(db);
      for (const s of INITIAL_SEEDS) {
        const sid = sanitizeDocId(s.id, 'seed');
        parentBatch.set(doc(db, 'seeds', sid), {
          id: sid,
          ownerUid: adminUid,
          nameUr: clampStr(s.nameUr, 140),
          nameEn: clampStr(s.nameEn, 140),
          category: s.category,
          quantityUr: clampStr(s.quantityUr, 80),
          quantityEn: clampStr(s.quantityEn, 80),
          listingType: s.listingType,
          ...(typeof s.pricePkr === 'number' ? { pricePkr: s.pricePkr } : {}),
          ...(s.unitUr ? { unitUr: clampStr(s.unitUr, 60) } : {}),
          ...(s.unitEn ? { unitEn: clampStr(s.unitEn, 60) } : {}),
          ...(s.exchangeNoteUr
            ? { exchangeNoteUr: clampStr(s.exchangeNoteUr, 240) }
            : {}),
          ...(s.exchangeNoteEn
            ? { exchangeNoteEn: clampStr(s.exchangeNoteEn, 240) }
            : {}),
          cityUr: clampStr(s.cityUr, 80),
          cityEn: clampStr(s.cityEn, 80),
          ...(s.areaUr ? { areaUr: clampStr(s.areaUr, 120) } : {}),
          ...(s.areaEn ? { areaEn: clampStr(s.areaEn, 120) } : {}),
          hideExactLocation: Boolean(s.hideExactLocation),
          ownerUr: clampStr(s.ownerUr, 120),
          ownerEn: clampStr(s.ownerEn, 120),
          whatsapp: s.hidePhone ? '' : clampStr(s.whatsapp, 32),
          hidePhone: Boolean(s.hidePhone),
          seasonUr: clampStr(s.seasonUr, 80),
          seasonEn: clampStr(s.seasonEn, 80),
          descriptionUr: clampStr(s.descriptionUr, 1200),
          descriptionEn: clampStr(s.descriptionEn, 1200),
          ...(sanitizeFirestoreImageUrl(s.imageUrl)
            ? { imageUrl: sanitizeFirestoreImageUrl(s.imageUrl) }
            : {}),
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await parentBatch.commit();

      const childBatch = writeBatch(db);
      for (const s of INITIAL_SEEDS) {
        const sid = sanitizeDocId(s.id, 'seed');
        const seedReviews = INITIAL_REVIEWS_BY_SEED[s.id] || [];
        for (const rev of seedReviews) {
          const rid = sanitizeDocId(rev.id, 'rev');
          childBatch.set(doc(db, 'seeds', sid, 'reviews', rid), {
            seedId: sid,
            reviewerUid: adminUid,
            reviewerName: clampStr(rev.reviewerName, 120),
            rating: Math.min(5, Math.max(1, Math.round(rev.rating))),
            comment: clampStr(rev.comment, 800),
            dateLabelUr: clampStr(rev.dateLabelUr, 60),
            dateLabelEn: clampStr(rev.dateLabelEn, 60),
            isPublic: true,
            createdAt: serverTimestamp(),
          });
        }
      }
      await childBatch.commit();
    }

    if (diarySnap.empty) {
      const parentBatch = writeBatch(db);
      for (const p of INITIAL_DIARY_POSTS) {
        const pid = sanitizeDocId(p.id, 'diary');
        parentBatch.set(doc(db, 'diary_posts', pid), {
          id: pid,
          ownerUid: adminUid,
          titleUr: clampStr(p.titleUr, 200),
          titleEn: clampStr(p.titleEn, 200),
          topic: p.topic,
          contentUr: clampStr(p.contentUr, 2500),
          contentEn: clampStr(p.contentEn, 2500),
          authorUr: clampStr(p.authorUr, 120),
          authorEn: clampStr(p.authorEn, 120),
          cityUr: clampStr(p.cityUr, 80),
          cityEn: clampStr(p.cityEn, 80),
          dateUr: clampStr(p.dateUr, 60),
          dateEn: clampStr(p.dateEn, 60),
          ...(sanitizeFirestoreImageUrl(p.imageUrl)
            ? { imageUrl: sanitizeFirestoreImageUrl(p.imageUrl) }
            : {}),
          likesCount: Math.max(0, Math.round(p.likes || 0)),
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await parentBatch.commit();

      const childBatch = writeBatch(db);
      for (const p of INITIAL_DIARY_POSTS) {
        const pid = sanitizeDocId(p.id, 'diary');
        for (const c of p.comments) {
          const cid = sanitizeDocId(c.id, 'cmt');
          childBatch.set(doc(db, 'diary_posts', pid, 'comments', cid), {
            postId: pid,
            authorUid: adminUid,
            authorName: clampStr(c.authorName, 120),
            text: clampStr(c.text, 800),
            timestamp: clampStr(c.timestamp, 60),
            isPublic: true,
            createdAt: serverTimestamp(),
          });
        }
      }
      await childBatch.commit();
    }

    if (shopsSnap.empty) {
      const parentBatch = writeBatch(db);
      for (const shop of INITIAL_COMMISSION_SHOPS) {
        const sid = sanitizeDocId(shop.id, 'shop');
        parentBatch.set(doc(db, 'commission_shops', sid), {
          id: sid,
          applicantUid: adminUid,
          assignedShopkeeperUid: adminUid,
          assignedShopkeeperId: clampStr(
            shop.assignedShopkeeperId || 'my-profile',
            80
          ),
          shopNameUr: clampStr(shop.shopNameUr, 160),
          shopNameEn: clampStr(shop.shopNameEn, 160),
          logoEmoji: clampStr(shop.logoEmoji || '🌾', 16),
          ...(sanitizeFirestoreImageUrl(shop.coverImageUrl)
            ? { coverImageUrl: sanitizeFirestoreImageUrl(shop.coverImageUrl) }
            : {}),
          descriptionUr: clampStr(shop.descriptionUr || shop.specialtyUr, 1200),
          descriptionEn: clampStr(shop.descriptionEn || shop.specialtyEn, 1200),
          ownerUr: clampStr(shop.ownerUr, 120),
          ownerEn: clampStr(shop.ownerEn, 120),
          cityUr: clampStr(shop.cityUr, 80),
          cityEn: clampStr(shop.cityEn, 80),
          districtUr: clampStr(shop.districtUr || `ضلع ${shop.cityUr}`, 100),
          districtEn: clampStr(shop.districtEn || `${shop.cityEn} District`, 100),
          mandiUr: clampStr(shop.mandiUr, 200),
          mandiEn: clampStr(shop.mandiEn, 200),
          specialtyUr: clampStr(shop.specialtyUr, 300),
          specialtyEn: clampStr(shop.specialtyEn, 300),
          rateNoteUr: clampStr(shop.rateNoteUr, 240),
          rateNoteEn: clampStr(shop.rateNoteEn, 240),
          commissionPercent: clampStr(shop.commissionPercent, 20),
          whatsapp: shop.hidePhone ? '' : clampStr(shop.whatsapp, 32),
          hidePhone: Boolean(shop.hidePhone),
          verified: Boolean(shop.verified),
          featured: Boolean(shop.featured),
          annualRentPkr: Math.max(0, Number(shop.annualRentPkr) || 5000),
          startDate: normalizeIsoDate(shop.startDate),
          expiryDate: normalizeIsoDate(shop.expiryDate),
          status: shop.status,
          renewalRequested: Boolean(shop.renewalRequested),
          ...(shop.rejectionReason
            ? { rejectionReason: clampStr(shop.rejectionReason, 400) }
            : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await parentBatch.commit();

      const childBatch = writeBatch(db);
      for (const shop of INITIAL_COMMISSION_SHOPS) {
        const sid = sanitizeDocId(shop.id, 'shop');
        for (const prod of shop.products) {
          const pid = sanitizeDocId(prod.id, 'prod');
          const safeGallery = (prod.galleryUrls || [])
            .map((u) => sanitizeFirestoreImageUrl(u))
            .filter((u): u is string => Boolean(u))
            .slice(0, 6);
          childBatch.set(doc(db, 'commission_shops', sid, 'products', pid), {
            id: pid,
            shopId: sid,
            shopkeeperUid: adminUid,
            nameUr: clampStr(prod.nameUr, 160),
            nameEn: clampStr(prod.nameEn, 160),
            varietyUr: clampStr(prod.varietyUr || '', 120),
            varietyEn: clampStr(prod.varietyEn || '', 120),
            category: prod.category,
            pricePkr: Math.max(0, Number(prod.pricePkr) || 0),
            ...(typeof prod.pricePerBagPkr === 'number'
              ? { pricePerBagPkr: prod.pricePerBagPkr }
              : {}),
            ...(typeof prod.pricePerKgPkr === 'number'
              ? { pricePerKgPkr: prod.pricePerKgPkr }
              : {}),
            unitUr: clampStr(prod.unitUr, 60),
            unitEn: clampStr(prod.unitEn, 60),
            stockQty: clampStr(prod.stockQty, 60),
            stockCount: Math.max(0, Math.round(prod.stockCount ?? 20)),
            minOrderQty: Math.max(1, Math.round(prod.minOrderQty ?? 1)),
            inStock: Boolean(prod.inStock),
            featured: Boolean(prod.featured),
            isPublic: shop.status === 'active',
            ...(sanitizeFirestoreImageUrl(prod.imageUrl)
              ? { imageUrl: sanitizeFirestoreImageUrl(prod.imageUrl) }
              : {}),
            ...(safeGallery.length > 0 ? { galleryUrls: safeGallery } : {}),
            descriptionUr: clampStr(prod.descriptionUr, 1200),
            descriptionEn: clampStr(prod.descriptionEn, 1200),
            cropInfoUr: clampStr(prod.cropInfoUr || '', 500),
            cropInfoEn: clampStr(prod.cropInfoEn || '', 500),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const pay of shop.paymentHistory) {
          const payId = sanitizeDocId(pay.id, 'pay');
          childBatch.set(
            doc(db, 'commission_shops', sid, 'rent_payments', payId),
            {
              id: payId,
              shopId: sid,
              shopkeeperUid: adminUid,
              recordedByUid: adminUid,
              amountPkr: Math.max(1, Number(pay.amountPkr) || 5000),
              method: pay.method,
              reference: clampStr(pay.reference, 100, 'REF-INIT'),
              paymentDate: normalizeIsoDate(pay.paymentDate),
              status: pay.status,
              ...(pay.note ? { note: clampStr(pay.note, 300) } : {}),
              recordedBy: clampStr(pay.recordedBy, 120, 'Platform Admin'),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );
        }

        for (const ord of shop.orders) {
          const oid = sanitizeDocId(ord.id, 'ord');
          const pid = sanitizeDocId(ord.productId, 'prod');
          childBatch.set(doc(db, 'commission_shops', sid, 'orders', oid), {
            id: oid,
            shopId: sid,
            shopkeeperUid: adminUid,
            buyerUid: adminUid,
            productId: pid,
            productNameUr: clampStr(ord.productNameUr, 160),
            productNameEn: clampStr(ord.productNameEn, 160),
            quantity: Math.max(1, Math.round(ord.quantity)),
            ...(ord.unitLabel
              ? { unitLabel: clampStr(ord.unitLabel, 60) }
              : {}),
            totalPkr: Math.max(0, Number(ord.totalPkr) || 0),
            customerName: clampStr(ord.customerName, 120, 'Customer'),
            customerPhone: safeOrderPhone(ord.customerPhone),
            customerCity: clampStr(ord.customerCity, 80, 'Multan'),
            paymentNote: clampStr(ord.paymentNote, 160, 'Cash / Direct'),
            status: ord.status,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await childBatch.commit();
    }

    if (ratesSnap.empty) {
      const batch = writeBatch(db);
      for (const rate of INITIAL_MANDI_RATES) {
        const rid = sanitizeDocId(rate.id, 'rate');
        batch.set(doc(db, 'mandi_rates', rid), {
          id: rid,
          cropNameUr: clampStr(rate.cropNameUr, 140),
          cropNameEn: clampStr(rate.cropNameEn, 140),
          cityUr: clampStr(rate.cityUr, 80),
          cityEn: clampStr(rate.cityEn, 80),
          ratePkr: Math.max(0, Number(rate.ratePkr) || 0),
          unitUr: clampStr(rate.unitUr, 60),
          unitEn: clampStr(rate.unitEn, 60),
          trend: rate.trend,
          updatedDate: normalizeIsoDate(rate.updatedDate),
          ...(rate.linkedShopId
            ? { linkedShopId: clampStr(rate.linkedShopId, 128) }
            : {}),
          ...(rate.linkedProductId
            ? { linkedProductId: clampStr(rate.linkedProductId, 128) }
            : {}),
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedInitialDatabaseIfEmpty');
  }
}

// --- Seeds & Reviews Operations ---
export function subscribePublicSeeds(
  onData: (seeds: SeedItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'seeds'), where('isPublic', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SeedItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          ownerId: data.ownerUid,
          ownerUid: data.ownerUid,
          nameUr: data.nameUr || '',
          nameEn: data.nameEn || '',
          category: data.category || 'vegetables',
          quantityUr: data.quantityUr || '',
          quantityEn: data.quantityEn || '',
          listingType: data.listingType || 'exchange',
          pricePkr: data.pricePkr,
          unitUr: data.unitUr,
          unitEn: data.unitEn,
          exchangeNoteUr: data.exchangeNoteUr,
          exchangeNoteEn: data.exchangeNoteEn,
          cityUr: data.cityUr || '',
          cityEn: data.cityEn || '',
          areaUr: data.areaUr,
          areaEn: data.areaEn,
          hideExactLocation: Boolean(data.hideExactLocation),
          ownerUr: data.ownerUr || '',
          ownerEn: data.ownerEn || '',
          whatsapp: data.whatsapp || '',
          hidePhone: Boolean(data.hidePhone),
          seasonUr: data.seasonUr || '',
          seasonEn: data.seasonEn || '',
          descriptionUr: data.descriptionUr || '',
          descriptionEn: data.descriptionEn || '',
          imageUrl: data.imageUrl,
          createdAt: tsToMillis(data.createdAt),
        };
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      onData(list);
    },
    (error) => {
      handleSnapshotError(error, OperationType.LIST, 'seeds', onError);
    }
  );
}

export async function createSeedInFirestore(
  seed: SeedItem,
  ownerUid: string
): Promise<void> {
  const sid = sanitizeDocId(seed.id, 'seed');
  try {
    await setDoc(doc(db, 'seeds', sid), {
      id: sid,
      ownerUid,
      nameUr: clampStr(seed.nameUr, 140, seed.nameEn),
      nameEn: clampStr(seed.nameEn, 140, seed.nameUr),
      category: seed.category,
      quantityUr: clampStr(seed.quantityUr, 80, '1 Pack'),
      quantityEn: clampStr(seed.quantityEn, 80, '1 Pack'),
      listingType: seed.listingType,
      ...(typeof seed.pricePkr === 'number' ? { pricePkr: seed.pricePkr } : {}),
      ...(seed.unitUr ? { unitUr: clampStr(seed.unitUr, 60) } : {}),
      ...(seed.unitEn ? { unitEn: clampStr(seed.unitEn, 60) } : {}),
      ...(seed.exchangeNoteUr
        ? { exchangeNoteUr: clampStr(seed.exchangeNoteUr, 240) }
        : {}),
      ...(seed.exchangeNoteEn
        ? { exchangeNoteEn: clampStr(seed.exchangeNoteEn, 240) }
        : {}),
      cityUr: clampStr(seed.cityUr, 80, 'ملتان'),
      cityEn: clampStr(seed.cityEn, 80, 'Multan'),
      ...(seed.areaUr ? { areaUr: clampStr(seed.areaUr, 120) } : {}),
      ...(seed.areaEn ? { areaEn: clampStr(seed.areaEn, 120) } : {}),
      hideExactLocation: Boolean(seed.hideExactLocation),
      ownerUr: clampStr(seed.ownerUr, 120, 'Kisan'),
      ownerEn: clampStr(seed.ownerEn, 120, 'Kisan'),
      whatsapp: seed.hidePhone ? '' : clampStr(seed.whatsapp, 32),
      hidePhone: Boolean(seed.hidePhone),
      seasonUr: clampStr(seed.seasonUr, 80),
      seasonEn: clampStr(seed.seasonEn, 80),
      descriptionUr: clampStr(seed.descriptionUr, 1200, seed.descriptionEn),
      descriptionEn: clampStr(seed.descriptionEn, 1200, seed.descriptionUr),
      ...(sanitizeFirestoreImageUrl(seed.imageUrl)
        ? { imageUrl: sanitizeFirestoreImageUrl(seed.imageUrl) }
        : {}),
      isPublic: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `seeds/${sid}`);
  }
}

export function subscribeSeedReviews(
  seedId: string,
  onData: (reviews: SeedReview[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const sid = sanitizeDocId(seedId, 'seed');
  const q = query(
    collection(db, 'seeds', sid, 'reviews'),
    where('isPublic', '==', true)
  );
  return onSnapshot(
    q,
    (snap) => {
      const reviews: SeedReview[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          seedId: data.seedId || sid,
          reviewerUid: data.reviewerUid,
          reviewerName: data.reviewerName || '',
          rating: Number(data.rating) || 5,
          comment: data.comment || '',
          dateLabelUr: data.dateLabelUr || '',
          dateLabelEn: data.dateLabelEn || '',
          createdAt: tsToMillis(data.createdAt),
        };
      });
      reviews.sort((a, b) => b.createdAt - a.createdAt);
      onData(reviews);
    },
    (error) => {
      handleSnapshotError(
        error,
        OperationType.LIST,
        `seeds/${sid}/reviews`,
        onError
      );
    }
  );
}

export async function addSeedReviewInFirestore(
  seedId: string,
  review: SeedReview,
  reviewerUid: string
): Promise<void> {
  const sid = sanitizeDocId(seedId, 'seed');
  const rid = sanitizeDocId(review.id, 'rev');
  try {
    await setDoc(doc(db, 'seeds', sid, 'reviews', rid), {
      seedId: sid,
      reviewerUid,
      reviewerName: clampStr(review.reviewerName, 120, 'Farmer'),
      rating: Math.min(5, Math.max(1, Math.round(review.rating))),
      comment: clampStr(review.comment, 800, 'Great seed'),
      dateLabelUr: clampStr(review.dateLabelUr, 60),
      dateLabelEn: clampStr(review.dateLabelEn, 60),
      isPublic: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `seeds/${sid}/reviews/${rid}`
    );
  }
}

// --- Kisan Diary Operations ---
export function subscribePublicDiaryPosts(
  onData: (posts: DiaryPost[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'diary_posts'),
    where('isPublic', '==', true)
  );
  return onSnapshot(
    q,
    (snap) => {
      const posts: DiaryPost[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          ownerId: data.ownerUid,
          ownerUid: data.ownerUid,
          titleUr: data.titleUr || '',
          titleEn: data.titleEn || '',
          topic: data.topic || 'seed_saving',
          contentUr: data.contentUr || '',
          contentEn: data.contentEn || '',
          authorUr: data.authorUr || '',
          authorEn: data.authorEn || '',
          cityUr: data.cityUr || '',
          cityEn: data.cityEn || '',
          dateUr: data.dateUr || '',
          dateEn: data.dateEn || '',
          imageUrl: data.imageUrl,
          likes: Math.max(0, Number(data.likesCount) || 0),
          comments: [],
          createdAt: tsToMillis(data.createdAt),
        };
      });
      posts.sort((a, b) => b.createdAt - a.createdAt);
      onData(posts);
    },
    (error) => {
      handleSnapshotError(error, OperationType.LIST, 'diary_posts', onError);
    }
  );
}

export async function createDiaryPostInFirestore(
  post: DiaryPost,
  ownerUid: string
): Promise<void> {
  const pid = sanitizeDocId(post.id, 'diary');
  try {
    await setDoc(doc(db, 'diary_posts', pid), {
      id: pid,
      ownerUid,
      titleUr: clampStr(post.titleUr, 200, post.titleEn),
      titleEn: clampStr(post.titleEn, 200, post.titleUr),
      topic: post.topic,
      contentUr: clampStr(post.contentUr, 2500, post.contentEn),
      contentEn: clampStr(post.contentEn, 2500, post.contentUr),
      authorUr: clampStr(post.authorUr, 120, 'Kisan'),
      authorEn: clampStr(post.authorEn, 120, 'Kisan'),
      cityUr: clampStr(post.cityUr, 80, 'ملتان'),
      cityEn: clampStr(post.cityEn, 80, 'Multan'),
      dateUr: clampStr(post.dateUr, 60),
      dateEn: clampStr(post.dateEn, 60),
      ...(sanitizeFirestoreImageUrl(post.imageUrl)
        ? { imageUrl: sanitizeFirestoreImageUrl(post.imageUrl) }
        : {}),
      likesCount: 0,
      isPublic: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `diary_posts/${pid}`);
  }
}

export async function toggleDiaryLikeInFirestore(
  postId: string,
  uid: string
): Promise<boolean> {
  const pid = sanitizeDocId(postId, 'diary');
  const postRef = doc(db, 'diary_posts', pid);
  const likeRef = doc(db, 'diary_posts', pid, 'likes', uid);
  try {
    const [postSnap, likeSnap] = await Promise.all([
      getDoc(postRef),
      getDoc(likeRef),
    ]);
    if (!postSnap.exists()) return false;
    const currentLikes = Math.max(0, Number(postSnap.data().likesCount) || 0);
    const batch = writeBatch(db);
    if (likeSnap.exists()) {
      batch.delete(likeRef);
      batch.update(postRef, {
        likesCount: Math.max(0, currentLikes - 1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return false;
    } else {
      batch.set(likeRef, {
        uid,
        postId: pid,
        createdAt: serverTimestamp(),
      });
      batch.update(postRef, {
        likesCount: currentLikes + 1,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return true;
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `diary_posts/${pid}/likes/${uid}`
    );
  }
}

export async function addDiaryCommentInFirestore(
  postId: string,
  comment: DiaryComment,
  authorUid: string
): Promise<void> {
  const pid = sanitizeDocId(postId, 'diary');
  const cid = sanitizeDocId(comment.id, 'cmt');
  try {
    await setDoc(doc(db, 'diary_posts', pid, 'comments', cid), {
      postId: pid,
      authorUid,
      authorName: clampStr(comment.authorName, 120, 'Kisan Member'),
      text: clampStr(comment.text, 800, '...'),
      timestamp: clampStr(comment.timestamp, 60),
      isPublic: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `diary_posts/${pid}/comments/${cid}`
    );
  }
}

// --- Commission Shops, Products, Orders, Rent Payments & Mandi Rates ---
export function subscribeCommissionShopsForContext(
  fbUser: User | null,
  onShops: (shops: CommissionShopItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const isBootAdmin = isFirebaseBootstrappedAdmin(fbUser);
  const shopMap = new Map<string, CommissionShopItem>();
  const childUnsubsByShop = new Map<string, Unsubscribe[]>();

  const emit = () => {
    const list = Array.from(shopMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
    onShops(list);
  };

  const mapShopDoc = (
    id: string,
    data: Record<string, unknown>,
    prev?: CommissionShopItem
  ): CommissionShopItem => ({
    id: (data.id as string) || id,
    applicantUid: data.applicantUid as string | undefined,
    assignedShopkeeperUid: data.assignedShopkeeperUid as string | undefined,
    assignedShopkeeperId: data.assignedShopkeeperId as string | undefined,
    shopNameUr: (data.shopNameUr as string) || '',
    shopNameEn: (data.shopNameEn as string) || '',
    logoEmoji: (data.logoEmoji as string) || '🌾',
    coverImageUrl: data.coverImageUrl as string | undefined,
    descriptionUr: data.descriptionUr as string | undefined,
    descriptionEn: data.descriptionEn as string | undefined,
    ownerUr: (data.ownerUr as string) || '',
    ownerEn: (data.ownerEn as string) || '',
    cityUr: (data.cityUr as string) || '',
    cityEn: (data.cityEn as string) || '',
    districtUr: data.districtUr as string | undefined,
    districtEn: data.districtEn as string | undefined,
    mandiUr: (data.mandiUr as string) || '',
    mandiEn: (data.mandiEn as string) || '',
    specialtyUr: (data.specialtyUr as string) || '',
    specialtyEn: (data.specialtyEn as string) || '',
    rateNoteUr: (data.rateNoteUr as string) || '',
    rateNoteEn: (data.rateNoteEn as string) || '',
    commissionPercent: (data.commissionPercent as string) || '1.5%',
    whatsapp: (data.whatsapp as string) || '',
    hidePhone: Boolean(data.hidePhone),
    verified: Boolean(data.verified),
    featured: Boolean(data.featured),
    annualRentPkr:
      typeof data.annualRentPkr === 'number' && data.annualRentPkr >= 0
        ? data.annualRentPkr
        : 5000,
    startDate: (data.startDate as string) || '2026-01-01',
    expiryDate: (data.expiryDate as string) || '2027-01-01',
    status: (data.status as CommissionShopItem['status']) || 'pending',
    renewalRequested: Boolean(data.renewalRequested),
    rejectionReason: data.rejectionReason as string | undefined,
    products: prev?.products || [],
    orders: prev?.orders || [],
    paymentHistory: prev?.paymentHistory || [],
    createdAt: tsToMillis(data.createdAt),
  });

  const detachShopSubcollections = (shopId: string) => {
    const unsubs = childUnsubsByShop.get(shopId);
    if (unsubs) {
      unsubs.forEach((u) => u());
      childUnsubsByShop.delete(shopId);
    }
  };

  const attachShopSubcollections = (shop: CommissionShopItem) => {
    if (childUnsubsByShop.has(shop.id)) return;
    const unsubsForThisShop: Unsubscribe[] = [];
    childUnsubsByShop.set(shop.id, unsubsForThisShop);

    const uid = fbUser?.uid;
    const isKeeper =
      Boolean(uid) &&
      (shop.applicantUid === uid || shop.assignedShopkeeperUid === uid);

    const prodQ = isBootAdmin
      ? collection(db, 'commission_shops', shop.id, 'products')
      : isKeeper && uid
        ? query(
            collection(db, 'commission_shops', shop.id, 'products'),
            where('shopkeeperUid', '==', uid)
          )
        : query(
            collection(db, 'commission_shops', shop.id, 'products'),
            where('isPublic', '==', true)
          );

    unsubsForThisShop.push(
      onSnapshot(
        prodQ,
        (snap) => {
          const current = shopMap.get(shop.id);
          if (!current) return;
          const products: ShopProduct[] = snap.docs
            .map((d) => {
              const p = d.data();
              return {
                id: p.id || d.id,
                shopId: shop.id,
                shopkeeperUid: p.shopkeeperUid,
                nameUr: p.nameUr || '',
                nameEn: p.nameEn || '',
                varietyUr: p.varietyUr,
                varietyEn: p.varietyEn,
                category: p.category || 'grains',
                pricePkr: Number(p.pricePkr) || 0,
                pricePerBagPkr: p.pricePerBagPkr,
                pricePerKgPkr: p.pricePerKgPkr,
                unitUr: p.unitUr || '',
                unitEn: p.unitEn || '',
                stockQty: p.stockQty || '0 Units',
                stockCount: Number(p.stockCount) || 0,
                minOrderQty: Number(p.minOrderQty) || 1,
                inStock: Boolean(p.inStock),
                featured: Boolean(p.featured),
                imageUrl: p.imageUrl,
                galleryUrls: Array.isArray(p.galleryUrls)
                  ? p.galleryUrls
                  : undefined,
                descriptionUr: p.descriptionUr || '',
                descriptionEn: p.descriptionEn || '',
                cropInfoUr: p.cropInfoUr,
                cropInfoEn: p.cropInfoEn,
                createdAt: tsToMillis(p.createdAt),
              };
            })
            .sort((a, b) => b.createdAt - a.createdAt);
          shopMap.set(shop.id, { ...current, products });
          emit();
        },
        (error) => {
          handleSnapshotError(
            error,
            OperationType.LIST,
            `commission_shops/${shop.id}/products`,
            onError
          );
        }
      )
    );

    if (fbUser && fbUser.emailVerified) {
      const orderQ = isBootAdmin
        ? collection(db, 'commission_shops', shop.id, 'orders')
        : isKeeper
          ? query(
              collection(db, 'commission_shops', shop.id, 'orders'),
              where('shopkeeperUid', '==', fbUser.uid)
            )
          : query(
              collection(db, 'commission_shops', shop.id, 'orders'),
              where('buyerUid', '==', fbUser.uid)
            );

      unsubsForThisShop.push(
        onSnapshot(
          orderQ,
          (snap) => {
            const current = shopMap.get(shop.id);
            if (!current) return;
            const orders: ShopOrder[] = snap.docs
              .map((d) => {
                const o = d.data();
                return {
                  id: o.id || d.id,
                  shopId: shop.id,
                  shopkeeperUid: o.shopkeeperUid,
                  buyerUid: o.buyerUid,
                  productId: o.productId || '',
                  productNameUr: o.productNameUr || '',
                  productNameEn: o.productNameEn || '',
                  quantity: Number(o.quantity) || 1,
                  unitLabel: o.unitLabel,
                  totalPkr: Number(o.totalPkr) || 0,
                  customerName: o.customerName || '',
                  customerPhone: o.customerPhone || '',
                  customerCity: o.customerCity || '',
                  paymentNote: o.paymentNote || '',
                  status: o.status || 'pending',
                  createdAt: tsToMillis(o.createdAt),
                };
              })
              .sort((a, b) => b.createdAt - a.createdAt);
            shopMap.set(shop.id, { ...current, orders });
            emit();
          },
          (error) => {
            handleSnapshotError(
              error,
              OperationType.LIST,
              `commission_shops/${shop.id}/orders`,
              onError
            );
          }
        )
      );

      if (isBootAdmin || isKeeper) {
        const payQ = isBootAdmin
          ? collection(db, 'commission_shops', shop.id, 'rent_payments')
          : query(
              collection(db, 'commission_shops', shop.id, 'rent_payments'),
              where('shopkeeperUid', '==', fbUser.uid)
            );
        unsubsForThisShop.push(
          onSnapshot(
            payQ,
            (snap) => {
              const current = shopMap.get(shop.id);
              if (!current) return;
              const paymentHistory: ShopRentPayment[] = snap.docs
                .map((d) => {
                  const p = d.data();
                  return {
                    id: p.id || d.id,
                    shopId: shop.id,
                    shopkeeperUid: p.shopkeeperUid,
                    recordedByUid: p.recordedByUid,
                    amountPkr: Number(p.amountPkr) || 0,
                    method: p.method || 'Cash',
                    reference: p.reference || '',
                    paymentDate: p.paymentDate || '',
                    status: p.status || 'pending',
                    note: p.note,
                    recordedBy: p.recordedBy || '',
                    createdAt: tsToMillis(p.createdAt),
                  };
                })
                .sort((a, b) => b.createdAt - a.createdAt);
              shopMap.set(shop.id, { ...current, paymentHistory });
              emit();
            },
            (error) => {
              handleSnapshotError(
                error,
                OperationType.LIST,
                `commission_shops/${shop.id}/rent_payments`,
                onError
              );
            }
          )
        );
      }
    }
  };

  const shopQueries = isBootAdmin
    ? [collection(db, 'commission_shops')]
    : fbUser && fbUser.emailVerified
      ? [
          query(collection(db, 'commission_shops'), where('status', '==', 'active')),
          query(
            collection(db, 'commission_shops'),
            where('applicantUid', '==', fbUser.uid)
          ),
          query(
            collection(db, 'commission_shops'),
            where('assignedShopkeeperUid', '==', fbUser.uid)
          ),
        ]
      : [query(collection(db, 'commission_shops'), where('status', '==', 'active'))];

  const queryDocIds: Array<Set<string>> = shopQueries.map(() => new Set<string>());

  const mainUnsubs = shopQueries.map((q, qIdx) =>
    onSnapshot(
      q,
      (snap) => {
        const nextSet = new Set<string>();
        for (const d of snap.docs) {
          nextSet.add(d.id);
          const prev = shopMap.get(d.id);
          const mapped = mapShopDoc(d.id, d.data(), prev);
          shopMap.set(d.id, mapped);
          attachShopSubcollections(mapped);
        }
        queryDocIds[qIdx] = nextSet;

        const unionIds = new Set<string>();
        for (const s of queryDocIds) {
          for (const id of s) unionIds.add(id);
        }
        for (const existingId of Array.from(shopMap.keys())) {
          if (!unionIds.has(existingId)) {
            detachShopSubcollections(existingId);
            shopMap.delete(existingId);
          }
        }
        emit();
      },
      (error) => {
        handleSnapshotError(error, OperationType.LIST, 'commission_shops', onError);
      }
    )
  );

  return () => {
    mainUnsubs.forEach((u) => u());
    for (const unsubs of childUnsubsByShop.values()) {
      unsubs.forEach((u) => u());
    }
    childUnsubsByShop.clear();
  };
}

export function subscribePublicMandiRates(
  onRates: (rates: MandiRateItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'mandi_rates'), where('isPublic', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list: MandiRateItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          cropNameUr: data.cropNameUr || '',
          cropNameEn: data.cropNameEn || '',
          cityUr: data.cityUr || '',
          cityEn: data.cityEn || '',
          ratePkr: Number(data.ratePkr) || 0,
          unitUr: data.unitUr || '',
          unitEn: data.unitEn || '',
          trend: data.trend || 'stable',
          updatedDate: data.updatedDate || '',
          linkedShopId: data.linkedShopId,
          linkedProductId: data.linkedProductId,
        };
      });
      onRates(list);
    },
    (error) => {
      handleSnapshotError(error, OperationType.LIST, 'mandi_rates', onError);
    }
  );
}

export async function createCommissionShopInFirestore(
  shop: CommissionShopItem,
  applicantUid: string
): Promise<void> {
  const sid = sanitizeDocId(shop.id, 'shop');
  try {
    await setDoc(doc(db, 'commission_shops', sid), {
      id: sid,
      applicantUid,
      assignedShopkeeperUid: shop.assignedShopkeeperUid || applicantUid,
      assignedShopkeeperId: clampStr(
        shop.assignedShopkeeperId || applicantUid,
        80
      ),
      shopNameUr: clampStr(shop.shopNameUr, 160),
      shopNameEn: clampStr(shop.shopNameEn, 160),
      logoEmoji: clampStr(shop.logoEmoji || '🌾', 16),
      ...(sanitizeFirestoreImageUrl(shop.coverImageUrl)
        ? { coverImageUrl: sanitizeFirestoreImageUrl(shop.coverImageUrl) }
        : {}),
      descriptionUr: clampStr(shop.descriptionUr || shop.specialtyUr, 1200),
      descriptionEn: clampStr(shop.descriptionEn || shop.specialtyEn, 1200),
      ownerUr: clampStr(shop.ownerUr, 120),
      ownerEn: clampStr(shop.ownerEn, 120),
      cityUr: clampStr(shop.cityUr, 80),
      cityEn: clampStr(shop.cityEn, 80),
      districtUr: clampStr(shop.districtUr || `ضلع ${shop.cityUr}`, 100),
      districtEn: clampStr(shop.districtEn || `${shop.cityEn} District`, 100),
      mandiUr: clampStr(shop.mandiUr, 200),
      mandiEn: clampStr(shop.mandiEn, 200),
      specialtyUr: clampStr(shop.specialtyUr, 300),
      specialtyEn: clampStr(shop.specialtyEn, 300),
      rateNoteUr: clampStr(shop.rateNoteUr, 240),
      rateNoteEn: clampStr(shop.rateNoteEn, 240),
      commissionPercent: clampStr(shop.commissionPercent, 20),
      whatsapp: shop.hidePhone ? '' : clampStr(shop.whatsapp, 32),
      hidePhone: Boolean(shop.hidePhone),
      verified: Boolean(shop.verified),
      featured: Boolean(shop.featured),
      annualRentPkr: Math.max(0, Number(shop.annualRentPkr) || 5000),
      startDate: normalizeIsoDate(shop.startDate),
      expiryDate: normalizeIsoDate(shop.expiryDate),
      status: shop.status,
      renewalRequested: Boolean(shop.renewalRequested),
      ...(shop.rejectionReason
        ? { rejectionReason: clampStr(shop.rejectionReason, 400) }
        : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `commission_shops/${sid}`
    );
  }
}

export async function updateCommissionShopInFirestore(
  shopId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  const cleaned = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  try {
    await updateDoc(doc(db, 'commission_shops', sid), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `commission_shops/${sid}`
    );
  }
}

export async function syncShopProductsVisibilityInFirestore(
  shopId: string,
  isShopActive: boolean
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  try {
    const snap = await getDocs(
      collection(db, 'commission_shops', sid, 'products')
    );
    const docsToUpdate = snap.docs.filter(
      (d) => Boolean(d.data().isPublic) !== isShopActive
    );
    if (docsToUpdate.length === 0) return;
    const batch = writeBatch(db);
    for (const d of docsToUpdate) {
      batch.update(d.ref, {
        isPublic: isShopActive,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `commission_shops/${sid}/products`
    );
  }
}

export async function deleteCommissionShopInFirestore(
  shopId: string
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  try {
    await deleteDoc(doc(db, 'commission_shops', sid));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `commission_shops/${sid}`
    );
  }
}

export async function createShopProductInFirestore(
  shopId: string,
  product: ShopProduct,
  shopkeeperUid: string,
  isShopActive: boolean
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  const pid = sanitizeDocId(product.id, 'prod');
  const safeGallery = (product.galleryUrls || [])
    .map((u) => sanitizeFirestoreImageUrl(u))
    .filter((u): u is string => Boolean(u))
    .slice(0, 6);
  try {
    await setDoc(doc(db, 'commission_shops', sid, 'products', pid), {
      id: pid,
      shopId: sid,
      shopkeeperUid,
      nameUr: clampStr(product.nameUr, 160),
      nameEn: clampStr(product.nameEn, 160),
      varietyUr: clampStr(product.varietyUr || '', 120),
      varietyEn: clampStr(product.varietyEn || '', 120),
      category: product.category,
      pricePkr: Math.max(0, Number(product.pricePkr) || 0),
      ...(typeof product.pricePerBagPkr === 'number'
        ? { pricePerBagPkr: product.pricePerBagPkr }
        : {}),
      ...(typeof product.pricePerKgPkr === 'number'
        ? { pricePerKgPkr: product.pricePerKgPkr }
        : {}),
      unitUr: clampStr(product.unitUr, 60),
      unitEn: clampStr(product.unitEn, 60),
      stockQty: clampStr(product.stockQty, 60),
      stockCount: Math.max(0, Math.round(product.stockCount ?? 10)),
      minOrderQty: Math.max(1, Math.round(product.minOrderQty ?? 1)),
      inStock: Boolean(product.inStock),
      featured: Boolean(product.featured),
      isPublic: isShopActive,
      ...(sanitizeFirestoreImageUrl(product.imageUrl)
        ? { imageUrl: sanitizeFirestoreImageUrl(product.imageUrl) }
        : {}),
      ...(safeGallery.length > 0 ? { galleryUrls: safeGallery } : {}),
      descriptionUr: clampStr(product.descriptionUr, 1200, product.descriptionEn),
      descriptionEn: clampStr(product.descriptionEn, 1200, product.descriptionUr),
      cropInfoUr: clampStr(product.cropInfoUr || '', 500),
      cropInfoEn: clampStr(product.cropInfoEn || '', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `commission_shops/${sid}/products/${pid}`
    );
  }
}

export async function updateShopProductInFirestore(
  shopId: string,
  productId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  const pid = sanitizeDocId(productId, 'prod');
  const cleaned = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  try {
    await updateDoc(doc(db, 'commission_shops', sid, 'products', pid), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `commission_shops/${sid}/products/${pid}`
    );
  }
}

export async function deleteShopProductInFirestore(
  shopId: string,
  productId: string
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  const pid = sanitizeDocId(productId, 'prod');
  try {
    await deleteDoc(doc(db, 'commission_shops', sid, 'products', pid));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `commission_shops/${sid}/products/${pid}`
    );
  }
}

export async function placeShopOrderAtomicInFirestore(
  shop: CommissionShopItem,
  order: ShopOrder,
  buyerUid: string
): Promise<void> {
  const sid = sanitizeDocId(shop.id, 'shop');
  const oid = sanitizeDocId(order.id, 'ord');
  const pid = sanitizeDocId(order.productId, 'prod');
  const prod = shop.products.find((p) => p.id === order.productId);
  const safeQuantity = Math.max(1, Math.round(order.quantity));

  const batch = writeBatch(db);
  batch.set(doc(db, 'commission_shops', sid, 'orders', oid), {
    id: oid,
    shopId: sid,
    shopkeeperUid: shop.assignedShopkeeperUid || shop.applicantUid || '',
    buyerUid,
    productId: pid,
    productNameUr: clampStr(order.productNameUr, 160),
    productNameEn: clampStr(order.productNameEn, 160),
    quantity: safeQuantity,
    ...(order.unitLabel ? { unitLabel: clampStr(order.unitLabel, 60) } : {}),
    totalPkr: Math.max(0, Number(order.totalPkr) || 0),
    customerName: clampStr(order.customerName, 120, 'Customer'),
    customerPhone: safeOrderPhone(order.customerPhone),
    customerCity: clampStr(order.customerCity, 80, 'Multan'),
    paymentNote: clampStr(order.paymentNote, 160, 'Cash / Direct'),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (prod) {
    const deducted = deductProductStock(prod, safeQuantity);
    if ((deducted.stockCount ?? 0) < Math.round(prod.stockCount ?? 0)) {
      batch.update(doc(db, 'commission_shops', sid, 'products', pid), {
        stockCount: deducted.stockCount,
        stockQty: clampStr(deducted.stockQty, 60),
        inStock: Boolean(deducted.inStock),
        lastOrderId: oid,
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `commission_shops/${sid}/orders/${oid}`
    );
  }
}

export async function placeMultipleShopOrdersSequentialInFirestore(
  shops: CommissionShopItem[],
  ordersToPlace: Array<{ shopId: string; order: ShopOrder }>,
  buyerUid: string
): Promise<void> {
  const workingShops = shops.map((s) => ({
    ...s,
    products: s.products.map((p) => ({ ...p })),
  }));
  for (const item of ordersToPlace) {
    const shopIdx = workingShops.findIndex((s) => s.id === item.shopId);
    if (shopIdx < 0) continue;
    const targetShop = workingShops[shopIdx];
    await placeShopOrderAtomicInFirestore(targetShop, item.order, buyerUid);
    workingShops[shopIdx] = {
      ...targetShop,
      products: targetShop.products.map((p) =>
        p.id === item.order.productId
          ? deductProductStock(p, item.order.quantity)
          : p
      ),
    };
  }
}

export async function updateShopOrderStatusInFirestore(
  shopId: string,
  orderId: string,
  status: ShopOrderStatus
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  const oid = sanitizeDocId(orderId, 'ord');
  try {
    await updateDoc(doc(db, 'commission_shops', sid, 'orders', oid), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `commission_shops/${sid}/orders/${oid}`
    );
  }
}

export async function createRentPaymentInFirestore(
  shop: CommissionShopItem,
  payment: ShopRentPayment,
  recordedByUid: string,
  alsoRenewShop?: {
    startDate: string;
    expiryDate: string;
    status: CommissionShopItem['status'];
    renewalRequested: boolean;
  }
): Promise<void> {
  const sid = sanitizeDocId(shop.id, 'shop');
  const payId = sanitizeDocId(payment.id, 'pay');
  const batch = writeBatch(db);
  batch.set(doc(db, 'commission_shops', sid, 'rent_payments', payId), {
    id: payId,
    shopId: sid,
    shopkeeperUid: shop.assignedShopkeeperUid || shop.applicantUid || '',
    recordedByUid,
    amountPkr: Math.max(1, Number(payment.amountPkr) || 5000),
    method: payment.method,
    reference: clampStr(payment.reference, 100, 'REF'),
    paymentDate: normalizeIsoDate(payment.paymentDate),
    status: payment.status,
    ...(payment.note ? { note: clampStr(payment.note, 300) } : {}),
    recordedBy: clampStr(payment.recordedBy, 120, 'Member'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (alsoRenewShop) {
    batch.update(doc(db, 'commission_shops', sid), {
      startDate: normalizeIsoDate(alsoRenewShop.startDate),
      expiryDate: normalizeIsoDate(alsoRenewShop.expiryDate),
      status: alsoRenewShop.status,
      renewalRequested: alsoRenewShop.renewalRequested,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(doc(db, 'commission_shops', sid), {
      renewalRequested: true,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `commission_shops/${sid}/rent_payments/${payId}`
    );
  }
}

export async function verifyPendingRentPaymentInFirestore(
  shopId: string,
  paymentId: string,
  approve: boolean,
  recordedBy: string,
  shopUpdates: {
    startDate: string;
    expiryDate: string;
    status: CommissionShopItem['status'];
  }
): Promise<void> {
  const sid = sanitizeDocId(shopId, 'shop');
  const payId = sanitizeDocId(paymentId, 'pay');
  const batch = writeBatch(db);
  batch.update(doc(db, 'commission_shops', sid, 'rent_payments', payId), {
    status: approve ? 'confirmed' : 'rejected',
    recordedBy: clampStr(recordedBy, 120, 'Platform Admin'),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'commission_shops', sid), {
    startDate: normalizeIsoDate(shopUpdates.startDate),
    expiryDate: normalizeIsoDate(shopUpdates.expiryDate),
    status: shopUpdates.status,
    renewalRequested: false,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `commission_shops/${sid}/rent_payments/${payId}`
    );
  }
}

export async function upsertMandiRateInFirestore(
  rate: MandiRateItem,
  isNew: boolean
): Promise<void> {
  const rid = sanitizeDocId(rate.id, 'rate');
  const payload = {
    id: rid,
    cropNameUr: clampStr(rate.cropNameUr, 140),
    cropNameEn: clampStr(rate.cropNameEn, 140),
    cityUr: clampStr(rate.cityUr, 80),
    cityEn: clampStr(rate.cityEn, 80),
    ratePkr: Math.max(0, Number(rate.ratePkr) || 0),
    unitUr: clampStr(rate.unitUr, 60),
    unitEn: clampStr(rate.unitEn, 60),
    trend: rate.trend,
    updatedDate: normalizeIsoDate(rate.updatedDate),
    ...(rate.linkedShopId
      ? { linkedShopId: clampStr(rate.linkedShopId, 128) }
      : {}),
    ...(rate.linkedProductId
      ? { linkedProductId: clampStr(rate.linkedProductId, 128) }
      : {}),
    isPublic: true,
    updatedAt: serverTimestamp(),
  };
  try {
    if (isNew) {
      await setDoc(doc(db, 'mandi_rates', rid), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'mandi_rates', rid), payload);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `mandi_rates/${rid}`
    );
  }
}

export async function deleteMandiRateInFirestore(rateId: string): Promise<void> {
  const rid = sanitizeDocId(rateId, 'rate');
  try {
    await deleteDoc(doc(db, 'mandi_rates', rid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `mandi_rates/${rid}`);
  }
}

export function subscribeDiaryComments(
  postId: string,
  onComments: (comments: DiaryComment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const pid = sanitizeDocId(postId, 'diary');
  const q = query(
    collection(db, 'diary_posts', pid, 'comments'),
    where('isPublic', '==', true)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: DiaryComment[] = snap.docs
        .map((d) => {
          const c = d.data();
          return {
            id: d.id,
            authorUid: c.authorUid,
            authorName: c.authorName || '',
            text: c.text || '',
            timestamp: c.timestamp || '',
            createdAt: tsToMillis(c.createdAt),
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt);
      onComments(list);
    },
    (error) => {
      handleSnapshotError(
        error,
        OperationType.LIST,
        `diary_posts/${pid}/comments`,
        onError
      );
    }
  );
}

export function subscribePublicFarmerProfiles(
  onProfiles: (profiles: FarmerProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users_public'),
    where('isPublic', '==', true)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: FarmerProfile[] = snap.docs.map((d) => {
        const u = d.data();
        return {
          id: u.uid || d.id,
          nameUr: u.nameUr || '',
          nameEn: u.nameEn || '',
          cityUr: u.cityUr || '',
          cityEn: u.cityEn || '',
          whatsapp: '',
          hidePhone: Boolean(u.hidePhone),
          bioUr: u.bioUr || '',
          bioEn: u.bioEn || '',
          completedExchanges: Number(u.completedExchanges) || 0,
        };
      });
      onProfiles(list);
    },
    (error) => {
      handleSnapshotError(error, OperationType.LIST, 'users_public', onError);
    }
  );
}

