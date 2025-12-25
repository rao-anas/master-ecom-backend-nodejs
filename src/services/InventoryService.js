const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const logger = require('../config/logger');

class InventoryService {
  /**
   * Check if products have sufficient stock
   */
  async checkAvailability(items) {
    try {
      const availabilityChecks = await Promise.all(
        items.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (!product) {
            return {
              productId: item.productId,
              available: false,
              reason: 'Product not found',
            };
          }
          if (product.stock < item.quantity) {
            return {
              productId: item.productId,
              available: false,
              reason: 'Insufficient stock',
              availableStock: product.stock,
              requested: item.quantity,
            };
          }
          return {
            productId: item.productId,
            available: true,
          };
        })
      );

      const unavailable = availabilityChecks.filter(check => !check.available);
      return {
        allAvailable: unavailable.length === 0,
        unavailable,
      };
    } catch (error) {
      logger.error('Error checking inventory availability:', error);
      throw error;
    }
  }

  /**
   * Decrement stock for products in an order
   */
  async decrementStock(items, orderId) {
    try {
      // MongoDB Memory Server doesn't support transactions, so skip in test mode
      const useTransactions = process.env.NODE_ENV !== 'test';

      if (useTransactions) {
        const session = await Product.startSession();
        session.startTransaction();

        try {
          const decrementResults = await Promise.all(
            items.map(async (item) => {
              const product = await Product.findById(item.productId).session(session);
              if (!product) {
                throw new Error(`Product ${item.productId} not found`);
              }

              const previousStock = product.stock;
              if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
              }

              product.stock -= item.quantity;
              await product.save({ session });

              // Log inventory change
              await InventoryLog.create([{
                productId: product._id,
                orderId,
                changeType: 'sale',
                quantityChange: -item.quantity,
                previousStock,
                newStock: product.stock,
                reason: 'Order placed',
              }], { session });

              return {
                productId: product._id,
                previousStock,
                newStock: product.stock,
              };
            })
          );

          await session.commitTransaction();
          session.endSession();

          logger.info('Inventory decremented successfully', {
            orderId,
            items: decrementResults,
          });

          return decrementResults;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
        }
      } else {
        // Non-transactional approach for test environments
        const decrementResults = await Promise.all(
          items.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) {
              throw new Error(`Product ${item.productId} not found`);
            }

            const previousStock = product.stock;
            if (product.stock < item.quantity) {
              throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
            }

            product.stock -= item.quantity;
            await product.save();

            // Log inventory change
            await InventoryLog.create({
              productId: product._id,
              orderId,
              changeType: 'sale',
              quantityChange: -item.quantity,
              previousStock,
              newStock: product.stock,
              reason: 'Order placed',
            });

            return {
              productId: product._id,
              previousStock,
              newStock: product.stock,
            };
          })
        );

        logger.info('Inventory decremented successfully', {
          orderId,
          items: decrementResults,
        });

        return decrementResults;
      }
    } catch (error) {
      logger.error('Error decrementing inventory:', error);
      throw error;
    }
  }

  /**
   * Log inventory change
   */
  async logInventoryChange(productId, changeType, quantityChange, previousStock, newStock, orderId = null, reason = null) {
    try {
      const log = await InventoryLog.create({
        productId,
        orderId,
        changeType,
        quantityChange,
        previousStock,
        newStock,
        reason,
      });

      logger.info('Inventory change logged', {
        logId: log._id,
        productId,
        changeType,
        quantityChange,
      });

      return log;
    } catch (error) {
      logger.error('Error logging inventory change:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();

