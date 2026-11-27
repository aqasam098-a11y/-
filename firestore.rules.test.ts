/**
 * Desi Beej Exchange — Security Rules Verification Spec (Phase 0 & Final Review)
 * Covers all 12 "Dirty Dozen" attack payloads from security_spec.md and positive app flows.
 * Note: Uses standard Node/TypeScript types so it compiles cleanly under `tsc --noEmit`
 * and can also be executed against a local Firestore Emulator when available.
 */

export interface SecurityTestCase {
  id: string;
  title: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'ALLOW' | 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_TEST_CASES: SecurityTestCase[] = [
  {
    id: 'DD-01',
    title: 'Self-Admin Escalation on users_private',
    operation: 'create',
    path: 'users_private/user_farmer_1',
    auth: { uid: 'user_farmer_1', email: 'farmer@example.com', email_verified: true },
    payload: {
      uid: 'user_farmer_1',
      displayName: 'Malicious Farmer',
      role: 'admin',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "(incoming().role != 'admin' || isAdmin())",
  },
  {
    id: 'DD-02',
    title: 'Ghost Field Injection (Shadow Update) on seeds',
    operation: 'create',
    path: 'seeds/seed_bad',
    auth: { uid: 'user_farmer_1', email: 'farmer@example.com', email_verified: true },
    payload: {
      id: 'seed_bad',
      ownerUid: 'user_farmer_1',
      nameUr: 'گندم',
      nameEn: 'Wheat',
      category: 'grains',
      quantityUr: '5 kg',
      quantityEn: '5 kg',
      listingType: 'sale',
      cityUr: 'ملتان',
      cityEn: 'Multan',
      ownerUr: 'کسان',
      ownerEn: 'Farmer',
      descriptionUr: 'تفصیل',
      descriptionEn: 'Description',
      isPublic: true,
      isVerified: true, // Ghost field
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidSeedListing(incoming()) -> data.keys().hasOnly(...)',
  },
  {
    id: 'DD-03',
    title: 'Document ID Poisoning (300 chars + spaces)',
    operation: 'create',
    path: `seeds/${'bad id '.repeat(45)}`,
    auth: { uid: 'user_farmer_1', email: 'farmer@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "isValidId(seedId) -> id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 'DD-04',
    title: 'Unverified Admin Email Spoofing on mandi_rates',
    operation: 'update',
    path: 'mandi_rates/rate-1',
    auth: { uid: 'attacker_uid', email: 'aqasam098@gmail.com', email_verified: false },
    payload: { ratePkr: 1 },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() -> request.auth.token.email_verified == true',
  },
  {
    id: 'DD-05',
    title: 'Owner Spoofing on seed creation',
    operation: 'create',
    path: 'seeds/seed_spoof',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'seed_spoof',
      ownerUid: 'user_B',
      isPublic: true,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: '(incoming().ownerUid == request.auth.uid || isAdmin())',
  },
  {
    id: 'DD-06',
    title: 'Timestamp Forgery (client backdated createdAt)',
    operation: 'create',
    path: 'seeds/seed_backdate',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'seed_backdate',
      ownerUid: 'user_A',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time',
  },
  {
    id: 'DD-07',
    title: 'Shopkeeper Rent & Status Tampering',
    operation: 'update',
    path: 'commission_shops/shop-1',
    auth: { uid: 'keeper_uid_1', email: 'keeper@example.com', email_verified: true },
    payload: {
      annualRentPkr: 1,
      status: 'active',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "affectedKeys().hasOnly(['renewalRequested', 'descriptionUr', ...])",
  },
  {
    id: 'DD-08',
    title: 'Shopkeeper Self-Confirmation of Rent Payment',
    operation: 'create',
    path: 'commission_shops/shop-1/rent_payments/pay_cheat',
    auth: { uid: 'keeper_uid_1', email: 'keeper@example.com', email_verified: true },
    payload: {
      id: 'pay_cheat',
      shopId: 'shop-1',
      recordedByUid: 'keeper_uid_1',
      amountPkr: 5000,
      method: 'Easypaisa',
      reference: 'FAKE-TXN',
      paymentDate: '2026-11-26',
      status: 'confirmed',
      recordedBy: 'Keeper',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "(isShopkeeperOf(shopId) && incoming().status == 'pending')",
  },
  {
    id: 'DD-09',
    title: 'Cross-Customer Order PII Snooping',
    operation: 'get',
    path: 'commission_shops/shop-1/orders/ord-1001',
    auth: { uid: 'buyer_B', email: 'b@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isOwner(existing().buyerUid) || isShopkeeperOf(shopId) || isAdmin()',
  },
  {
    id: 'DD-10',
    title: 'Placing Order on Expired or Suspended Shop',
    operation: 'create',
    path: 'commission_shops/shop-5/orders/ord-expired-test',
    auth: { uid: 'buyer_A', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'ord-expired-test',
      shopId: 'shop-5',
      buyerUid: 'buyer_A',
      status: 'pending',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "get(/databases/$(database)/documents/commission_shops/$(shopId)).data.status == 'active'",
  },
  {
    id: 'DD-11',
    title: 'Arbitrary Product Stock Tampering Without Atomic Order',
    operation: 'update',
    path: 'commission_shops/shop-1/products/prod-101',
    auth: { uid: 'buyer_A', email: 'a@example.com', email_verified: true },
    payload: {
      stockCount: 0,
      stockQty: '0 Bags',
      inStock: false,
      lastOrderId: 'ord-existing-reused',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: '!exists(.../orders/$(incoming().lastOrderId)) && existsAfter(.../orders/$(incoming().lastOrderId))',
  },
  {
    id: 'DD-12',
    title: 'Terminal Order Mutation (Reverting Completed Order)',
    operation: 'update',
    path: 'commission_shops/shop-1/orders/ord-completed-1',
    auth: { uid: 'keeper_uid_1', email: 'keeper@example.com', email_verified: true },
    payload: {
      status: 'pending',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "existing().status != 'completed' && existing().status != 'cancelled'",
  },
];

export const POSITIVE_FLOW_CASES: SecurityTestCase[] = [
  {
    id: 'POS-01',
    title: 'Verified Google user updates own private wishlist & cart',
    operation: 'update',
    path: 'users_private/user_1',
    auth: { uid: 'user_1', email: 'user1@gmail.com', email_verified: true },
    payload: {
      wishlistIds: ['seed-1', 'seed-2'],
      cartItems: [{ id: 'c1', shopId: 'shop-1', productId: 'prod-101', unitMode: 'bag', quantity: 1 }],
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'ALLOW',
    enforcedByRule: "isOwner(userId) && affectedKeys().hasOnly(['email', ..., 'wishlistIds', 'cartItems', 'updatedAt'])",
  },
  {
    id: 'POS-02',
    title: 'Verified Admin approves shop & configures individual annual rent',
    operation: 'update',
    path: 'commission_shops/shop-3',
    auth: { uid: 'admin_uid', email: 'aqasam098@gmail.com', email_verified: true },
    payload: {
      status: 'active',
      verified: true,
      annualRentPkr: 10000,
      startDate: '2026-11-26',
      expiryDate: '2027-11-26',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'ALLOW',
    enforcedByRule: 'isAdmin() override on isValidCommissionShop(incoming())',
  },
  {
    id: 'POS-03',
    title: 'Public visitor reads active commission shops & public seed listings',
    operation: 'list',
    path: 'seeds',
    auth: null,
    expectedResult: 'ALLOW',
    enforcedByRule: 'existing().isPublic == true',
  },
];
