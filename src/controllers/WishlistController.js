const wishlistService = require('../services/WishlistService');
const logger = require('../config/logger');

class WishlistController {
  /**
   * Get wishlists
   */
  async getWishlists(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { wishlistId } = req.query;
      
      const wishlists = await wishlistService.getWishlists(userId, sessionId, wishlistId);
      
      logger.info('Wishlists retrieved', {
        requestId: req.id,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
        wishlistId: wishlistId || undefined,
        count: Array.isArray(wishlists) ? wishlists.length : 1,
      });
      
      res.json(wishlists);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific wishlist by ID
   */
  async getWishlistById(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { wishlistId } = req.params;
      
      const wishlist = await wishlistService.getWishlists(userId, sessionId, wishlistId);
      
      logger.info('Wishlist retrieved', {
        requestId: req.id,
        wishlistId,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create wishlist or add product to wishlist
   */
  async createWishlistOrAddProduct(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { name, productId, wishlistId } = req.body;
      
      let wishlist;
      
      if (name && !productId) {
        // Creating new named wishlist (authenticated users only)
        wishlist = await wishlistService.createWishlist(userId, name);
      } else if (productId) {
        // Adding product to wishlist
        wishlist = await wishlistService.addProduct(userId, sessionId, productId, wishlistId);
      } else {
        return res.status(400).json({
          error: 'Either name (for creating wishlist) or productId (for adding product) is required',
          requestId: req.id,
        });
      }
      
      logger.info('Wishlist operation completed', {
        requestId: req.id,
        operation: name ? 'create' : 'addProduct',
        wishlistId: wishlist._id,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update wishlist
   */
  async updateWishlist(req, res, next) {
    try {
      const userId = req.userId;
      const { wishlistId } = req.params;
      const { name, isShared } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required to update wishlist',
          requestId: req.id,
        });
      }
      
      const wishlist = await wishlistService.updateWishlist(userId, wishlistId, { name, isShared });
      
      logger.info('Wishlist updated', {
        requestId: req.id,
        wishlistId,
        userId,
      });
      
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete wishlist
   */
  async deleteWishlist(req, res, next) {
    try {
      const userId = req.userId;
      const { wishlistId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required to delete wishlist',
          requestId: req.id,
        });
      }
      
      await wishlistService.deleteWishlist(userId, wishlistId);
      
      logger.info('Wishlist deleted', {
        requestId: req.id,
        wishlistId,
        userId,
      });
      
      res.json({ message: 'Wishlist deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { wishlistId, productId } = req.params;
      
      const wishlist = await wishlistService.removeProduct(userId, sessionId, wishlistId, productId);
      
      logger.info('Product removed from wishlist', {
        requestId: req.id,
        wishlistId,
        productId,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share wishlist
   */
  async shareWishlist(req, res, next) {
    try {
      const userId = req.userId;
      const { wishlistId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required to share wishlist',
          requestId: req.id,
        });
      }
      
      const result = await wishlistService.shareWishlist(userId, wishlistId);
      
      logger.info('Wishlist shared', {
        requestId: req.id,
        wishlistId,
        userId,
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke wishlist sharing
   */
  async revokeShare(req, res, next) {
    try {
      const userId = req.userId;
      const { wishlistId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required to revoke sharing',
          requestId: req.id,
        });
      }
      
      const wishlist = await wishlistService.revokeShare(userId, wishlistId);
      
      logger.info('Wishlist sharing revoked', {
        requestId: req.id,
        wishlistId,
        userId,
      });
      
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }

  /**
   * View shared wishlist
   */
  async viewSharedWishlist(req, res, next) {
    try {
      const { shareToken } = req.params;
      
      const wishlist = await wishlistService.viewSharedWishlist(shareToken);
      
      logger.info('Shared wishlist viewed', {
        requestId: req.id,
        shareToken,
        wishlistId: wishlist._id,
      });
      
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add wishlist items to cart
   */
  async addToCart(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { wishlistId } = req.params;
      const { productIds } = req.body;
      
      const result = await wishlistService.addToCart(userId, sessionId, wishlistId, productIds);
      
      logger.info('Wishlist items added to cart', {
        requestId: req.id,
        wishlistId,
        itemsAdded: result.itemsAdded,
        itemsSkipped: result.itemsSkipped,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WishlistController();






