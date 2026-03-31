# ⚙️ EnergyDNA - Backend Service

This service powers the **EnergyDNA** platform, handling data parsing, secure authentication, blockchain metadata preparation, and persistent state management.

---

## 🛠️ Technology Stack
- **Node.js**: [v16.14.0+](https://nodejs.org/)
- **Express.js**: [v4.18.2](https://expressjs.com/)
- **MongoDB**: [Mongoose ORM](https://mongoosejs.com/)
- **Ethers.js**: [v6.0](https://docs.ethers.io/)
- **CSV-Parser**: For efficient turbine data ingestion.

---

## 🔐 Environment Variables
Create a `.env` file in the `backend/` directory with the following variables:

| Variable | Description |
| :--- | :--- |
| `PORT` | The port the backend listens on (Default: 5000). |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Secret key for signing authentication tokens. |
| `CONTRACT_ADDRESS` | The deployed address of the `EnergyDNA.sol` smart contract. |
| `PRIVATE_KEY` | The private key for the account that deployed the contract (used for platform signatures). |
| `RPC_URL` | The RPC endpoint for the local Hardhat node or Ethereum network. |

---

## 🛤️ API Endpoints

### 🔐 Authentication
- `POST /auth/signup`: Create a new user (Wind Plant or Energy User). Generates an associated Ethereum wallet.
- `POST /auth/login`: Authenticate and receive a JWT.
- `GET /auth/me`: Retrieve the current user's profile and wallet address.

### ⚡ Energy & Minting
- `GET /dataset-events`: Fetch the most recent 100 available energy generation events from the turbine CSV.
- `POST /prepare-mint`: Calculates the EnergyDNA Hash and retrieves metadata for a specific turbine event.
- `POST /save-minted-token`: Finalizes the tokenization process in MongoDB after successful blockchain confirmation.

### 📦 Token Management
- `GET /my-tokens`: Retrieve all tokens owned by the authenticated wallet.
- `GET /token/:tokenId`: Fetch detailed metadata and history for a specific token.
- `POST /transfer-token`: Transfer a token from one user to another (includes custodial signatures).

---

## 🔄 Core Logic: Persistence & Sync
The backend implements a **Dual-Sync** strategy:
1.  **CSV ➔ DB**: Initial turbine generation data is parsed from `T1.csv` and served as the source for new tokens.
2.  **Blockchain ➔ DB**: To handle data loss or environment resets, the backend can synchronize with the smart contract logs to rebuild the `EnergyToken` collection.
3.  **Persistent Sequencing**: Instead of relying on volatile blockchain counters, Token IDs are sequenced based on the maximum ID present in MongoDB at the time of minting.

---

**Developed with Node.js and MongoDB.**
