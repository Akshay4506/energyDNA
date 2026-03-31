
const mongoose = require('mongoose');
const mongoUri = 'mongodb://localhost:27017/energyDNA-wind';

const EnergyToken = mongoose.model('EnergyToken', new mongoose.Schema({
    tokenId: Number,
    timestamp: String,
    state: String
}));

async function check() {
    try {
        await mongoose.connect(mongoUri);
        const token = await EnergyToken.findOne({ tokenId: 0 });
        if (token) {
            console.log('---TOKEN_START---');
            console.log('tokenId:', token.tokenId);
            console.log('timestamp:', token.timestamp);
            console.log('state:', token.state);
            console.log('---TOKEN_END---');
        } else {
            console.log('Token 0 not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
