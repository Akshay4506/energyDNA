const mongoose = require('mongoose');
const EnergyToken = require('./models/EnergyToken');
const User = require('./models/User');

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/energyDNA-wind');
        
        const user = await User.findOne({ email: 'test_final@gmail.com' });
        if (!user) {
            console.log('User test_final@gmail.com NOT found');
            return;
        }
        
        console.log('User found:', user.email);
        console.log('User ID:', user._id.toString());
        console.log('User Wallet:', user.walletAddress);

        const tokensByID = await EnergyToken.find({ ownerUserId: user._id });
        console.log('Tokens by ownerUserId:', tokensByID.length);

        const tokensByWallet = await EnergyToken.find({ 
            owner: { $regex: new RegExp('^' + user.walletAddress + '$', 'i') } 
        });
        console.log('Tokens by Wallet Address:', tokensByWallet.length);
        
        if (tokensByWallet.length > 0) {
            console.log('First token data:', JSON.stringify(tokensByWallet[0], null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
}

check();
