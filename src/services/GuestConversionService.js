const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Wishlist = require('../models/Wishlist');
const logger = require('../config/logger');
const mongoose = require('mongoose');

class GuestConversionService {
  /**
   * Convert guest cart to user cart
   * According to spec:
   * - If user already has a cart: Merge guest cart items into user cart (combine quantities for same products)
   * - If user has no cart: Convert guest cart to user cart (set userId, clear sessionId)
   */
  async convertGuestCart(sessionId, userId) {
    try {
      const guestCart = await Cart.findOne({ sessionId });
      if (!guestCart || !guestCart.items || guestCart.items.length === 0) {
        return { converted: false, reason: 'No guest cart found or cart is empty' };
      }

      // Check if user already has a cart
      let userCart = await Cart.findOne({ userId });

      if (userCart) {
        // User already has a cart - merge guest cart items into user cart
        // Loop through guest cart items and merge them into user cart
        const guestItemsCount = guestCart.items.length;
        let itemsMerged = 0;
        let itemsAdded = 0;

        for (const guestItem of guestCart.items) {
          // Get productId as string for comparison (handle both populated and unpopulated)
          let guestProductIdStr;
          if (guestItem.productId && typeof guestItem.productId === 'object') {
            guestProductIdStr = guestItem.productId._id
              ? guestItem.productId._id.toString()
              : guestItem.productId.toString();
          } else {
            guestProductIdStr = guestItem.productId.toString();
          }

          // Find if this product already exists in user cart
          const existingItemIndex = userCart.items.findIndex(item => {
            let itemProductId;
            if (item.productId && typeof item.productId === 'object') {
              itemProductId = item.productId._id
                ? item.productId._id.toString()
                : item.productId.toString();
            } else {
              itemProductId = item.productId.toString();
            }
            return itemProductId === guestProductIdStr;
          });

          if (existingItemIndex >= 0) {
            // Product exists in user cart - add quantities together
            userCart.items[existingItemIndex].quantity += guestItem.quantity;
            userCart.items[existingItemIndex].subtotal =
              userCart.items[existingItemIndex].quantity * userCart.items[existingItemIndex].unitPrice;
            itemsMerged++;
          } else {
            // Product is new - add to user cart
            // Ensure we use ObjectId, not populated object
            const productId = guestItem.productId._id || guestItem.productId;
            userCart.items.push({
              productId: productId,
              quantity: guestItem.quantity,
              unitPrice: guestItem.unitPrice,
              subtotal: guestItem.subtotal || (guestItem.unitPrice * guestItem.quantity),
            });
            itemsAdded++;
          }
        }

        // Recalculate total
        userCart.total = userCart.items.reduce((sum, item) => sum + item.subtotal, 0);

        // Save merged cart
        await userCart.save();

        // Delete guest cart after successful merge
        await Cart.deleteOne({ sessionId });

        logger.info('Guest cart merged into user cart', {
          userId,
          sessionId,
          userCartItemCount: userCart.items.length,
          guestCartItemCount: guestItemsCount,
          itemsMerged,
          itemsAdded,
        });

        return {
          converted: true,
          merged: true,
          reason: 'Guest cart items merged into user cart',
          itemCount: userCart.items.length,
          itemsMerged,
          itemsAdded,
        };
      } else {
        // User has no cart - convert guest cart to user cart
        guestCart.userId = userId;
        guestCart.sessionId = undefined;
        guestCart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await guestCart.save();

        logger.info('Guest cart converted to user cart', {
          userId,
          sessionId,
          itemCount: guestCart.items.length,
        });

        return {
          converted: true,
          merged: false,
          reason: 'Guest cart converted to user cart',
          itemCount: guestCart.items.length
        };
      }
    } catch (error) {
      logger.error('Error converting guest cart:', error);
      throw error;
    }
  }

