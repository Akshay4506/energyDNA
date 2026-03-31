import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Idempotency check: See if we already have a valid contract address
  const envPath = path.join(__dirname, "../../backend/.env");
  let existingAddress = null;
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/);
    if (match) existingAddress = match[1];
  }

  if (existingAddress) {
    try {
      const code = await hre.ethers.provider.getCode(existingAddress);
      if (code !== "0x") {
        console.log(`Contract already deployed at ${existingAddress}. Skipping deployment.`);
        // Re-create marker just in case
        const markerPath = path.join(__dirname, "../../backend/.deploy-ready");
        fs.writeFileSync(markerPath, "READY");
        return;
      }
    } catch (e) {
      console.log("Existing contract address invalid or node reset. Proceeding with fresh deployment.");
    }
  }

  const EnergyDNA = await hre.ethers.getContractFactory("EnergyDNA");
  const energyDNA = await EnergyDNA.deploy();

  await energyDNA.waitForDeployment();

  const address = await energyDNA.getAddress();
  console.log("EnergyDNA deployed to:", address);

  // Auto-update backend .env
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
    } else {
      envContent += `\nCONTRACT_ADDRESS=${address}`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("Updated backend/.env with new contract address.");
  }

  // Auto-update frontend WalletContext.jsx
  const walletContextPath = path.join(__dirname, "../../frontend/src/WalletContext.jsx");
  if (fs.existsSync(walletContextPath)) {
    let walletContent = fs.readFileSync(walletContextPath, 'utf8');
    walletContent = walletContent.replace(/const CONTRACT_ADDRESS = '.*';/, `const CONTRACT_ADDRESS = '${address}';`);
    fs.writeFileSync(walletContextPath, walletContent);
    console.log("Updated frontend WalletContext.jsx with new contract address.");
  }

  // Create a marker file for the backend to know we are ready
  const markerPath = path.join(__dirname, "../../backend/.deploy-ready");
  fs.writeFileSync(markerPath, "READY");
  console.log("Created .deploy-ready marker for backend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
