const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const fs = require('fs');
const csv = require('csv-parser');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const JWT_SECRET = 'energydna-secret-key-2026'; // Hardcoded for reliability across environments

const app = express();
app.use(cors());
app.use(express.json());

const EnergyToken = require('./models/EnergyToken');
const User = require('./models/User');
const { reconcileBlockchainWithDB } = require('./blockchain-sync');

// JWT Auth Middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Custom Connected (energyDNA-wind)');
        
        // 🔄 Sync DB with Blockchain on startup
        await reconcileBlockchainWithDB();

        const tokens = await EnergyToken.find({});
        console.log(`[DIAG] TOTAL TOKENS IN DB: ${tokens.length}`);
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Blockchain Setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider); // Owner wallet for minting

// The EnergyDNA contract ABI and Address will be loaded dynamically or supplied in ENV
let contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = require('../contracts/artifacts/contracts/EnergyDNA.sol/EnergyDNA.json').abi;
const energyContract = new ethers.Contract(contractAddress, contractABI, wallet);

// syncBlockchain removed to prevent startup crashes. Refer to standalone sync script.
// syncBlockchain removed from here, moved to mongoose connection then() callback

// Parse CSV Dataset
let energyEvents = [];
fs.createReadStream('../dataset/T1.csv')
  .pipe(csv())
  .on('data', (data) => energyEvents.push(data))
  .on('end', () => {
    console.log('Dataset T1.csv parsed. Total events:', energyEvents.length);
  });

app.get('/dataset-events', (req, res) => {
    const sliced = energyEvents.slice(0, 100).map((ev, index) => ({
        ...ev,
        originalIndex: index
    }));
    res.json(sliced);
});

