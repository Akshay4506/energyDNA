const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const EnergyToken = require('./models/EnergyToken');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB_CONNECTED');

    const users = await User.find({});
    console.log('--- ALL USERS ---');
    users.forEach(u => console.log(`ROLE: ${u.role}, EMAIL: ${u.email}, ID: ${u._id}, WALLET: ${u.walletAddress}`));

    const tokens = await EnergyToken.find({});
    console.log('--- ALL TOKENS ---');
    tokens.forEach(t => console.log(`ID: ${t.tokenId}, OWNER: ${t.owner}, STATE: ${t.state}, OWNER_USER_ID: ${t.ownerUserId}`));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
