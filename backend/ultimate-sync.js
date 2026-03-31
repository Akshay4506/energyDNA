const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ethers } = require('ethers');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const EnergyToken = require('./models/EnergyToken');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB_CONNECTED');

    // 1. Ensure Users Exist
    let wp = await User.findOne({ email: 'wind@energy.com' });
    if (!wp) {
        console.log('CREATING WP...');
        const wallet = ethers.Wallet.createRandom();
        wp = new User({
            role: 'windplant',
            plantName: 'North Sea Wind Farm',
            turbineName: 'T1',
            email: 'wind@energy.com',
            mobile: '1112223333',
            password: '123456', // Will be hashed by pre-save
            ownerKey: wallet.privateKey,
            walletAddress: wallet.address
        });
        await wp.save();
    }

    let adani = await User.findOne({ email: 'adani@gmail.com' });
    if (!adani) {
        console.log('CREATING ADANI...');
        const wallet = ethers.Wallet.createRandom();
        adani = new User({
            role: 'user',
            name: 'ADANI GROUP',
            email: 'adani@gmail.com',
            mobile: '9998887777',
            password: '123456',
            ownerKey: wallet.privateKey,
            walletAddress: wallet.address
        });
        await adani.save();
    }

    console.log(`WP_ID: ${wp._id}, ADANI_ID: ${adani._id}`);

    // 2. Clear and Re-sync Tokens
    await EnergyToken.deleteMany({});
    const now = Date.now();

    // Token 0 - Owned by Platform / Wind Plant User
    await new EnergyToken({
        tokenId: 0,
        energyDnaHash: 'h0_diag',
        turbineId: 'T1',
        timestamp: now.toString(),
        energyOutput: '100',
        windSpeed: '5.0',
        windDirection: 'N',
        owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', // Contract Deployer
        ownerUserId: wp._id, // LINK TO WIND PLANT
        state: 'Minted',
        history: [{ action: 'Minted', from: '0x000', to: '0xf39f...', txHash: '0xabc' }]
    }).save();

    // Token 1 - Owned by Adani
    await new EnergyToken({
        tokenId: 1,
        energyDnaHash: 'h1_diag',
        turbineId: 'T1',
        timestamp: (now+1000).toString(),
        energyOutput: '120',
        windSpeed: '5.67',
        windDirection: 'NE',
        owner: adani.walletAddress.toLowerCase(),
        ownerUserId: adani._id, // LINK TO ADANI
        state: 'Transferred',
        history: [{ action: 'Minted', from: '0x000', to: '0xf39f...', txHash: '0xdef' }, { action: 'Transferred', from: '0xf39f...', to: adani.walletAddress, txHash: '0xghi' }]
    }).save();

    console.log('FINAL_SYNC_SUCCESS');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
