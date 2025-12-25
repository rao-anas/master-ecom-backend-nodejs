const Cart = require('../models/Cart');
const Product = require('../models/Product');
const logger = require('../config/logger');

class CartService {
  /**
   * Merge duplicate items in cart by productId
   * Combines quantities and recalculates subtotals
   */
  async mergeDuplicateItems(cart) {
    try {
      if (!cart || !cart.items || cart.items.length === 0) {
        return cart;
      }

      const originalItemCount = cart.items.length;

      // Group items by productId
      const itemsMap = new Map();

      cart.items.forEach((item) => {
        // Get productId as string (handle both populated and unpopulated)
        let productIdStr;
        if (item.productId && typeof item.productId === 'object') {
          productIdStr = item.productId._id ? item.productId._id.toString() : item.productId.toString();
        } else {
          productIdStr = item.productId.toString();
        }

        if (itemsMap.has(productIdStr)) {
          // Merge with existing item - add quantities
          const existingItem = itemsMap.get(productIdStr);
          existingItem.quantity += item.quantity;
          existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
        } else {
          // First occurrence of this product
          // Keep the original productId (ObjectId, not populated object)
          const productId = item.productId._id || item.productId;
          itemsMap.set(productIdStr, {
            productId: productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal || (item.unitPrice * item.quantity),
          });
        }
      });

      // Convert map back to array
      cart.items = Array.from(itemsMap.values());

      // Recalculate total
      cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

      // Save if there were duplicates (items count changed)
      if (itemsMap.size < originalItemCount) {
        await cart.save();
        logger.info('Merged duplicate items in cart', {
          cartId: cart._id,
          beforeCount: originalItemCount,
          afterCount: itemsMap.size,
        });
      }

      return cart;
    } catch (error) {
      logger.error('Error merging duplicate items:', error);
      throw error;
    }
  }

  /**
   * Get or create cart for user/session
   */
  async getCart(userId, sessionId) {
    try {
      let cart;

      if (userId) {
        cart = await Cart.findOne({ userId });
      } else if (sessionId) {
        cart = await Cart.findOne({ sessionId });
      } else {
        throw new Error('Either userId or sessionId is required');
      }

      // Create empty cart if doesn't exist
      if (!cart) {
        const expiresAt = userId
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for authenticated
          : new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day for guest

        cart = await Cart.create({
          userId: userId || undefined,
          sessionId: sessionId || undefined,
          items: [],
          total: 0,
          expiresAt,
        });
      } else {
        // Merge any duplicate items before returning
        await this.mergeDuplicateItems(cart);
      }

      // Populate product data before returning
      await cart.populate('items.productId', 'name images category stock');

      return cart;
    } catch (error) {
      logger.error('Error getting cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItem(userId, sessionId, productId, quantity) {
    try {
      // Validate product exists and is available
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      if (product.stock < quantity) {
        const error = new Error('Insufficient stock available');
        error.statusCode = 400;
        throw error;
      }

      if (!product.isAvailable || product.stock === 0) {
        const error = new Error('Product is out of stock');
        error.statusCode = 400;
        throw error;
      }

      // Get or create cart WITHOUT populating (for accurate duplicate detection)
      let cart;
      if (userId) {
        cart = await Cart.findOne({ userId });
      } else if (sessionId) {
        cart = await Cart.findOne({ sessionId });
      } else {
        throw new Error('Either userId or sessionId is required');
      }

      // Create empty cart if doesn't exist
      if (!cart) {
        const expiresAt = userId
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for authenticated
          : new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day for guest

        cart = await Cart.create({
          userId: userId || undefined,
          sessionId: sessionId || undefined,
          items: [],
          total: 0,
          expiresAt,
        });
      } else {
        // Merge any existing duplicates before adding new item
        await this.mergeDuplicateItems(cart);
      }

      // Check if product already in cart
      // Handle both populated (Product object) and unpopulated (ObjectId) productId
      const existingItemIndex = cart.items.findIndex(
        item => {
          let itemProductId;
          if (item.productId && typeof item.productId === 'object') {
            // If it's an object, check if it has _id (populated Product) or is ObjectId
            itemProductId = item.productId._id ? item.productId._id.toString() : item.productId.toString();
          } else {
            // It's already a string or ObjectId
            itemProductId = item.productId.toString();
          }
          return itemProductId === productId.toString();
        }
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].subtotal =
          cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].unitPrice;
      } else {
        // Add new item
        cart.items.push({
          productId: product._id,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity,
        });
      }

      // Recalculate total
      cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

      await cart.save();

      // Populate product data before returning
      await cart.populate('items.productId', 'name images category stock');

      logger.info('Item added to cart', {
        cartId: cart._id,
        productId,
        quantity,
        isNewItem: existingItemIndex < 0,
      });

      return cart;
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update item quantity in cart
   */
  async updateItem(userId, sessionId, productId, quantity) {
    try {
      let cart;
      if (userId) {
        cart = await Cart.findOne({ userId });
      } else if (sessionId) {
        cart = await Cart.findOne({ sessionId });
      } else {
        throw new Error('Either userId or sessionId is required');
      }

      if (!cart) {
        const error = new Error('Cart not found');
        error.statusCode = 404;
        throw error;
      }

      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId.toString()
      );

      if (itemIndex < 0) {
        const error = new Error('Item not found in cart');
        error.statusCode = 404;
        throw error;
      }

      if (quantity === 0) {
        // Remove item
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].subtotal =
          cart.items[itemIndex].quantity * cart.items[itemIndex].unitPrice;

        // Validate stock availability
        const product = await Product.findById(productId);
        if (product.stock < quantity) {
          const error = new Error('Insufficient stock available');
          error.statusCode = 400;
          throw error;
        }
      }

      // Recalculate total
      cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

      await cart.save();

      // Populate product data before returning
      await cart.populate('items.productId', 'name images category stock');

      logger.info('Cart item updated', {
        cartId: cart._id,
        productId,
        quantity,
      });

      return cart;
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId, sessionId, productId) {
    try {
      let cart;
      if (userId) {
        cart = await Cart.findOne({ userId });
      } else if (sessionId) {
        cart = await Cart.findOne({ sessionId });
      } else {
        throw new Error('Either userId or sessionId is required');
      }

      if (!cart) {
        const error = new Error('Cart not found');
        error.statusCode = 404;
        throw error;
      }

      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId.toString()
      );

      if (itemIndex < 0) {
        const error = new Error('Item not found in cart');
        error.statusCode = 404;
        throw error;
      }

      cart.items.splice(itemIndex, 1);
      cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

      await cart.save();

      // Populate product data before returning
      await cart.populate('items.productId', 'name images category stock');

      logger.info('Item removed from cart', {
        cartId: cart._id,
        productId,
      });

      return cart;
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  /**
   * Calculate cart total
   */
  calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }
}

module.exports = new CartService();

