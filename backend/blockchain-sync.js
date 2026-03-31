const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const { ethers } = require('ethers');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const EnergyToken = require('./models/EnergyToken');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB_CONNECTED');

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contractAddress = process.env.CONTRACT_ADDRESS;
    console.log('SYNCING ON CONTRACT:', contractAddress);

    const abi = [
        'function mintEnergyToken(address,string,uint256,string,string,string,string,string) public returns (uint256)',
        'function transferEnergyToken(address,address,uint256) public'
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    // 1. Resolve Users
    const wp = await User.findOne({ role: 'windplant' });
    const adani = await User.findOne({ email: 'adani@gmail.com' });

    if (!wp || !adani) {
        console.log('USERS_NOT_FOUND (Run ultimate-sync.js first if needed)');
        process.exit(1);
    }

    const now = Date.now();
    await EnergyToken.deleteMany({});

    // 2. Mint Token 0 (Owned by Platform)
    console.log('MINTING TOKEN 0...');
    const tx0 = await contract.mintEnergyToken(wallet.address, 'T1', now, '5.0', 'N', '100', 'h0_onchain', 'u0');
    const receipt0 = await tx0.wait();
    console.log('TOKEN 0 MINTED:', receipt0.hash);
    
    await EnergyToken.findOneAndUpdate({ tokenId: 0 }, {
        tokenId: 0,
        energyDnaHash: 'h0_onchain',
        turbineId: 'T1',
        timestamp: now.toString(),
        energyOutput: '100',
        windSpeed: '5.0',
        windDirection: 'N',
        owner: wallet.address.toLowerCase(),
        ownerUserId: wp._id,
        state: 'Minted',
        history: [{ action: 'Minted', from: '0x000', to: wallet.address, txHash: receipt0.hash }]
    }, { upsert: true });

    // Small delay to ensure Hardhat node updates
    await new Promise(r => setTimeout(r, 2000));

    // 3. Mint and Transfer Token 1 (Owned by Adani)
    console.log('MINTING TOKEN 1...');
    const tx1 = await contract.mintEnergyToken(wallet.address, 'T1', now + 1000, '5.67', 'NE', '120', 'h1_onchain', 'u1');
    const receipt1 = await tx1.wait();
    console.log('TOKEN 1 MINTED:', receipt1.hash);

    await new Promise(r => setTimeout(r, 2000));

    console.log('TRANSFERRING TOKEN 1 TO ADANI...');
    const tx2 = await contract.transferEnergyToken(wallet.address, adani.walletAddress, 1);
    const receipt2 = await tx2.wait();
    console.log('TOKEN 1 TRANSFERRED:', receipt2.hash);

    await EnergyToken.findOneAndUpdate({ tokenId: 1 }, {
        tokenId: 1,
        energyDnaHash: 'h1_onchain',
        turbineId: 'T1',
        timestamp: (now + 1000).toString(),
        energyOutput: '120',
        windSpeed: '5.67',
        windDirection: 'NE',
        owner: adani.walletAddress.toLowerCase(),
        ownerUserId: adani._id,
        state: 'Transferred',
        history: [
            { action: 'Minted', from: '0x000', to: wallet.address, txHash: receipt1.hash },
            { action: 'Transferred', from: wallet.address, to: adani.walletAddress, txHash: receipt2.hash }
        ]
    }, { upsert: true });

    console.log('ONCHAIN_SYNC_SUCCESS');
    process.exit(0);
  } catch (e) {
    console.error('SYNC_ERROR:', e.message);
    process.exit(1);
  }
}
run();
