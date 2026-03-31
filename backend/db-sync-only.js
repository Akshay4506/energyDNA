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

    const wp = await User.findOne({ role: 'windplant' });
    const adani = await User.findOne({ email: 'adani@gmail.com' });

    if (!wp || !adani) {
        console.log('USERS_MISSING');
        process.exit(1);
    }

    await EnergyToken.deleteMany({});
    
    // Token 0 - Platform/WindFarm
    await new EnergyToken({
        tokenId: 0,
        energyDnaHash: 'h0_onchain',
        turbineId: 'T1',
        timestamp: Date.now().toString(),
        energyOutput: '100',
        windSpeed: '5.0',
        windDirection: 'N',
        owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', // Known deployer
        ownerUserId: wp._id,
        state: 'Minted',
        history: [{ action: 'Minted', from: '0x000', to: '0xf39f...', txHash: '0x000' }]
    }).save();

    // Token 1 - Adani
    await new EnergyToken({
        tokenId: 1,
        energyDnaHash: 'h1_onchain',
        turbineId: 'T1',
        timestamp: Date.now().toString(),
        energyOutput: '120',
        windSpeed: '5.67',
        windDirection: 'NE',
        owner: adani.walletAddress.toLowerCase(),
        ownerUserId: adani._id,
        state: 'Transferred',
        history: [{ action: 'Minted', from: '0x000', to: '0xf39f...', txHash: '0x000' }, { action: 'Transferred', from: '0xf39f...', to: adani.walletAddress, txHash: '0x001' }]
    }).save();

    console.log('DB_SYNC_ONLY_SUCCESS');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
