const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const CartService = require('./CartService');
const logger = require('../config/logger');

class WishlistService {
  /**
   * Get or create wishlist for user/session
   * For authenticated users: returns all wishlists or default wishlist
   * For guests: returns single wishlist
   */
  async getWishlists(userId, sessionId, wishlistId = null) {
    try {
      if (wishlistId) {
        // Get specific wishlist
        const wishlist = await Wishlist.findById(wishlistId)
          .populate('productIds', 'name price images category stock isAvailable');
        
        if (!wishlist) {
          const error = new Error('Wishlist not found');
          error.statusCode = 404;
          throw error;
        }
        
        // Check ownership/access
        // Allow access if:
        // 1. User owns the wishlist (userId matches)
        // 2. Wishlist is shared (isShared = true) - anyone can view
        // 3. Session matches (for guest wishlists)
        const isOwner = userId && wishlist.userId && wishlist.userId.toString() === userId.toString();
        const isShared = wishlist.isShared === true;
        const isSessionMatch = sessionId && wishlist.sessionId === sessionId;
        
        // If wishlist is shared, allow access to anyone
        if (isShared) {
          return wishlist;
        }
        
        // Check ownership for non-shared wishlists
        if (wishlist.userId) {
          // User wishlist - check if user owns it
          if (userId && !isOwner) {
            const error = new Error('Not authorized to access this wishlist');
            error.statusCode = 403;
            throw error;
          }
        } else if (wishlist.sessionId) {
          // Guest wishlist - check if session matches
          if (sessionId && !isSessionMatch) {
            const error = new Error('Not authorized to access this wishlist');
            error.statusCode = 403;
            throw error;
          }
        }
        
        return wishlist;
      }
      
      if (userId) {
        // Authenticated user: return all wishlists
        const wishlists = await Wishlist.find({ userId })
          .populate('productIds', 'name price images category stock isAvailable')
          .sort({ isDefault: -1, createdAt: -1 });
        
        return wishlists;
      } else if (sessionId) {
        // Guest: return single wishlist or create one
        let wishlist = await Wishlist.findOne({ sessionId });
        
        if (!wishlist) {
          wishlist = await Wishlist.create({
            sessionId,
            name: 'My Wishlist',
            productIds: [],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          });
        } else {
          await wishlist.populate('productIds', 'name price images category stock isAvailable');
        }
        
        return wishlist;
      } else {
        throw new Error('Either userId or sessionId is required');
      }
    } catch (error) {
      logger.error('Error getting wishlists:', error);
      throw error;
    }
  }

  /**
   * Create new wishlist for authenticated user
   */
  async createWishlist(userId, name) {
    try {
      if (!userId) {
        const error = new Error('User ID is required to create named wishlist');
        error.statusCode = 400;
        throw error;
      }
      
      // Check if user already has a wishlist with this name
      const existing = await Wishlist.findOne({ userId, name: name.trim() });
      if (existing) {
        const error = new Error('Wishlist with this name already exists');
        error.statusCode = 409;
        throw error;
      }
      
      // Check if this is the first wishlist (make it default)
      const existingWishlists = await Wishlist.countDocuments({ userId });
      const isDefault = existingWishlists === 0;
      
      const wishlist = await Wishlist.create({
        userId,
        name: name.trim(),
        productIds: [],
        isDefault,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      });
      
      logger.info('Wishlist created', {
        wishlistId: wishlist._id,
        userId,
        name,
        isDefault,
      });
      
      return wishlist;
    } catch (error) {
      logger.error('Error creating wishlist:', error);
      throw error;
    }
  }

