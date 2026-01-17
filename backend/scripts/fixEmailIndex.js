require('dotenv').config();
const mongoose = require('mongoose');

const fixEmailIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all indexes
    const indexes = await usersCollection.indexes();
    console.log('\nCurrent indexes:', indexes);

    // Drop the email index if it exists
    try {
      await usersCollection.dropIndex('email_1');
      console.log('\n✅ Successfully dropped email index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️  Email index does not exist (already removed)');
      } else {
        throw error;
      }
    }

    // Verify phoneNumber index exists
    const hasPhoneIndex = indexes.some(idx => idx.key.phoneNumber);
    if (!hasPhoneIndex) {
      await usersCollection.createIndex({ phoneNumber: 1 }, { unique: true });
      console.log('✅ Created phoneNumber unique index');
    } else {
      console.log('✅ phoneNumber index already exists');
    }

    // Remove email field from all existing documents
    const result = await usersCollection.updateMany(
      { email: { $exists: true } },
      { $unset: { email: "" } }
    );
    console.log(`\n✅ Removed email field from ${result.modifiedCount} documents`);

    console.log('\n✅ Database migration completed successfully!');
    console.log('You can now add parents using phone numbers.');

    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error.message);
    process.exit(1);
  }
};

fixEmailIndex();
