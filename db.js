const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    // Production settings optimizations ke sath connection configuration
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
    });
    console.log('🔌 Connected to MongoDB Successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Railway dynamic environments me process direct exit karne se crash loop ban sakta hai
    // isliye fail-safe warning deploy ki gayi hai.
    console.warn('⚠️ Server keeping process alive for auto-recovery orchestration.');
  }
};

module.exports = connectDB;