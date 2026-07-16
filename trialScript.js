const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  joinedAt: Date,
  status: { type: String, default: 'trial' }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const checkExpiredTrials = async () => {
  try {
    console.log('⏳ Checking for expired user trials...');
    const limitDays = parseInt(process.env.TRIAL_DAYS_LIMIT || '7', 10);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - limitDays);

    const result = await User.updateMany(
      { status: 'trial', joinedAt: { $lte: expiryDate } },
      { $set: { status: 'expired' } }
    );

    console.log(`🔄 Trial check completed. Updated ${result.modifiedCount} expired users.`);
  } catch (error) {
    console.error('❌ Error updating expired trials:', error.message);
  }
};

if (require.main === module) {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI to run trial tracker.');
    process.exit(1);
  }
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      await checkExpiredTrials();
      mongoose.connection.close();
    })
    .catch(err => console.error(err));
}

module.exports = { checkExpiredTrials };