  /**
   * Add product to wishlist
   */
  async addProduct(userId, sessionId, productId, wishlistId = null) {
    try {
      // Validate product exists
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Get or create wishlist
      let wishlist;
      if (wishlistId) {
        wishlist = await Wishlist.findById(wishlistId);
        if (!wishlist) {
          const error = new Error('Wishlist not found');
          error.statusCode = 404;
          throw error;
        }
        
        // Check ownership
        // Allow if user owns the wishlist OR session matches (for guest wishlists)
        const isOwner = userId && wishlist.userId && wishlist.userId.toString() === userId.toString();
        const isSessionMatch = sessionId && wishlist.sessionId === sessionId;
        
        if (!isOwner && !isSessionMatch) {
          // If wishlist has userId but user doesn't own it
          if (wishlist.userId && userId && !isOwner) {
            const error = new Error('Not authorized to modify this wishlist');
            error.statusCode = 403;
            throw error;
          }
          // If wishlist has sessionId but session doesn't match
          if (wishlist.sessionId && sessionId && !isSessionMatch) {
            const error = new Error('Not authorized to modify this wishlist');
            error.statusCode = 403;
            throw error;
          }
        }
      } else {
        // Get default wishlist or create one
        if (userId) {
          wishlist = await Wishlist.findOne({ userId, isDefault: true });
          if (!wishlist) {
            wishlist = await Wishlist.create({
              userId,
              name: 'My Wishlist',
              productIds: [],
              isDefault: true,
              expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            });
          }
        } else if (sessionId) {
          wishlist = await Wishlist.findOne({ sessionId });
          if (!wishlist) {
            wishlist = await Wishlist.create({
              sessionId,
              name: 'My Wishlist',
              productIds: [],
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
          }
        } else {
          throw new Error('Either userId or sessionId is required');
        }
      }
      
      // Check if product already in wishlist
      const productIdStr = productId.toString();
      const exists = wishlist.productIds.some(id => id.toString() === productIdStr);
      
      if (exists) {
        // Product already in wishlist, return existing wishlist
        await wishlist.populate('productIds', 'name price images category stock isAvailable');
        return wishlist;
      }
      
      // Check limit (50 products)
      if (wishlist.productIds.length >= 50) {
        const error = new Error('Wishlist cannot contain more than 50 products');
        error.statusCode = 400;
        throw error;
      }
      
      // Add product
      wishlist.productIds.push(productId);
      await wishlist.save();
      
      await wishlist.populate('productIds', 'name price images category stock isAvailable');
      
      logger.info('Product added to wishlist', {
        wishlistId: wishlist._id,
        productId,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      return wishlist;
    } catch (error) {
      logger.error('Error adding product to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeProduct(userId, sessionId, wishlistId, productId) {
    try {
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check ownership
      // Allow if user owns the wishlist OR session matches (for guest wishlists)
      const isOwner = userId && wishlist.userId && wishlist.userId.toString() === userId.toString();
      const isSessionMatch = sessionId && wishlist.sessionId === sessionId;
      
      if (!isOwner && !isSessionMatch) {
        // If wishlist has userId but user doesn't own it
        if (wishlist.userId && userId && !isOwner) {
          const error = new Error('Not authorized to modify this wishlist');
          error.statusCode = 403;
          throw error;
        }
        // If wishlist has sessionId but session doesn't match
        if (wishlist.sessionId && sessionId && !isSessionMatch) {
          const error = new Error('Not authorized to modify this wishlist');
          error.statusCode = 403;
          throw error;
        }
      }
      
      // Remove product
      const productIdStr = productId.toString();
      wishlist.productIds = wishlist.productIds.filter(
        id => id.toString() !== productIdStr
      );
      
      await wishlist.save();
      // Don't populate - return productIds as ObjectIds for consistency
      // await wishlist.populate('productIds', 'name price images category stock isAvailable');
      
      logger.info('Product removed from wishlist', {
        wishlistId: wishlist._id,
        productId,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      return wishlist;
    } catch (error) {
      logger.error('Error removing product from wishlist:', error);
      throw error;
    }
  }

  /**
   * Update wishlist (name, sharing)
   */
  async updateWishlist(userId, wishlistId, updateData) {
    try {
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check ownership (only authenticated users can update)
      if (!userId || !wishlist.userId || wishlist.userId.toString() !== userId.toString()) {
        const error = new Error('Not authorized to update this wishlist');
        error.statusCode = 403;
        throw error;
      }
      
      // Update name if provided
      if (updateData.name !== undefined) {
        const trimmedName = updateData.name.trim();
        if (!trimmedName) {
          const error = new Error('Wishlist name cannot be empty');
          error.statusCode = 400;
          throw error;
        }
        
        // Check if name already exists for this user
        const existing = await Wishlist.findOne({
          userId,
          name: trimmedName,
          _id: { $ne: wishlistId },
        });
        if (existing) {
          const error = new Error('Wishlist with this name already exists');
          error.statusCode = 409;
          throw error;
        }
        
        wishlist.name = trimmedName;
      }
      
      // Update sharing status
      if (updateData.isShared !== undefined) {
        wishlist.isShared = updateData.isShared;
        // shareToken will be generated/removed in pre-save hook
      }
      
      await wishlist.save();
      await wishlist.populate('productIds', 'name price images category stock isAvailable');
      
      logger.info('Wishlist updated', {
        wishlistId: wishlist._id,
        userId,
        updates: updateData,
      });
      
      return wishlist;
    } catch (error) {
      logger.error('Error updating wishlist:', error);
      throw error;
    }
  }

  /**
   * Delete wishlist
   */
  async deleteWishlist(userId, wishlistId) {
    try {
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check ownership
      if (!userId || !wishlist.userId || wishlist.userId.toString() !== userId.toString()) {
        const error = new Error('Not authorized to delete this wishlist');
        error.statusCode = 403;
        throw error;
      }
      
      // Cannot delete default wishlist
      if (wishlist.isDefault) {
        const error = new Error('Cannot delete default wishlist');
        error.statusCode = 400;
        throw error;
      }
      
      await Wishlist.deleteOne({ _id: wishlistId });
      
      logger.info('Wishlist deleted', {
        wishlistId,
        userId,
      });
      
      return { deleted: true };
    } catch (error) {
      logger.error('Error deleting wishlist:', error);
      throw error;
    }
  }

  /**
   * Share wishlist (generate share token)
   */
  async shareWishlist(userId, wishlistId) {
    try {
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check ownership
      if (!userId || !wishlist.userId || wishlist.userId.toString() !== userId.toString()) {
        const error = new Error('Not authorized to share this wishlist');
        error.statusCode = 403;
        throw error;
      }
      
      // Enable sharing (shareToken will be generated in pre-save hook)
      wishlist.isShared = true;
      await wishlist.save();
      
      logger.info('Wishlist shared', {
        wishlistId,
        userId,
        shareToken: wishlist.shareToken,
      });
      
      return {
        shareToken: wishlist.shareToken,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wishlist/shared/${wishlist.shareToken}`,
      };
    } catch (error) {
      logger.error('Error sharing wishlist:', error);
      throw error;
    }
  }

  /**
   * Revoke wishlist sharing
   */
  async revokeShare(userId, wishlistId) {
    try {
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check ownership
      if (!userId || !wishlist.userId || wishlist.userId.toString() !== userId.toString()) {
        const error = new Error('Not authorized to revoke sharing for this wishlist');
        error.statusCode = 403;
        throw error;
      }
      
      wishlist.isShared = false;
      await wishlist.save();
      
      logger.info('Wishlist sharing revoked', {
        wishlistId,
        userId,
      });
      
      return wishlist;
    } catch (error) {
      logger.error('Error revoking wishlist share:', error);
      throw error;
    }
  }

  /**
   * View shared wishlist by token
   */
  async viewSharedWishlist(shareToken) {
    try {
      const wishlist = await Wishlist.findOne({ shareToken, isShared: true })
        .populate('productIds', 'name price images category stock isAvailable');
      
      if (!wishlist) {
        const error = new Error('Shared wishlist not found or invalid token');
        error.statusCode = 404;
        throw error;
      }
      
      return wishlist;
    } catch (error) {
      logger.error('Error viewing shared wishlist:', error);
      throw error;
    }
  }

  /**
   * Add wishlist items to cart
   */
  async addToCart(userId, sessionId, wishlistId, productIds = null) {
    try {
      const wishlist = await Wishlist.findById(wishlistId)
        .populate('productIds', 'name price images category stock isAvailable');
      
      if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check access (user can add their own wishlist or shared wishlist to cart)
      // Allow access if:
      // 1. User owns the wishlist
      // 2. Wishlist is shared
      // 3. Session matches (for guest wishlists)
      const isOwner = userId && wishlist.userId && wishlist.userId.toString() === userId.toString();
      const isShared = wishlist.isShared === true;
      const isSessionMatch = sessionId && wishlist.sessionId === sessionId;
      
      // If wishlist is shared, allow access to anyone
      if (isShared) {
        // Allow access
      } else if (wishlist.userId) {
        // User wishlist - check if user owns it
        if (userId && !isOwner) {
          const error = new Error('Not authorized to access this wishlist');
          error.statusCode = 403;
          throw error;
        }
      } else if (wishlist.sessionId) {
        // Guest wishlist - check if session matches
        if (sessionId && !isSessionMatch) {
          const error = new Error('Not authorized to access this wishlist');
          error.statusCode = 403;
          throw error;
        }
      }
      
      // Determine which products to add
      const productsToAdd = productIds 
        ? wishlist.productIds.filter(p => productIds.includes(p._id.toString()))
        : wishlist.productIds;
      
      if (productsToAdd.length === 0) {
        const error = new Error('No products to add to cart');
        error.statusCode = 400;
        throw error;
      }
      
      // Add products to cart using CartService
      let itemsAdded = 0;
      let itemsSkipped = 0;
      
      for (const product of productsToAdd) {
        try {
          // Check if product is available
          if (!product.isAvailable || product.stock === 0) {
            itemsSkipped++;
            continue;
          }
          
          await CartService.addItem(userId, sessionId, product._id, 1);
          itemsAdded++;
        } catch (error) {
          // Skip products that can't be added (out of stock, etc.)
          itemsSkipped++;
          logger.warn('Failed to add product to cart from wishlist', {
            productId: product._id,
            error: error.message,
          });
        }
      }
      
      // Get updated cart
      const cart = await CartService.getCart(userId, sessionId);
      
      logger.info('Wishlist items added to cart', {
        wishlistId,
        itemsAdded,
        itemsSkipped,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
      });
      
      return {
        cart,
        itemsAdded,
        itemsSkipped,
      };
    } catch (error) {
      logger.error('Error adding wishlist items to cart:', error);
      throw error;
    }
  }
}

module.exports = new WishlistService();

