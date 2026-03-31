const mongoose = require('mongoose');

const EnergyTokenSchema = new mongoose.Schema({
    tokenId: { type: Number, required: true, unique: true },
    eventIndex: { type: Number },
    turbineId: { type: String, required: true },
    timestamp: { type: String, required: true },
    windSpeed: { type: String, required: true },
    windDirection: { type: String, required: true },
    energyOutput: { type: String, required: true },
    energyDnaHash: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mintedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    state: { type: String, enum: ['Generated', 'Minted', 'Transferred', 'Retired'], default: 'Minted' },
    history: [{
        action: String,
        from: String,
        to: String,
        date: { type: Date, default: Date.now },
        txHash: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('EnergyToken', EnergyTokenSchema);
