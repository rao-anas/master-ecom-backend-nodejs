const cartService = require('../services/CartService');
const logger = require('../config/logger');

class CartController {
  /**
   * Get cart contents
   */
  async getCart(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;

      const cart = await cartService.getCart(userId, sessionId);

      logger.info('Cart retrieved', {
        requestId: req.id,
        cartId: cart._id,
        itemCount: cart.items.length,
      });

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add item to cart
   */
  async addItem(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { productId, quantity } = req.body;

      const cart = await cartService.addItem(userId, sessionId, productId, quantity);

      logger.info('Item added to cart', {
        requestId: req.id,
        cartId: cart._id,
        productId,
        quantity,
      });

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update item quantity in cart
   */
  async updateItem(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { productId, quantity } = req.body;

      const cart = await cartService.updateItem(userId, sessionId, productId, quantity);

      logger.info('Cart item updated', {
        requestId: req.id,
        cartId: cart._id,
        productId,
        quantity,
      });

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { productId } = req.query;

      const cart = await cartService.removeItem(userId, sessionId, productId);

      logger.info('Item removed from cart', {
        requestId: req.id,
        cartId: cart._id,
        productId,
      });

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();

