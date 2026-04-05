const { ethers } = require('ethers');
const EnergyToken = require('./models/EnergyToken');

/**
 * 🔄 Persistent Blockchain Synchronizer
 * Reconciles the MongoDB database with the current state of the blockchain.
 * This version is NON-DESTRUCTIVE: it preserves the DB's history but logs discrepancies.
 */
async function reconcileBlockchainWithDB() {
    console.log('\x1b[36m%s\x1b[0m', '[SYNC] Running persistence check...');
    
    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
        
        // Connectivity check
        try {
            await provider.getNetwork();
        } catch (e) {
            console.warn('\x1b[33m%s\x1b[0m', '[SYNC] Blockchain node not reachable, skipping persistence check.');
            return;
        }

        const contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            ["function ownerOf(uint256) view returns (address)"],
            provider
        );

        const tokensInDb = await EnergyToken.find({});
        if (tokensInDb.length === 0) {
            console.log('\x1b[32m%s\x1b[0m', '[SYNC] No tokens in DB to sync.');
            return;
        }

        let discordanceCount = 0;
        for (const token of tokensInDb) {
            try {
                // Verify on-chain presence
                await contract.ownerOf(token.tokenId);
            } catch (err) {
                // If ownerOf reverts, it's a stale record compared to the blockchain
                // We LOG it, but we NO LONGER delete it.
                if (err.message.includes('invalid token ID') || err.code === 'CALL_EXCEPTION') {
                    console.warn('\x1b[33m%s\x1b[0m', `[SYNC] ALERT: Token #${token.tokenId} exists in DB but is NOT ON-CHAIN (History preserved).`);
                    discordanceCount++;
                }
            }
        }

        if (discordanceCount > 0) {
            console.log('\x1b[35m%s\x1b[0m', `[SYNC] Comparison complete: ${discordanceCount} tokens are historical-only.`);
        } else {
            console.log('\x1b[32m%s\x1b[0m', '[SYNC] Perfect Parity: DB and Blockchain match.');
        }

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '[SYNC ERROR] Sync check failed:', error.message);
    }
}

module.exports = { reconcileBlockchainWithDB };
