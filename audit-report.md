# AKUBASE Audit Report

## 1. FULL FILE TREE

Root files:
- auth.html
- cart.html
- checkout.html
- index.css
- index.html
- order-confirmation.html
- order-history.html
- product-details-page.html
- products.html
- profile.html
- public.css
- search.html
- wishlist.html
- image-removebg-preview (1).png

Folder: admin
- admin/add-product.html
- admin/analytics.html
- admin/customers.html
- admin/index.html
- admin/oders.html
- admin/order-details.html
- admin/products.html
- admin/settings.html

Folder: admin/js
- admin/js/admin-auth.js
- admin/js/admin-customers.js
- admin/js/admin-orders.js
- admin/js/admin-products.js

Folder: config
- config/cloudinary-config.js
- config/firebase-config.js
- config/paystack-config.js

Folder: akubase-logic
- akubase-logic/config/cloudinary-config.js
- akubase-logic/config/firebase-config.js
- akubase-logic/config/paystack-config.js

Folder: delete
- delete/product-sold-out.html
- delete/product.js

Folder: js
- js/auth.js
- js/badges.js
- js/bottom-nav.js
- js/cart.js
- js/orders.js
- js/products.js
- js/recent-viewed.js
- js/storage.js
- js/wishlist.js

Duplicate folders:
- config and akubase-logic/config both contain Firebase, Paystack, and Cloudinary config files.

## 2. IMPORT GRAPH & BROKEN IMPORTS

For every HTML/JS file, imports found:

- admin/order-details.html
  - import "../js/admin-auth.js" -> resolves
  - import "../js/orders.js" -> resolves

- admin/products.html
  - import "../js/admin-auth.js" -> resolves
  - import "../js/products.js" -> resolves

- auth.html
  - import "./js/auth.js" -> resolves

- cart.html
  - import "./js/cart.js" -> resolves
  - import "./js/products.js" -> resolves
  - import "./js/auth.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves

- checkout.html
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js" -> external URL, not a local project file
  - import "./config/firebase-config.js" -> resolves
  - import "./js/cart.js" -> resolves
  - import "./js/products.js" -> resolves
  - import "./js/orders.js" -> resolves
  - import "./config/paystack-config.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves

- index.html
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js" -> external URL, not a local project file
  - import "./config/firebase-config.js" -> resolves
  - import "./js/products.js" -> resolves
  - import "./js/recent-viewed.js" -> resolves

- order-confirmation.html
  - import "./js/orders.js" -> resolves

- order-history.html
  - import "./js/orders.js" -> resolves
  - import "./js/auth.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js" -> external URL, not a local project file
  - import "./config/firebase-config.js" -> resolves

- product-details-page.html
  - import "./js/products.js" -> resolves
  - import "./js/cart.js" -> resolves
  - import "./js/wishlist.js" -> resolves
  - import "./js/recent-viewed.js" -> resolves
  - import "./js/badges.js" -> resolves
  - import "./js/auth.js" -> resolves

- products.html
  - import "./js/products.js" -> resolves
  - import "./js/wishlist.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves

- profile.html
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js" -> external URL, not a local project file
  - import "./config/firebase-config.js" -> resolves
  - import "./js/orders.js" -> resolves
  - import "./js/wishlist.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves

- search.html
  - import "./js/products.js" -> resolves
  - import "./js/storage.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves

- wishlist.html
  - import "./js/wishlist.js" -> resolves
  - import "./js/products.js" -> resolves
  - import "./js/bottom-nav.js" -> resolves

- js/auth.js
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js" -> external URL, not a local project file
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js" -> external URL, not a local project file
  - import "../config/firebase-config.js" -> resolves
  - import "./cart.js" -> resolves
  - import "./wishlist.js" -> resolves

- js/badges.js
  - import "./cart.js" -> resolves
  - import "./wishlist.js" -> resolves

- js/bottom-nav.js
  - import "./badges.js" -> resolves