  /**
   * Link guest orders to user account by matching email
   */
  async linkGuestOrders(email, userId) {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      const result = await Order.updateMany(
        {
          customerEmail: normalizedEmail,
          $or: [
            { customerId: { $exists: false } },
            { customerId: null }
          ]
        },
        {
          $set: { customerId: userId },
        }
      );

      logger.info('Guest orders linked to user account', {
        userId,
        email: normalizedEmail,
        ordersLinked: result.modifiedCount,
      });

      return { ordersLinked: result.modifiedCount };
    } catch (error) {
      logger.error('Error linking guest orders:', error);
      throw error;
    }
  }

  /**
   * Convert guest wishlist to user wishlist
   * According to spec:
   * - If user already has wishlists: Merge guest wishlist productIds into user's default wishlist (remove duplicates, respect 50-item limit)
   * - If user has no wishlist: Convert guest wishlist to user's default wishlist
   */
  async convertGuestWishlist(sessionId, userId) {
    try {
      const guestWishlist = await Wishlist.findOne({ sessionId });
      if (!guestWishlist || !guestWishlist.productIds || guestWishlist.productIds.length === 0) {
        return { converted: false, reason: 'No guest wishlist found or wishlist is empty' };
      }

      // Check if user already has wishlists
      const userWishlists = await Wishlist.find({ userId });
      let defaultWishlist = userWishlists.find(w => w.isDefault);

      if (defaultWishlist) {
        // User has default wishlist - merge guest wishlist items
        const guestProductIds = guestWishlist.productIds.map(id => id.toString());
        const existingProductIds = defaultWishlist.productIds.map(id => id.toString());

        // Get unique product IDs from guest wishlist that aren't already in default wishlist
        const newProductIds = guestProductIds.filter(id => !existingProductIds.includes(id));

        // Check if adding new products would exceed 50-item limit
        const availableSlots = 50 - defaultWishlist.productIds.length;
        const productsToAdd = newProductIds.slice(0, availableSlots);

        if (productsToAdd.length > 0) {
          // Add new products to default wishlist
          defaultWishlist.productIds.push(...productsToAdd.map(id => new mongoose.Types.ObjectId(id)));
          await defaultWishlist.save();
        }

        // If there are remaining products and user has multiple wishlists, try to add to other wishlists
        const remainingProducts = newProductIds.slice(availableSlots);
        let productsAdded = productsToAdd.length;

        if (remainingProducts.length > 0 && userWishlists.length > 1) {
          // Try to add remaining products to other wishlists
          for (const otherWishlist of userWishlists) {
            if (otherWishlist._id.toString() === defaultWishlist._id.toString()) continue;

            const otherAvailableSlots = 50 - otherWishlist.productIds.length;
            if (otherAvailableSlots > 0 && remainingProducts.length > 0) {
              const toAdd = remainingProducts.slice(0, otherAvailableSlots);
              otherWishlist.productIds.push(...toAdd.map(id => new mongoose.Types.ObjectId(id)));
              await otherWishlist.save();
              productsAdded += toAdd.length;
              remainingProducts.splice(0, toAdd.length);
            }
          }
        }

        // If still have remaining products, create new wishlist for them
        if (remainingProducts.length > 0) {
          const newWishlist = await Wishlist.create({
            userId,
            name: 'My Wishlist',
            productIds: remainingProducts.map(id => new mongoose.Types.ObjectId(id)),
            isDefault: false,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          });
          productsAdded += remainingProducts.length;
        }

        // Delete guest wishlist after successful merge
        await Wishlist.deleteOne({ sessionId });

        logger.info('Guest wishlist merged into user wishlists', {
          userId,
          sessionId,
          productsAdded,
          defaultWishlistId: defaultWishlist._id,
        });

        return {
          converted: true,
          merged: true,
          reason: 'Guest wishlist items merged into user wishlists',
          productsAdded,
        };
      } else {
        // User has no wishlist - convert guest wishlist to user's default wishlist
        guestWishlist.userId = userId;
        guestWishlist.sessionId = undefined;
        guestWishlist.isDefault = true;
        guestWishlist.name = 'My Wishlist';
        guestWishlist.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
        await guestWishlist.save();

        logger.info('Guest wishlist converted to user wishlist', {
          userId,
          sessionId,
          wishlistId: guestWishlist._id,
          itemCount: guestWishlist.productIds.length,
        });

        return {
          converted: true,
          merged: false,
          reason: 'Guest wishlist converted to user default wishlist',
          itemCount: guestWishlist.productIds.length,
        };
      }
    } catch (error) {
      logger.error('Error converting guest wishlist:', error);
      throw error;
    }
  }
}

module.exports = new GuestConversionService();

