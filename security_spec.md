# Desi Beej Exchange — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity & Role Integrity**: No user may self-assign `'admin'` in `users_private/{uid}` or create/delete documents in `admins/{uid}` unless already an admin (`aqasam098@gmail.com` with `email_verified == true` or existing `/admins/{uid}`).
2. **PII Isolation**: User email, WhatsApp/phone number, wishlist, and cart items live exclusively in `users_private/{uid}` (readable/writable only by owner or admin). `users_public/{uid}` contains strictly non-PII fields.
3. **Seed & Diary Ownership**: Every seed listing (`seeds/{seedId}`) and diary post (`diary_posts/{postId}`) requires `ownerUid == request.auth.uid` on creation, `ownerUid` and `createdAt` remain immutable on update, and `createdAt == request.time`.
4. **Master Gate & Atomicity on Subcollections**:
   - Reviews (`seeds/{seedId}/reviews/{reviewId}`) and Diary Comments (`diary_posts/{postId}/comments/{commentId}`) require `exists()` of their parent document on create.
   - Diary Likes (`diary_posts/{postId}/likes/{uid}`) require an atomic `writeBatch` updating `diary_posts/{postId}.likesCount` (`existsAfter` / `!existsAfter`).
   - Shop Orders (`commission_shops/{shopId}/orders/{orderId}`) require parent shop `status == 'active'`, `buyerUid == request.auth.uid`, and can only be read by the buyer, the assigned shopkeeper, or admin.
   - Buyer stock decrement on `commission_shops/{shopId}/products/{productId}` requires `existsAfter` of a newly created order `lastOrderId` in `commission_shops/{shopId}/orders/{lastOrderId}` inside the same atomic batch.
5. **Shop Rental Protection**: Shopkeepers cannot modify `annualRentPkr`, `startDate`, `expiryDate`, `status`, or `verified` on `commission_shops/{shopId}`, and cannot confirm or reject their own `rent_payments`. Only Admins can approve/reject shops, configure annual rent, verify rent payments, or edit `mandi_rates`.
6. **Terminal State Locking**: Once a `ShopOrderDoc` reaches `'completed'` or `'cancelled'`, only an Admin can override it.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Self-Admin Escalation**: Non-admin user creates `/users_private/{uid}` with `{ "role": "admin", ... }`.
2. **Ghost Field Injection (Shadow Update)**: Authenticated user creates `/seeds/seed_bad` with an extra field `"isVerified": true`.
3. **ID Poisoning**: Authenticated user writes `/seeds/` with a 300-character document ID containing spaces/slashes.
4. **Email Spoofing**: Token with `email: "aqasam098@gmail.com"` and `email_verified: false` attempts to update `/mandi_rates/rate-1`.
5. **Owner Spoofing**: User A tries to create `/seeds/seed_spoof` with `ownerUid: "user_B"`.
6. **Timestamp Forgery**: User submits `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
7. **Shopkeeper Rent Tampering**: Shopkeeper tries to update `annualRentPkr: 1` or `status: "active"` on their own `/commission_shops/shop-1`.
8. **Pending Payment Self-Confirmation**: Shopkeeper tries to create `/commission_shops/shop-1/rent_payments/pay1` with `status: "confirmed"`.
9. **Cross-Customer Order PII Snooping**: Buyer B calls `get` or `list` on `/commission_shops/shop-1/orders/ord-1001` belonging to Buyer A.
10. **Order on Expired/Suspended Shop**: Buyer tries to place an order on `/commission_shops/shop-5` where `status == "expired"`.
11. **Arbitrary Stock Tampering**: Buyer tries to update `stockCount: 0` on `/commission_shops/shop-1/products/prod-101` without creating an atomic order (`lastOrderId` missing in `existsAfter`).
12. **Terminal Order Mutation**: Shopkeeper tries to change an order from `status: "completed"` back to `status: "pending"`.
