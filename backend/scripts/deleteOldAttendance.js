require('dotenv').config();
const mongoose = require('mongoose');

const deleteOldAttendance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const attendanceCollection = db.collection('attendances');

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`\nDeleting all attendance records before ${today.toDateString()}...`);

    // Delete all attendance records before today
    const result = await attendanceCollection.deleteMany({
      date: { $lt: today }
    });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} old attendance records`);
    console.log('✅ Attendance tracking will now start from today');
    console.log('\nYou can now mark attendance from today onwards.');

    process.exit(0);
  } catch (error) {
    console.error('Error deleting old attendance:', error.message);
    process.exit(1);
  }
};

deleteOldAttendance();
