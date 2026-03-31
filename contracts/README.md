# 📜 EnergyDNA - Smart Contracts (Solidity)

The core logic of the **EnergyDNA** ecosystem is governed by these smart contracts, ensuring the immutable tokenization of renewable energy production.

---

## 🛠️ Technology Stack
- **Solidity**: [v0.8.24](https://soliditylang.org/) - Ethereum's smart contract language.
- **Hardhat**: [v2.22](https://hardhat.org/) - Ethereum development environment.
- **OpenZeppelin**: [v4.x](https://openzeppelin.com/) - Industry-standard library for ERC-721 security.
- **Ethers.js**: [v6.0](https://docs.ethers.io/) - Client-side blockchain interaction.

---

## 💎 Features
- **ERC-721 Interface**: Full compatibility with the NFT standard.
- **EnergyDNA Hash Persistence**: Each token ID is permanently linked to its unique SHA-256 energy DNA hash.
- **Retirement Mechanism**: Built-in support to "retire" (consume) tokens, preventing double-claiming of carbon offsets.
- **Custom Events**: Emits specialized events (`EnergyTokenMinted`, `EnergyTokenRetired`) for easy indexing and auditing.

---

## 🚦 Hardhat Commands

### 1. Start Local Blockchain
```bash
npx hardhat node
```

### 2. Compile Contracts
```bash
npx hardhat compile
```

### 3. Deploy to Local Network
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Run Tests
```bash
npx hardhat test
```

---

## 🏗️ Project Structure
```text
contracts/
├── contracts/      # Solidity Source Code (.sol)
├── scripts/        # Deployment & Maintenance Scripts
├── test/           # Mocha/Chai Unit Tests
└── hardhat.config.js # Hardhat Configuration
```

---

## 🧱 The `EnergyDNA.sol` Contract
The primary contract inherits from:
- `ERC721`: Base NFT functionality.
- `ERC721Enumerable`: Enables efficient tracking of all platform tokens.
- `Ownable`: Securely manages platform-level permissions.

---

**Built with Solidity and 🛡️ Hardhat.**
