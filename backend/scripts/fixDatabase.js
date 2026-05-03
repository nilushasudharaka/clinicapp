const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    fixDatabase();
  })
  .catch(err => console.error('MongoDB connection error:', err));

async function fixDatabase() {
  try {
    console.log('Fixing database...');

    // Drop the problematic index on Doctor collection if it exists
    try {
      const doctorsCollection = mongoose.connection.collection('doctors');
      const indexes = await doctorsCollection.getIndexes();
      
      console.log('Current indexes on doctors collection:', indexes);

      // Check if licenseNumber_1 index exists and drop it
      if (indexes.licenseNumber_1) {
        console.log('Dropping licenseNumber_1 index...');
        await doctorsCollection.dropIndex('licenseNumber_1');
        console.log('Successfully dropped licenseNumber_1 index');
      }

      // List remaining indexes
      const updatedIndexes = await doctorsCollection.getIndexes();
      console.log('Indexes after cleanup:', updatedIndexes);
    } catch (indexError) {
      console.log('No problematic indexes found or error checking indexes:', indexError.message);
    }

    console.log('Database fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing database:', error);
    process.exit(1);
  }
}
