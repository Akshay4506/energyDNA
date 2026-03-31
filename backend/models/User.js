const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    role: { type: String, enum: ['windplant', 'user'], required: true },
    name: { type: String },          // For 'user' role
    plantName: { type: String },     // For 'windplant' role
    turbineName: { type: String },   // For 'windplant' role
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    ownerKey: { type: String, required: true }, // Encrypted or securely stored private key (for Energy Users)
    walletAddress: { type: String, required: true },
    unreadNotifications: { type: Number, default: 0 },
    notifications: [{
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
        tokenId: { type: Number }
    }]
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