- js/cart.js
  - import "./storage.js" -> resolves

- js/orders.js
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js" -> external URL, not a local project file
  - import "../config/firebase-config.js" -> resolves

- js/products.js
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js" -> external URL, not a local project file
  - import "../config/firebase-config.js" -> resolves

- js/recent-viewed.js
  - import "./storage.js" -> resolves

- js/storage.js
  - no imports

- js/wishlist.js
  - import "./storage.js" -> resolves

- delete/product.js
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js" -> external URL, not a local project file
  - import "../config/firebase-config.js" -> resolves

- config/firebase-config.js
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js" -> external URL, not a local project file
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js" -> external URL, not a local project file
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js" -> external URL, not a local project file
  - import "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js" -> external URL, not a local project file

- akubase-logic/config/firebase-config.js
  - same external SDK imports as above

Broken imports found:
- admin/order-details.html imports requireAdmin from ../js/admin-auth.js, but admin/js/admin-auth.js exists and is empty, so it does not export requireAdmin.
- admin/products.html imports requireAdmin from ../js/admin-auth.js, but admin/js/admin-auth.js exists and is empty, so it does not export requireAdmin.

## 3. EXPORTED VS IMPORTED FUNCTIONS

Exports in js:
- js/auth.js exports:
  - getCurrentUser
  - signInWithGoogle
  - signInWithEmail
  - signUpWithEmail
  - logOut
  - attachAuthModalTriggers

- js/badges.js exports:
  - refreshBadges
  - initBadges

- js/bottom-nav.js exports:
  - renderBottomNav

- js/cart.js exports:
  - getCart
  - getCartCount
  - addToCart
  - removeFromCart
  - isInCart
  - clearCart
  - validateCartAgainstLiveStock

- js/orders.js exports:
  - getOrdersForUser
  - getOrderById
  - createOrder
  - updateOrderStatus

- js/products.js exports:
  - getLiveProducts
  - getProductById
  - listenToProduct
  - incrementProductViews
  - searchProductsClientSide
  - getAllProductsForAdmin
  - createProduct
  - updateProduct
  - deleteProduct
  - markProductSold

- js/recent-viewed.js exports:
  - getRecentlyViewed
  - trackProductView
  - getRecentlyViewedLive

- js/storage.js exports:
  - readList
  - writeList
  - clearList

- js/wishlist.js exports:
  - getWishlist
  - getWishlistCount
  - isWishlisted
  - toggleWishlist
  - removeFromWishlist
  - clearWishlist

Exports in admin/js:
- admin/js/admin-auth.js exports nothing
- admin/js/admin-customers.js exports nothing
- admin/js/admin-orders.js exports nothing
- admin/js/admin-products.js exports nothing

Imported but not exported:
- requireAdmin is imported from admin/js/admin-auth.js in admin/order-details.html and admin/products.html, but that file exports nothing.

## 4. DUPLICATE / DEAD FILES

Near-duplicate or duplicate files:
- config/firebase-config.js and akubase-logic/config/firebase-config.js are near-identical but contain different values.
- config/paystack-config.js and akubase-logic/config/paystack-config.js are effectively identical.
- config/cloudinary-config.js and akubase-logic/config/cloudinary-config.js are structurally identical but use different placeholder values.
- delete/product.js appears to be an older draft of js/orders.js.
- delete/product-sold-out.html looks like an early mockup with hardcoded content rather than live app wiring.

Files that appear unused or effectively dead:
- admin/js/admin-auth.js is empty.
- admin/js/admin-customers.js is empty.
- admin/js/admin-orders.js is empty.
- admin/js/admin-products.js is empty.
- admin/oders.html appears to be a draft or typo version of an admin orders page and is not wired into the active navigation.
- delete/product-sold-out.html is not imported or linked by the active storefront/admin pages.
- delete/product.js is not imported by any other project file.
- image-removebg-preview (1).png is present but does not appear to be referenced by the project files inspected.

## 5. FIRESTORE COLLECTIONS USED

