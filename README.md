# ⚡ EnergyDNA: Blockchain-Powered Wind Energy Tokenization

**EnergyDNA** is a decentralized platform that converts raw wind turbine generation data into cryptographic NFT tokens (ERC-721). By tokenizing energy at the source, we provide an immutable, transparent, and verifiable audit trail for renewable energy production, certificate management, and carbon offset tracking.

---

## 🌟 Key Features

### 🔍 Advanced Energy Matchmaker
An intelligent search system that helps Wind Plant operators find the best generation events to fulfill specific energy (kW) orders.
- **Single Match**: Finds the closest or exact single turbine generation event.
- **Bundle Recommendation**: Uses a greedy optimization algorithm to find a combination of smaller events that perfectly total a target power requirement.
- **Boundary Logic**: Automatically handles extremes by suggesting the highest or lowest available outputs.

### ⛓️ Blockchain Minting
- **ERC-721 Integration**: Each token is a unique NFT representing a specific generation event (Power Output, Wind Speed, Timestamp).
- **Persistent ID Sequencing**: Intelligent Token ID management that synchronizes MongoDB state with the Ethereum blockchain.
- **MetaMask Support**: Full integration for secure, user-signed transactions.

### 🛡️ Immutable Auditing & Explorer
- **SHA-256 Hashing**: Each token contains a unique "EnergyDNA Hash" derived from turbine metadata.
- **Token Explorer**: A dedicated interface to trace the origin, ownership history, and retirement status of any energy token.
- **Consumption Pipeline**: Energy users can "retire" (consume) tokens to claim carbon credits, marking them permanently on the blockchain.

---

## 🏗️ Technical Stack

- **Frontend**: [React.js](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [MongoDB](https://www.mongodb.com/)
- **Blockchain**: [Solidity](https://soliditylang.org/), [Hardhat](https://hardhat.org/), [Ethers.js](https://docs.ethers.io/)
- **Wallet**: [MetaMask](https://metamask.io/)

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local or Atlas)
- [MetaMask](https://metamask.io/) Browser Extension

### 2. Installation
Clone the repository and install dependencies for all modules:

```bash
# Clone the repository
git clone https://github.com/yourusername/EnergyDNA.git
cd EnergyDNA

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install

# Install Contracts dependencies
cd ../contracts
npm install
```

### 3. Environment Setup
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/energyDNA-wind
JWT_SECRET=your_super_secret_key
CONTRACT_ADDRESS=0x... (from deployment)
PRIVATE_KEY=your_platform_owner_private_key
RPC_URL=http://127.0.0.1:8545
```

### 4. Running the Application

1. **Start Local Blockchain (Hardhat):**
   ```bash
   cd contracts
   npx hardhat node
   ```

2. **Deploy Smart Contracts:**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Start Backend Server:**
   ```bash
   cd ../backend
   npm start
   ```

4. **Start Frontend Development Server:**
   ```bash
   cd ../frontend
   npm run dev
   ```

---

## 📂 Project Structure

```text
EnergyDNA/
├── backend/        # Express API & MongoDB Models
├── contracts/      # Solidity Smart Contracts & Hardhat Config
├── dataset/        # Raw Turbine Generation Data (CSV)
├── frontend/       # React (Vite) Application
└── scripts/        # Management & Maintenance Scripts
```

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with 💚 for the Future of Renewable Energy.**
