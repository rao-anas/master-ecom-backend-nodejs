const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/WishlistController');
const sessionMiddleware = require('../middleware/session');
const { optionalAuth } = require('../middleware/auth');
const { validateWishlistCreate, validateWishlistUpdate, validateWishlistAddToCart, validateWishlistRemoveProduct } = require('../middleware/validateWishlist');

// All wishlist routes require session (guest) or auth (user)
router.use(sessionMiddleware);
router.use(optionalAuth);

// GET /api/v1/wishlists - Get wishlists (all for authenticated, single for guest)
router.get(
  '/',
  wishlistController.getWishlists.bind(wishlistController)
);

// POST /api/v1/wishlists - Create wishlist or add product to wishlist
router.post(
  '/',
  validateWishlistCreate,
  wishlistController.createWishlistOrAddProduct.bind(wishlistController)
);

// GET /api/v1/wishlists/shared/:shareToken - View shared wishlist (public, no auth required)
router.get(
  '/shared/:shareToken',
  wishlistController.viewSharedWishlist.bind(wishlistController)
);

// GET /api/v1/wishlists/:wishlistId - Get specific wishlist
router.get(
  '/:wishlistId',
  wishlistController.getWishlistById.bind(wishlistController)
);

// PUT /api/v1/wishlists/:wishlistId - Update wishlist (name, sharing)
router.put(
  '/:wishlistId',
  optionalAuth,
  validateWishlistUpdate,
  wishlistController.updateWishlist.bind(wishlistController)
);

// DELETE /api/v1/wishlists/:wishlistId - Delete wishlist
router.delete(
  '/:wishlistId',
  optionalAuth,
  wishlistController.deleteWishlist.bind(wishlistController)
);

// DELETE /api/v1/wishlists/:wishlistId/products/:productId - Remove product from wishlist
router.delete(
  '/:wishlistId/products/:productId',
  validateWishlistRemoveProduct,
  wishlistController.removeFromWishlist.bind(wishlistController)
);

// POST /api/v1/wishlists/:wishlistId/share - Generate share link
router.post(
  '/:wishlistId/share',
  optionalAuth,
  wishlistController.shareWishlist.bind(wishlistController)
);

// DELETE /api/v1/wishlists/:wishlistId/share - Revoke sharing
router.delete(
  '/:wishlistId/share',
  optionalAuth,
  wishlistController.revokeShare.bind(wishlistController)
);

// POST /api/v1/wishlists/:wishlistId/add-to-cart - Add wishlist items to cart
router.post(
  '/:wishlistId/add-to-cart',
  validateWishlistAddToCart,
  wishlistController.addToCart.bind(wishlistController)
);

module.exports = router;