Collections found in JS files:

- users
  - used in js/auth.js
  - written with fields: name, email, phone, addresses, createdAt

- carts
  - used in js/auth.js
  - written with fields: items, updatedAt
  - cart items appear to contain productId, size, addedAt

- wishlist
  - used in js/auth.js
  - written with fields: addedAt
  - data is stored as subdocuments under each user’s wishlist path

- orders
  - used in js/orders.js and delete/product.js
  - written/read with fields: userId, items, subtotal, deliveryFee, total, deliveryMethod, deliveryAddress, paymentMethod, paymentStatus, status, statusHistory, createdAt

- products
  - used in js/products.js and js/orders.js
  - written/read with fields including status, createdAt, views, title, brand, category, price, size, image, soldAt

## 6. CUSTOMER VS ADMIN BOUNDARY

Customer-facing HTML:
- auth.html
- cart.html
- checkout.html
- index.html
- order-confirmation.html
- order-history.html
- product-details-page.html
- products.html
- profile.html
- search.html
- wishlist.html
- delete/product-sold-out.html

Admin-facing HTML:
- admin/add-product.html
- admin/analytics.html
- admin/customers.html
- admin/index.html
- admin/oders.html
- admin/order-details.html
- admin/products.html
- admin/settings.html

Admin pages with auth gating:
- admin/order-details.html imports requireAdmin from admin/js/admin-auth.js
- admin/products.html imports requireAdmin from admin/js/admin-auth.js

Flagged admin pages:
- admin/add-product.html does not import requireAdmin or any auth-gating helper.
- admin/analytics.html does not import requireAdmin or any auth-gating helper.
- admin/customers.html does not import requireAdmin or any auth-gating helper.
- admin/index.html does not import requireAdmin or any auth-gating helper.
- admin/oders.html does not import requireAdmin or any auth-gating helper.
- admin/settings.html does not import requireAdmin or any auth-gating helper.

## 7. NAVIGATION INTEGRITY

Navigation targets found:

- /products.html -> exists
- /search.html -> exists
- /wishlist.html -> exists
- /cart.html -> exists
- /profile.html -> exists
- /auth.html -> exists
- /checkout.html -> exists
- /order-confirmation.html -> exists
- /order-history.html -> exists

Broken or incorrect targets:
- /orders.html is used in order-history.html and order-confirmation.html, but no such file exists. The real file is order-history.html.
- /product-details.html is used in index.html, products.html, search.html, and wishlist.html, but no such file exists. The real file is product-details-page.html.
- /admin/orders.html is used in admin/order-details.html, but no such file exists. The closest page present is admin/oders.html, which is misspelled.
- /admin/product-form.html is used in admin/products.html, but no such file exists. The closest likely target is admin/add-product.html.
- search-results.html appears in delete/product-sold-out.html, but no such file exists.
- In delete/product-sold-out.html, relative links like products.html, wishlist.html, cart.html, and profile.html resolve inside the delete folder and do not point to real files in the project.

Placeholder links:
- auth.html contains href="#" for Terms and Privacy links.
- delete/product-sold-out.html contains href="#" for “See all”.

## 8. CONFIG DUPLICATION CHECK

More than one Firebase config file exists:
- config/firebase-config.js
- akubase-logic/config/firebase-config.js

Diff summary:
- config/firebase-config.js uses a real-looking Firebase project config.
- akubase-logic/config/firebase-config.js uses placeholder values like YOUR_FIREBASE_API_KEY and YOUR_PROJECT_ID.

More than one Paystack config file exists:
- config/paystack-config.js
- akubase-logic/config/paystack-config.js

Diff summary:
- Both files are effectively identical, with placeholder public key values.

More than one Cloudinary config file exists:
- config/cloudinary-config.js
- akubase-logic/config/cloudinary-config.js

Diff summary:
- config/cloudinary-config.js uses real-looking values for cloud name and upload preset.
- akubase-logic/config/cloudinary-config.js uses placeholder values.
