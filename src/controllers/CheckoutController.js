const orderService = require('../services/OrderService');
const logger = require('../config/logger');

class CheckoutController {
  /**
   * Create checkout session
   */
  async createCheckout(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { email, firstName, lastName, shippingAddress, billingAddress, paymentMethod } = req.body;

      const checkoutSession = await orderService.createCheckoutSession(
        userId,
        sessionId,
        email,
        firstName,
        lastName,
        shippingAddress,
        billingAddress,
        paymentMethod
      );

      logger.info('Checkout session created', {
        requestId: req.id,
        checkoutSessionId: checkoutSession.checkoutSessionId,
        paymentMethod,
      });

      res.json({
        checkoutSessionId: checkoutSession.checkoutSessionId,
        paymentMethod: checkoutSession.paymentMethod,
        clientSecret: checkoutSession.paymentIntent?.clientSecret,
        subtotal: checkoutSession.subtotal,
        shippingCost: checkoutSession.shippingCost,
        total: checkoutSession.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm checkout and create order
   */
  async confirmCheckout(req, res, next) {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      const { checkoutSessionId, email, firstName, lastName, paymentMethod, shippingAddress, billingAddress } = req.body;

      // Shipping address is required
      if (!shippingAddress) {
        return res.status(400).json({
          error: 'Shipping address is required',
          requestId: req.id,
        });
      }

      const result = await orderService.confirmCheckout(
        userId,
        sessionId,
        checkoutSessionId,
        email,
        firstName,
        lastName,
        paymentMethod,
        shippingAddress,
        billingAddress
      );

      logger.info('Checkout confirmed and order created', {
        requestId: req.id,
        orderId: result.order._id,
        orderNumber: result.order.orderNumber,
      });

      res.json(result.order);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CheckoutController();