// ========== AUTH ENDPOINTS ==========
// --- Auth Endpoints ---
app.post('/auth/signup', async (req, res) => {
    try {
        const { role, plantName, turbineName, name, email, mobile, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        // Auto-generate Ethereum wallet for the user
        const wallet = ethers.Wallet.createRandom();
        const ownerKey = wallet.privateKey;
        const walletAddress = wallet.address;

        const user = new User({
            role: role || 'user',
            plantName,
            turbineName,
            name,
            email,
            mobile,
            password,
            ownerKey,
            walletAddress
        });
        await user.save();

        // 3. Fund the new wallet with some ETH for gas (from the owner wallet)
        try {
            const tx = await wallet.sendTransaction({
                to: walletAddress,
                value: ethers.parseEther("0.05") // 0.05 ETH for gas
            });
            await tx.wait();
            console.log(`Funded new wallet ${walletAddress} with 0.05 ETH`);
        } catch (fundErr) {
            console.error("Failed to fund wallet (check if main wallet has ETH):", fundErr.message);
            // We continue anyway, as the user is at least registered
        }
        
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, plantName: user.plantName, email: user.email, role: user.role, walletAddress: user.walletAddress } });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email, role });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, plantName: user.plantName, email: user.email, role: user.role, walletAddress: user.walletAddress } });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Personalized User Stats
app.get('/user-stats', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const myTokens = await EnergyToken.find({ ownerUserId: user._id });
        const totalReceived = myTokens.length;
        const totalRetired = myTokens.filter(t => t.state === 'Retired').length;
        const totalTransferred = await EnergyToken.countDocuments({ 
            history: { 
                $elemMatch: { 
                    action: 'Transferred', 
                    from: { $regex: new RegExp(`^${user.walletAddress}$`, 'i') } 
                } 
            }
        });

        res.json({ 
            totalMinted: 0, // Users don't mint
            received: totalReceived,
            transferred: totalTransferred,
            retired: totalRetired 
        });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.get('/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.get('/my-tokens', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const tokens = await EnergyToken.find({ owner: { $regex: new RegExp(user.walletAddress, 'i') } });
        res.json(tokens);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// --- New Profile & Notifications ---
app.get('/auth/notifications', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ 
            notifications: user.notifications.slice(0, 10), 
            unreadCount: user.unreadNotifications || 0 
        });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.post('/auth/notifications/read-all', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, { 
            unreadNotifications: 0,
            'notifications.$[].read': true 
        });
        res.json({ message: "Notifications marked as read" });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.post('/auth/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const notif = user.notifications.id(req.params.id);
        if (notif && !notif.read) {
            notif.read = true;
            user.unreadNotifications = Math.max(0, (user.unreadNotifications || 0) - 1);
            await user.save();
        }
        res.json({ message: "Notification marked as read", unreadCount: user.unreadNotifications });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.put('/auth/profile', authMiddleware, async (req, res) => {
    console.log(`[API] PUT /auth/profile - User: ${req.userId}`);
    try {
        const { name, mobile, password } = req.body;
        const updateData = { name, mobile };
        
        if (password) {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true });
        res.json({ message: "Profile updated successfully", user: {
            name: user.name,
            email: user.email,
            role: user.role,
            mobile: user.mobile
        }});
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.get('/resolve-recipient', async (req, res) => {
    try {
        const { id } = req.query;
        const cleanId = id?.toLowerCase().trim();
        console.log(`[RESOLVE] Attempting to find wallet for: "${cleanId}"`);
        const user = await User.findOne({
            $or: [
                { email: cleanId },
                { mobile: cleanId }
            ]
        });
        if (!user) {
            console.log(`[RESOLVE] 404: No user found for: "${cleanId}"`);
            return res.status(404).json({ error: "Recipient not found" });
        }
        console.log(`[RESOLVE] Found: ${user.walletAddress}`);
        res.json({ walletAddress: user.walletAddress });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.post('/mint-energy', async (req, res) => {
    try {
        const { eventIndex, toAddress } = req.body;
        const event = energyEvents[eventIndex];
        if (!event) return res.status(404).json({ error: "Event not found" });

        const turbineId = "T1";
        const timestamp = new Date(event['Date/Time']).getTime() || Date.now();
        const windSpeed = event['Wind Speed (m/s)'];
        const windDirection = event['Wind Direction (°)'];
        const energyOutput = event['LV ActivePower (kW)'];

        // Generate EnergyDNA Hash
        const dataString = `${turbineId}${timestamp}${windSpeed}${energyOutput}`;
        const energyDnaHash = crypto.createHash('sha256').update(dataString).digest('hex');

        // Mint token via smart contract
        const tokenURI = `energy:${energyDnaHash}`; // Placeholder URI
        console.log("Preparing to mint with ethers...");
        const tx = await energyContract.mintEnergyToken(
            toAddress,
            turbineId,
            timestamp,
            windSpeed,
            windDirection,
            energyOutput,
            energyDnaHash,
            tokenURI
        );
        console.log("Tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Receipt received:", receipt.blockNumber);

        // Extract tokenId from events
        let tokenId;
        for (const log of receipt.logs) {
            try {
                const parsedLog = energyContract.interface.parseLog(log);
                if (parsedLog.name === 'EnergyTokenMinted') {
                    tokenId = Number(parsedLog.args.tokenId);
                    break;
                }
            } catch (e) {
                // Ignore logs that can't be parsed by this interface
            }
        }

        // Save to DB
        const newToken = new EnergyToken({
            tokenId,
            turbineId,
            timestamp: new Date(timestamp).toISOString(),
            windSpeed,
            windDirection,
            energyOutput,
            energyDnaHash,
            owner: toAddress,
            state: 'Minted',
            history: [{
                action: 'Minted',
                from: '0x0000000000000000000000000000000000000000',
                to: toAddress,
                txHash: tx.hash
            }]
        });
        await newToken.save();
        console.log("Saved to DB!");

        res.json({ message: "Minted successfully", token: newToken, txHash: tx.hash });
    } catch (error) {
        console.error(error);
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.get('/energy-token/:id', async (req, res) => {
    try {
        const token = await EnergyToken.findOne({ tokenId: req.params.id }).lean();
        if (!token) return res.status(404).json({ error: "Token not found" });
        
        // Find owner user
        const ownerUser = await User.findOne({ 
            $or: [
                { _id: token.ownerUserId },
                { walletAddress: { $regex: new RegExp(`^${token.owner}$`, 'i') } }
            ]
        });
        
        if (ownerUser) {
            token.ownerName = ownerUser.plantName || ownerUser.name;
            token.ownerEmail = ownerUser.email;
        }

        res.json(token);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.post('/transfer-energy', async (req, res) => {
    try {
        const { tokenId, fromAddress, toAddress, fromPrivateKey } = req.body;
        
        const senderWallet = new ethers.Wallet(fromPrivateKey, provider);
        const senderContract = new ethers.Contract(contractAddress, contractABI, senderWallet);

        const tx = await senderContract.transferEnergyToken(fromAddress, toAddress, tokenId);
        await tx.wait();

        const token = await EnergyToken.findOne({ tokenId });
        token.owner = toAddress;
        token.state = 'Transferred';
        token.history.push({
            action: 'Transferred',
            from: fromAddress,
            to: toAddress,
            txHash: tx.hash
        });
        await token.save();

        res.json({ message: "Transferred successfully", txHash: tx.hash });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.post('/retire-energy', async (req, res) => {
    try {
        const { tokenId, ownerPrivateKey } = req.body;
        
        const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
        const ownerContract = new ethers.Contract(contractAddress, contractABI, ownerWallet);

        const tx = await ownerContract.retireEnergyToken(tokenId);
        await tx.wait();

        const token = await EnergyToken.findOne({ tokenId });
        token.state = 'Retired';
        token.history.push({
            action: 'Retired',
            from: token.owner,
            to: '0x0000000000000000000000000000000000000000',
            txHash: tx.hash
        });
        await token.save();

        res.json({ message: "Retired successfully", txHash: tx.hash });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.get('/energy-history/:tokenId', async (req, res) => {
    try {
        const token = await EnergyToken.findOne({ tokenId: req.params.tokenId }).lean();
        if (!token) return res.status(404).json({ error: "Token not found" });
        
        const historyWithNames = await Promise.all(token.history.map(async (h) => {
            const fromUser = await User.findOne({ walletAddress: { $regex: new RegExp(`^${h.from}$`, 'i') } });
            const toUser = await User.findOne({ walletAddress: { $regex: new RegExp(`^${h.to}$`, 'i') } });
            
            return {
                ...h,
                fromName: fromUser ? (fromUser.plantName || fromUser.name || fromUser.email) : h.from,
                toName: toUser ? (toUser.plantName || toUser.name || toUser.email) : h.to
            };
        }));

        res.json(historyWithNames);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

app.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'windplant') return res.status(403).json({ error: "Unauthorized" });

        // Since the platform represents a single Wind Power company,
        // all global generating activity belongs to this plant implicitly.
        const totalMinted = await EnergyToken.countDocuments();
        const transferred = await EnergyToken.countDocuments({ 'history.action': 'Transferred' });
        const retired = await EnergyToken.countDocuments({ state: 'Retired' });
        
        res.json({ totalMinted, transferred, retired, turbines: 1 });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Prepare mint — returns metadata + hash WITHOUT minting (frontend does the actual minting via MetaMask)
app.post('/prepare-mint', async (req, res) => {
    try {
        const { eventIndex } = req.body;
        const event = energyEvents[eventIndex];
        if (!event) return res.status(404).json({ error: "Event not found" });

        // Calculate next persistent Token ID based on DB state
        const lastToken = await EnergyToken.findOne().sort({ tokenId: -1 });
        const nextTokenId = lastToken ? lastToken.tokenId + 1 : 0;

        const turbineId = "T1";
        const timestamp = new Date(event['Date/Time']).getTime() || Date.now();
        // Standardize formats for hashing
        const windSpeed = Number(event['Wind Speed (m/s)']).toFixed(2);
        const windDirection = Number(event['Wind Direction (°)']).toFixed(2);
        const energyOutput = Number(event['LV ActivePower (kW)']).toFixed(2);

        const dataString = `${turbineId}${timestamp}${windSpeed}${energyOutput}`;
        const energyDnaHash = crypto.createHash('sha256').update(dataString).digest('hex');

        res.json({
            tokenId: nextTokenId,
            turbineId,
            timestamp,
            windSpeed,
            windDirection,
            energyOutput,
            energyDnaHash,
            tokenURI: `energy:${energyDnaHash}`
        });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Save minted token to DB after frontend mints via MetaMask
app.post('/save-minted-token', async (req, res) => {
    try {
        const { tokenId, eventIndex, turbineId, timestamp, windSpeed, windDirection, energyOutput, energyDnaHash, owner, txHash } = req.body;
        const normalizedTokenId = Number(tokenId);
        const normalizedEventIndex = Number(eventIndex);
        const normalizedTimestamp = new Date(timestamp).toISOString();

        // Find the user who owns this wallet
        const ownerUser = await User.findOne({ walletAddress: { $regex: new RegExp(`^${owner}$`, 'i') } });

        // Local Hardhat token IDs reset after restarts, while Mongo keeps old rows.
        // Reconcile against any existing DB record instead of failing on unique indexes.
        let token = await EnergyToken.findOne({
            $or: [
                { tokenId: normalizedTokenId },
                { energyDnaHash },
                { eventIndex: normalizedEventIndex }
            ]
        });

        if (!token) {
            token = new EnergyToken();
        }

        token.tokenId = normalizedTokenId;
        token.eventIndex = normalizedEventIndex;
        token.turbineId = turbineId;
        token.timestamp = normalizedTimestamp;
        token.windSpeed = windSpeed;
        token.windDirection = windDirection;
        token.energyOutput = energyOutput;
        token.energyDnaHash = energyDnaHash;
        token.owner = owner;
        token.ownerUserId = ownerUser?._id || null;
        token.mintedByUserId = ownerUser?._id || null;
        token.state = 'Minted';
        token.history = Array.isArray(token.history) ? token.history : [];

        const alreadyLogged = token.history.some(
            (entry) => entry.action === 'Minted' && entry.txHash === txHash
        );

        if (!alreadyLogged) {
            token.history.push({
                action: 'Minted',
                from: '0x0000000000000000000000000000000000000000',
                to: owner,
                txHash
            });
        }

        await token.save();
        res.json({ message: "Token saved to DB", token });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Update token state after frontend Transfer/Retire via MetaMask
app.post('/update-token-state', async (req, res) => {
    try {
        const { tokenId, action, from, to, txHash } = req.body;
        const token = await EnergyToken.findOne({ tokenId: Number(tokenId) });
        if (!token) return res.status(404).json({ error: "Token not found" });

        if (action === 'Transferred') {
            token.owner = to;
            token.state = 'Transferred';
            // Link to receiver's account if they're registered; otherwise nullify the old owner's ID
            const receiverUser = await User.findOne({ walletAddress: { $regex: new RegExp(`^${to}$`, 'i') } });
            token.ownerUserId = receiverUser ? receiverUser._id : null;
        } else if (action === 'Retired') {
            token.state = 'Retired';
        }
        
        token.history.push({ action, from, to, txHash });
        await token.save();

        // 5. CREATE NOTIFICATION FOR RECIPIENT
        if (action === 'Transferred') {
            const receiverUser = await User.findOne({ walletAddress: { $regex: new RegExp(to, 'i') } });
            if (receiverUser) {
                receiverUser.notifications.unshift({
                    message: `You received Token #${tokenId} from ${from.substring(0, 6)}...`,
                    tokenId: Number(tokenId),
                    timestamp: new Date()
                });
                receiverUser.unreadNotifications = (receiverUser.unreadNotifications || 0) + 1;
                await receiverUser.save();
            }
        }

        res.json({ message: `Token ${action} successfully`, token });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Transfer Token via Email/Phone (Backend Signed)
app.post('/transfer-token-email', authMiddleware, async (req, res) => {
    try {
        const { tokenId, recipientIdentifier } = req.body;
        const sender = await User.findById(req.userId);
        if (!sender) return res.status(404).json({ error: "Sender not found" });

        const cleanIdentifier = recipientIdentifier?.toLowerCase().trim();
        const recipient = await User.findOne({
            $or: [
                { email: cleanIdentifier },
                { mobile: cleanIdentifier }
            ]
        });
        if (!recipient) {
            console.log(`[TRANSFER] 404: Recipient not found for identifier: "${cleanIdentifier}"`);
            return res.status(404).json({ error: "Recipient not found. They must have an account on this platform." });
        }

        // 2. Validate Sender owns the token
        const token = await EnergyToken.findOne({ tokenId: Number(tokenId) });
        if (!token) return res.status(404).json({ error: "Token not found" });

        const isIdOwner = token.ownerUserId && token.ownerUserId.toString() === req.userId;
        const isWalletOwner = token.owner && sender.walletAddress && token.owner.toLowerCase() === sender.walletAddress.toLowerCase();

        if (!isIdOwner && !isWalletOwner) {
            return res.status(403).json({ error: "You are not the owner of this token" });
        }

        // 3. Setup provider & wallet (backend signing using platform wallet to pay for gas)
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
        // We use the platform's main wallet 'wallet' (defined at top) to sign the transaction
        // Since we are the owner(), the contract will allow us to transfer on behalf of 'from'

        console.log(`[TRANSFER] DEBUG: Contract=${process.env.CONTRACT_ADDRESS}, RPC=${process.env.RPC_URL}, TargetTokenId=${tokenId}`);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
            "function transferEnergyToken(address from, address to, uint256 tokenId) public",
            "function ownerOf(uint256 tokenId) public view returns (address)"
        ], wallet);

        // 4. Send transaction
        // We get the ACTUAL current owner from the blockchain to avoid 'incorrect owner' revert
        const currentBlockchainOwner = await contract.ownerOf(tokenId);
        console.log(`[TRANSFER] DEBUG: CurrentOwnerOnChain=${currentBlockchainOwner}`);
        const tx = await contract.transferEnergyToken(currentBlockchainOwner, recipient.walletAddress, tokenId);
        const receipt = await tx.wait();

        // 5. Update Database
        token.owner = recipient.walletAddress;
        token.ownerUserId = recipient._id;
        token.state = 'Transferred';
        token.history.push({
            action: 'Transferred',
            from: sender.walletAddress || 'Platform / Backend',
            to: recipient.walletAddress,
            txHash: receipt.hash
        });
        await token.save();

        // 6. CREATE NOTIFICATION FOR RECIPIENT
        const notification = {
            message: `You received Token #${tokenId} from ${sender.plantName || sender.name || 'Anonymous'}`,
            tokenId: Number(tokenId),
            timestamp: new Date()
        };
        recipient.notifications.unshift(notification);
        recipient.unreadNotifications = (recipient.unreadNotifications || 0) + 1;
        await recipient.save();

        res.json({ message: "Transfer successful", txHash: receipt.hash, token });
    } catch (error) {
        console.error("Transfer Error:", error);
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Consume/Retire Token (Backend Signed)
app.post('/consume-token-backend', authMiddleware, async (req, res) => {
    try {
        const { tokenId } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const token = await EnergyToken.findOne({ tokenId: Number(tokenId) });
        if (!token) return res.status(404).json({ error: "Token not found" });

        const isIdOwner = token.ownerUserId && token.ownerUserId.toString() === req.userId;
        const isWalletOwner = token.owner && user.walletAddress && token.owner.toLowerCase() === user.walletAddress.toLowerCase();

        if (!isIdOwner && !isWalletOwner) {
            return res.status(403).json({ error: "You do not own this token" });
        }

        // Backend signed (using platform wallet as custodian)
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
        console.log(`[RETREAT] DEBUG: Contract=${process.env.CONTRACT_ADDRESS}, RPC=${process.env.RPC_URL}, TargetTokenId=${tokenId}`);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
            "function retireEnergyToken(uint256 tokenId) public"
        ], wallet);

        const tx = await contract.retireEnergyToken(tokenId);
        const receipt = await tx.wait();

        token.state = 'Retired';
        token.history.push({
            action: 'Retired',
            from: user.walletAddress,
            to: '0x0000000000000000000000000000000000000000',
            txHash: receipt.hash
        });
        await token.save();

        res.json({ message: "Energy consumed successfully", txHash: receipt.hash, token });
    } catch (error) {
        console.error("Consumption Error:", error);
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Verify EnergyDNA hash — recompute and compare
app.get('/verify-hash/:tokenId', async (req, res) => {
    try {
        const token = await EnergyToken.findOne({ tokenId: Number(req.params.tokenId) });
        if (!token) return res.status(404).json({ error: "Token not found" });

        // Standardize formats to match minting logic exactly
        const turbineId = token.turbineId;
        const timestamp = new Date(token.timestamp).getTime();
        const windSpeed = Number(token.windSpeed).toFixed(2);
        const energyOutput = Number(token.energyOutput).toFixed(2);

        const dataString = `${turbineId}${timestamp}${windSpeed}${energyOutput}`;
        const recomputedHash = crypto.createHash('sha256').update(dataString).digest('hex');

        const isValid = recomputedHash === token.energyDnaHash;
        res.json({
            isValid,
            storedHash: token.energyDnaHash,
            recomputedHash,
            message: isValid ? 'EnergyDNA hash verified — data integrity confirmed!' : 'WARNING: Hash mismatch — data may have been tampered with!'
        });
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Chart data from real CSV dataset
app.get('/chart-data', (req, res) => {
    try {
        const chartData = energyEvents.slice(0, 50).map((ev, idx) => ({
            index: idx,
            time: ev['Date/Time'] || `Row ${idx}`,
            power: parseFloat(ev['LV ActivePower (kW)']) || 0,
            speed: parseFloat(ev['Wind Speed (m/s)']) || 0,
            theoreticalPower: parseFloat(ev['Theoretical_Power_Curve (KWh)']) || 0
        }));
        res.json(chartData);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Chart data for Energy User (based on their owned tokens)
app.get('/user-chart-data', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'user') return res.status(403).json({ error: "Unauthorized" });

        const myTokens = await EnergyToken.find({ 
            owner: { $regex: new RegExp(`^${user.walletAddress}$`, 'i') } 
        }).sort({ createdAt: 1 });

        const chartData = myTokens.map((token, idx) => ({
            index: idx,
            time: new Date(token.timestamp).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            power: parseFloat(token.energyOutput) || 0,
            speed: parseFloat(token.windSpeed) || 0,
            theoreticalPower: parseFloat(token.energyOutput) || 0
        }));

        res.json(chartData);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Latest minted token for Energy Story
app.get('/latest-token', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        let token;
        if (user.role === 'windplant') {
            // Wind Plant sees the latest token minted by the plant (which is any token)
            token = await EnergyToken.findOne().sort({ createdAt: -1 });
        } else {
            token = await EnergyToken.findOne({ 
                owner: { $regex: new RegExp(`^${user.walletAddress}$`, 'i') } 
            }).sort({ createdAt: -1 });
        }
        
        if (!token) return res.status(404).json({ error: "No tokens found" });
        res.json(token);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});

// Get all minted event indices (so frontend can hide already-minted rows)
app.get('/minted-indices', async (req, res) => {
    try {
        const tokens = await EnergyToken.find({}, 'eventIndex');
        const indices = tokens.map(t => t.eventIndex).filter(i => i !== undefined && i !== null);
        res.json(indices);
    } catch (error) {
        console.error('[500 ERROR]', error.message); res.status(500).json({ error: error.message });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Force restart to pick up new CONTRACT_ADDRESS from .env
console.log('Server environment refreshed.');
