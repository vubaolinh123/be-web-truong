import mongoose from 'mongoose';
import logger from './logger.js';

const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university';

    await mongoose.connect(mongoURI, {
      dbName: process.env.DB_NAME || 'university'
    });

    // Only log connection errors and disconnections
    mongoose.connection.on('error', (err) => {
      logger.error('❌ Lỗi kết nối MongoDB:', {
        error: err.message,
        stack: err.stack
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB đã ngắt kết nối');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Không thể kết nối tới MongoDB:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

export default connectDatabase;
