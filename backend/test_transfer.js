const axios = require('axios');

async function testTransfer() {
    try {
        console.log("Logging in as test_final@gmail.com...");
        const loginRes = await axios.post('http://localhost:5000/auth/login', {
            email: 'test_final@gmail.com',
            password: 'password123',
            role: 'user'
        });
        const token = loginRes.data.token;
        const sender = loginRes.data.user;
        console.log("Login successful. Wallet:", sender.walletAddress);

        const tokenId = 2;
        const recipientEmail = 'new_recipient@gmail.com'; 

        console.log(`Attempting to transfer Token #${tokenId} to ${recipientEmail}...`);
        try {
            const transferRes = await axios.post('http://localhost:5000/transfer-token-email', {
                tokenId,
                recipientIdentifier: recipientEmail
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Transfer Success!", transferRes.data.message);
            console.log("Tx Hash:", transferRes.data.txHash);
        } catch (err) {
            console.error("Transfer Failed:", err.response?.data || err.message);
        }

    } catch (err) {
        console.error("Test Failed:", err.response?.data || err.message);
    }
}

testTransfer();
