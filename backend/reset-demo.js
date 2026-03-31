const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/energyDNA-wind').then(async () => {
    console.log('Connected to MongoDB');

    // 1. Clear all energy tokens
    const tokenResult = await mongoose.connection.db.collection('energytokens').deleteMany({});
    console.log(`Deleted ${tokenResult.deletedCount} energy tokens`);

    // 2. Clear all user notifications and reset unread counts
    const notifResult = await mongoose.connection.db.collection('users').updateMany(
        {},
        { $set: { notifications: [], unreadNotifications: 0 } }
    );
    console.log(`Cleared notifications for ${notifResult.modifiedCount} users`);

    // 3. List remaining users (preserved for login)
    const users = await mongoose.connection.db.collection('users').find({}, { projection: { email: 1, role: 1, name: 1, _id: 0 } }).toArray();
    console.log('\nPreserved user accounts:');
    users.forEach(u => console.log(`  ${u.role} | ${u.email} | ${u.name}`));

    console.log('\n✅ Database cleaned! Now restart Hardhat and the server for a fresh blockchain.');
    process.exit();
}).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
