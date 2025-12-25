const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const inventoryService = require('./InventoryService');
const paymentService = require('./PaymentService');
const logger = require('../config/logger');

// Flat rate shipping cost (configurable via environment variable, defaults to 0 for free shipping)
const FLAT_SHIPPING_COST = parseFloat(process.env.SHIPPING_COST || '0');

class OrderService {
  /**
   * Create checkout session (prepare order without creating it)
   */
  async createCheckoutSession(userId, sessionId, email, firstName, lastName, shippingAddress, billingAddress, paymentMethod) {
    try {
      // Get cart
      const cart = await Cart.findOne(
        userId ? { userId } : { sessionId }
      );

      if (!cart || !cart.items || cart.items.length === 0) {
        const error = new Error('Cart is empty');
        error.statusCode = 400;
        throw error;
      }

      // Check inventory availability
      const availability = await inventoryService.checkAvailability(cart.items);
      if (!availability.allAvailable) {
        const error = new Error('Some products are out of stock or unavailable');
        error.statusCode = 400;
        error.details = availability.unavailable;
        throw error;
      }

      // Calculate totals
      const subtotal = cart.total;
      const shippingCost = FLAT_SHIPPING_COST;
      const total = subtotal + shippingCost;

      // Create payment intent if Stripe
      let paymentIntent = null;
      if (paymentMethod === 'stripe') {
        paymentIntent = await paymentService.createPaymentIntent(total, 'USD', {
          cartId: cart._id.toString(),
          userId: userId?.toString() || sessionId,
        });
      }

      // Generate checkout session ID (in production, this would be stored in Redis or similar)
      const checkoutSessionId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store checkout session data (in production, use Redis)
      // For now, we'll include it in the response and validate on confirm

      logger.info('Checkout session created', {
        checkoutSessionId,
        cartId: cart._id,
        total,
        paymentMethod,
      });

      return {
        checkoutSessionId,
        cartId: cart._id,
        items: cart.items,
        email,
        firstName,
        lastName,
        shippingAddress,
        billingAddress,
        paymentMethod,
        subtotal,
        shippingCost,
        total,
        paymentIntent: paymentIntent ? {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        } : null,
      };
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Confirm checkout and create order
   */
  async confirmCheckout(userId, sessionId, checkoutSessionId, email, firstName, lastName, paymentMethod, shippingAddress, billingAddress) {
    try {
      // Get cart
      const cart = await Cart.findOne(
        userId ? { userId } : { sessionId }
      );

      if (!cart || !cart.items || cart.items.length === 0) {
        const error = new Error('Cart is empty');
        error.statusCode = 400;
        throw error;
      }

      // Validate checkout session (in production, retrieve from Redis)
      // For now, we'll validate the format
      if (!checkoutSessionId || !checkoutSessionId.startsWith('checkout_')) {
        const error = new Error('Invalid checkout session');
        error.statusCode = 400;
        throw error;
      }

      // If addresses are not provided, try to get from cart (fallback)
      // In production, these would be stored in the checkout session
      if (!shippingAddress) {
        const error = new Error('Shipping address is required');
        error.statusCode = 400;
        throw error;
      }

      // Use shipping address as billing address if billing address not provided
      if (!billingAddress) {
        billingAddress = shippingAddress;
      }

      // Check inventory availability again (race condition protection)
      const availability = await inventoryService.checkAvailability(cart.items);
      if (!availability.allAvailable) {
        const error = new Error('Some products are out of stock or unavailable');
        error.statusCode = 400;
        error.details = availability.unavailable;
        throw error;
      }

      // Get customer email and name - prefer provided values, fallback to user data, then default
      let customerEmail = 'guest@example.com';
      let customerFirstName = firstName || '';
      let customerLastName = lastName || '';

      if (email) {
        customerEmail = email;
      } else if (userId) {
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user) {
          if (user.email) customerEmail = user.email;
          if (!customerFirstName && user.firstName) customerFirstName = user.firstName;
          if (!customerLastName && user.lastName) customerLastName = user.lastName;
        }
      }

      // Use provided firstName/lastName if available (for both authenticated and guest users)
      if (firstName) customerFirstName = firstName;
      if (lastName) customerLastName = lastName;

      // Fetch product names for order items
      const productIds = cart.items.map(item => item.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      // Calculate totals
      const subtotal = cart.total;
      const shippingCost = FLAT_SHIPPING_COST;
      const total = subtotal + shippingCost;

      // Create order
      const order = await Order.create({
        customerId: userId || undefined,
        customerEmail,
        customerFirstName,
        customerLastName,
        items: cart.items.map(item => {
          const product = productMap.get(item.productId.toString());
          return {
            productId: item.productId,
            productName: product ? product.name : 'Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          };
        }),
        shippingAddress: shippingAddress || {
          street: 'TBD',
          city: 'TBD',
          state: 'TBD',
          zipCode: 'TBD',
          country: 'TBD',
        },
        billingAddress: billingAddress || shippingAddress || {
          street: 'TBD',
          city: 'TBD',
          state: 'TBD',
          zipCode: 'TBD',
          country: 'TBD',
        },
        paymentMethod,
        paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'processing',
        orderStatus: 'pending',
        subtotal,
        shippingCost,
        total,
      });

      // Decrement inventory (atomic operation)
      await inventoryService.decrementStock(cart.items, order._id);

      // Create payment transaction
      let paymentTransaction = null;
      if (paymentMethod === 'stripe') {
        // In production, retrieve payment intent ID from checkout session
        const transactionId = `pi_${Date.now()}`;
        paymentTransaction = await paymentService.createPaymentTransaction(
          order._id,
          transactionId,
          total,
          'stripe',
          'processing'
        );
        order.paymentTransactionId = transactionId;
        await order.save();
      } else if (paymentMethod === 'cash_on_delivery') {
        const transactionId = `cod_${order.orderNumber}`;
        paymentTransaction = await paymentService.createPaymentTransaction(
          order._id,
          transactionId,
          total,
          'cash_on_delivery',
          'pending'
        );
      }

      // Clear cart
      cart.items = [];
      cart.total = 0;
      await cart.save();

      logger.info('Order created successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total,
        paymentMethod,
      });

      return {
        order,
        paymentTransaction,
      };
    } catch (error) {
      logger.error('Error confirming checkout:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('items.productId', 'name images')
        .populate('customerId', 'email firstName lastName');

      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }

      return order;
    } catch (error) {
      logger.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber) {
    try {
      const order = await Order.findOne({ orderNumber })
        .populate('items.productId', 'name images')
        .populate('customerId', 'email firstName lastName');

      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }

      return order;
    } catch (error) {
      logger.error('Error getting order by number:', error);
      throw error;
    }
  }

  /**
   * Get order history for a user
   */
  async getOrderHistory(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [orders, total] = await Promise.all([
        Order.find({ customerId: userObjectId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('items.productId', 'name images')
          .populate('customerId', 'email firstName lastName'),
        Order.countDocuments({ customerId: userObjectId }),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting order history:', error);
      throw error;
    }
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('items.productId', 'name images')
          .populate('customerId', 'email firstName lastName'),
        Order.countDocuments({}),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting all orders:', error);
      throw error;
    }
  }

  /**
   * Update order status (admin only)
   */
  async updateOrderStatus(orderNumber, newStatus) {
    try {
      const order = await Order.findOne({ orderNumber });

      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(newStatus)) {
        const error = new Error('Invalid order status');
        error.statusCode = 400;
        throw error;
      }

      // Update status and set timestamps
      order.orderStatus = newStatus;

      if (newStatus === 'shipped' && !order.shippedAt) {
        order.shippedAt = new Date();
      } else if (newStatus === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
      } else if (newStatus === 'cancelled' && !order.cancelledAt) {
        order.cancelledAt = new Date();
      }

      await order.save();

      // Populate before returning
      await order.populate('items.productId', 'name images');
      await order.populate('customerId', 'email firstName lastName');

      logger.info('Order status updated', {
        orderNumber,
        newStatus,
        orderId: order._id,
      });

      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order tracking information (public endpoint, no auth required)
   */
  async getOrderTracking(orderNumber) {
    try {
      const order = await Order.findOne({ orderNumber }).select(
        'orderNumber orderStatus shippedAt deliveredAt cancelledAt createdAt'
      );

      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        trackingInfo: {
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          cancelledAt: order.cancelledAt,
          createdAt: order.createdAt,
        },
      };
    } catch (error) {
      logger.error('Error getting order tracking:', error);
      throw error;
    }
  }
}

module.exports = new OrderService();

