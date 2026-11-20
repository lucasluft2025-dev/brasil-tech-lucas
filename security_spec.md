# Brasil Tech Security Specification & Adversarial Test Plan

## 1. Data Invariants
1. **Admin Authority**: Only bootstrapped admins (`lucasluft2025@gmail.com`, `luft446@gmail.com`, or `brasilgames@gmail.com` with `email_verified == true`) or UIDs present in `/admins/{uid}` (with `email_verified == true`) may create/update/delete `/products`, `/productCosts`, `/coupons`, answer `/questions`, manage `/trackings`, or update `/orders` fulfillment/payment state.
2. **PII Isolation**: `/users/{uid}`, `/orders/{orderId}`, `/trackings/{trackingId}/private/details`, and `/newsletter/{subscriberId}` contain PII (`email`, `phone`, `cpf`, `address`) and MUST NEVER be readable by non-owners. `/reviews` and `/questions` MUST NEVER contain `email`, `phone`, `cpf`, or `address`.
3. **Wholesale Cost Protection**: `/productCosts/{productId}` MUST NEVER be readable by non-admin users.
4. **Verified Identity & Immutability**: Every write requires `request.auth.token.email_verified == true`, matches `userId == request.auth.uid` on user-owned documents, preserves `createdAt`/`userId` across updates, and validates `request.time` server timestamps.
5. **Anti-Update-Gap & Bounded Payloads**: Every `create` validates exact required + allowed keys (`hasAll` + `hasOnly`), every `update` calls `isValid[Entity](incoming())` and `affectedKeys().hasOnly(...)`, all strings/arrays enforce `.size()` upper bounds, and document IDs match `^[a-zA-Z0-9_\-]+$`.
6. **Zero DB Lookups in `allow list`**: No `get()` or `exists()` inside any `allow list` rule; list rules evaluate `resource.data` or `request.auth.token` claims directly.
7. **Review Pre-Publication Moderation**: Customer reviews MUST be created with `status: 'pending'` and are only publicly readable (`get`/`list`) when `status == 'approved'`. Only verified admins may update `status` to `'approved'` or `'rejected'`.
8. **Exact-Match Public Tracking (Zero Unmasked PII)**: `/trackings/{trackingId}` records MUST only be created, updated, deleted, or listed by verified admins. Public visitors may only fetch a single tracking document via exact ID `getDoc` (no collection listing/scraping) when `active == true`, and `/trackings/{trackingId}` MUST NEVER contain unmasked CPF, email, phone, or street address (stored strictly in admin-only `/trackings/{trackingId}/private/details`).

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Update on Product**: Non-admin attempts `updateDoc('/products/1', { price: 1, isVerified: true })` -> Denied (not admin + ghost field).
2. **Admin Email Spoof (`email_verified: false`)**: Attacker token has `email: 'luft446@gmail.com'` and `email_verified: false` -> Denied by `email_verified == true` check.
3. **User Self-Privilege Escalation**: Authenticated user creates `/users/{uid}` with `{ uid, name, email, role: 'admin', createdAt, updatedAt }` -> Denied by `keys().hasOnly(...)`.
4. **Direct Admin Doc Injection**: Non-bootstrapped user creates `/admins/{uid}` -> Denied.
5. **Cross-User Order Read (`get`)**: User A requests `getDoc('/orders/BT-10001')` belonging to User B -> Denied by `existing().userId == request.auth.uid`.
6. **Blanket Order List Scraping**: User A calls `getDocs('/orders')` without `where('userId', '==', uid)` -> Denied by `allow list` `resource.data.userId == request.auth.uid`.
7. **Order Identity Spoofing**: User A creates order with `userId: 'user-b-uid'` -> Denied by `incoming().userId == request.auth.uid`.
8. **Order Total/Status Tampering on Update**: User A updates own order `{ statusStep: 4, total: 1, paymentStatus: 'paid' }` -> Denied (only admin can update order fulfillment/payment).
9. **ID Poisoning**: Attacker writes `/reviews/<1500-char-junk>` -> Denied by `isValidId()` (`size() <= 128 && matches(...)`).
10. **Client Timestamp Forgery**: User creates review with `createdAt: new Date('2099-01-01')` -> Denied by `incoming().createdAt == request.time`.
11. **Wholesale Cost Leak**: Regular shopper reads `/productCosts/1` -> Denied by `isAdmin()`.
12. **Q&A Pre-Answered Spoof**: User creates `/questions/{id}` with `{ ..., answered: true, answer: 'Gratis!', ... }` -> Denied by `incoming().answered == false && incoming().answer == ''`.
13. **Self-Approved Review Spoof**: User creates `/reviews/{id}` with `{ ..., status: 'approved', ... }` -> Denied by `incoming().status == 'pending'`. Non-admin attempting `updateDoc('/reviews/{id}', { status: 'approved' })` -> Denied by `isAdmin()`.
14. **Tracking Enumeration / Forgery**: Visitor attempts `getDocs('/trackings')` or creates/updates `/trackings/FAKE123` -> Denied by `allow list: if isBootstrappedAdmin()` and `allow create/update: if isAdmin()`.

