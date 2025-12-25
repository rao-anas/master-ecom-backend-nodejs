const Stripe = require('stripe');
const PaymentTransaction = require('../models/PaymentTransaction');
const logger = require('../config/logger');

class PaymentService {
  constructor() {
    // In test mode, don't initialize Stripe to avoid real API calls
    if (process.env.NODE_ENV === 'test') {
      this.stripe = null;
    } else {
      this.stripe = process.env.STRIPE_SECRET_KEY
        ? new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-12-18.acacia',
          })
        : null;
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createPaymentIntent(amount, currency = 'USD', metadata = {}) {
    try {
      if (!this.stripe) {
        // In test environment, return mock payment intent
        if (process.env.NODE_ENV === 'test') {
          return {
            id: 'pi_test_' + Date.now(),
            client_secret: 'pi_test_' + Date.now() + '_secret_xyz',
            status: 'requires_payment_method',
          };
        }
        throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Stripe payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Retrieve Stripe payment intent
   */
  async retrievePaymentIntent(paymentIntentId) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe is not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
      };
    } catch (error) {
      logger.error('Error retrieving Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Create payment transaction record
   */
  async createPaymentTransaction(orderId, transactionId, amount, paymentMethod, status, stripePaymentIntentId = null) {
    try {
      const transaction = await PaymentTransaction.create({
        orderId,
        transactionId,
        amount,
        currency: 'USD',
        paymentMethod,
        status,
        stripePaymentIntentId,
      });

      logger.info('Payment transaction created', {
        transactionId: transaction._id,
        orderId,
        paymentMethod,
        status,
      });

      return transaction;
    } catch (error) {
      logger.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  /**
   * Update payment transaction status
   */
  async updatePaymentTransaction(transactionId, status, failureReason = null, stripeChargeId = null) {
    try {
      const transaction = await PaymentTransaction.findOneAndUpdate(
        { transactionId },
        {
          status,
          failureReason,
          stripeChargeId,
        },
        { new: true }
      );

      if (!transaction) {
        throw new Error(`Payment transaction ${transactionId} not found`);
      }

      logger.info('Payment transaction updated', {
        transactionId: transaction._id,
        status,
      });

      return transaction;
    } catch (error) {
      logger.error('Error updating payment transaction:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();

