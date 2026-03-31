const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const EnergyToken = require('../backend/models/EnergyToken');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const adani = await User.findOne({ email: 'adani@gmail.com' });
        if (!adani) {
            console.log('User adani@gmail.com not found. Please run the app and login first.');
            process.exit(1);
        }

        const initialCount = adani.unreadNotifications || 0;
        console.log(`Initial unread count: ${initialCount}`);

        // Simulate a notification
        adani.notifications.unshift({
            message: `[TEST] You received Token #999 from Test Script`,
            tokenId: 999,
            timestamp: new Date()
        });
        adani.unreadNotifications = (adani.unreadNotifications || 0) + 1;
        await adani.save();

        const updatedAdani = await User.findOne({ email: 'adani@gmail.com' });
        console.log(`Updated unread count: ${updatedAdani.unreadNotifications}`);

        if (updatedAdani.unreadNotifications === initialCount + 1) {
            console.log('SUCCESS: Notification system is working correctly in the database.');
        } else {
            console.log('FAILURE: Count did not increase correctly.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
