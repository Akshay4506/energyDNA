const mongoose = require('mongoose');
const EnergyToken = require('./models/EnergyToken');
const { ethers } = require('ethers');

const abi = require('../contracts/artifacts/contracts/EnergyDNA.sol/EnergyDNA.json').abi;

async function sync() {
    try {
        await mongoose.connect('mongodb://localhost:27017/energyDNA-wind');
        console.log('Connected to DB');

        const tokens = await EnergyToken.find({ state: { $ne: 'Retired' } });
        console.log(`Found ${tokens.length} tokens to sync.`);

        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
        const contract = new ethers.Contract('0x5fbdb2315678afecb367f032d93f642f64180aa3', abi, wallet);

        for (const t of tokens) {
            try {
                // Ensure we are minting to the correct blockchain address (the current DB owner)
                console.log(`Syncing Token #${t.tokenId} - Owner: ${t.owner}`);
                const ts = Math.floor(new Date(t.timestamp).getTime() / 1000);
                const tx = await contract.mintEnergyToken(
                    t.owner, 
                    t.turbineId, 
                    t.originalIndex, 
                    ts, 
                    Math.floor(t.powerW), 
                    t.auditHash || "sync_hash"
                );
                await tx.wait();
                console.log(`Successfully minted Token #${t.tokenId}`);
            } catch (e) {
                console.error(`Failed to mint Token #${t.tokenId}: ${e.message}`);
            }
        }
    } catch (err) {
        console.error('Final sync error:', err);
    } finally {
        mongoose.connection.close();
    }
}

sync();
