
const mongoose = require('mongoose');
const mongoUri = 'mongodb://localhost:27017/energyDNA-wind';

const EnergyTokenSchema = new mongoose.Schema({
    tokenId: Number,
    timestamp: String,
    state: String
});
const EnergyToken = mongoose.model('EnergyToken', EnergyTokenSchema);

async function check() {
    try {
        await mongoose.connect(mongoUri);
        const tokens = await EnergyToken.find({}).sort({ tokenId: -1 }).limit(5);
        console.log('TOKENS:', JSON.stringify(tokens, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
