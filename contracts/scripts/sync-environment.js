import { ethers } from "hardhat";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env for DB reach
dotenv.config({ path: path.join(__dirname, "../../backend/.env") });

async function main() {
  console.log("--- STARTING ENVIRONMENT SYNC (ESM) ---");
  
  // 1. Deploy Contract
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with address:", deployer.address);
  
  const EnergyDNA = await ethers.getContractFactory("EnergyDNA");
  const contract = await EnergyDNA.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("EnergyDNA deployed to:", contractAddress);

  // 2. Mint Tokens
  const now = Date.now();
  console.log("Minting Token 0 (Platform)...");
  const tx0 = await contract.mintEnergyToken(deployer.address, "T1", now, "5.0", "N", "100", "h0", "u0");
  await tx0.wait();
  console.log("Minted Token 0.");

  // Find Adani in DB
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/energyDNA-wind");
  
  // Define inline models to avoid module complexity
  const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ email: String, walletAddress: String }));
  const adani = await User.findOne({ email: "adani@gmail.com" });
  
  if (adani) {
    console.log("Minting Token 1 for Adani:", adani.email);
    const tx1 = await contract.mintEnergyToken(deployer.address, "T1", now + 1000, "5.67", "NE", "120", "final_h1", "u1");
    await tx1.wait();
    
    console.log("Transferring Token 1 to Adani...");
    const tx2 = await contract.transferEnergyToken(deployer.address, adani.walletAddress, 1);
    const receipt2 = await tx2.wait();
    
    // Update DB
    const EnergyToken = mongoose.models.EnergyToken || mongoose.model("EnergyToken", new mongoose.Schema({ 
        tokenId: Number, energyDnaHash: String, turbineId: String, timestamp: String, 
        energyOutput: String, windSpeed: String, windDirection: String, owner: String, 
        ownerUserId: mongoose.Schema.Types.ObjectId, state: String, history: Array 
    }));
    
    await EnergyToken.deleteMany({ tokenId: 1 });
    await new EnergyToken({
        tokenId: 1,
        energyDnaHash: "final_h1",
        turbineId: "T1",
        timestamp: (now + 1000).toString(),
        energyOutput: "120",
        windSpeed: "5.67",
        windDirection: "NE",
        owner: adani.walletAddress.toLowerCase(),
        ownerUserId: adani._id,
        state: "Transferred",
        history: [
            { action: "Minted", from: "0x0000000000000000000000000000000000000000", to: deployer.address, txHash: tx1.hash },
            { action: "Transferred", from: deployer.address, to: adani.walletAddress.toLowerCase(), txHash: receipt2.hash }
        ]
    }).save();
    console.log("Token 1 Synced to Adani in DB.");
  } else {
    console.log("Adani user not found in DB. Skipping Token 1.");
  }

  console.log("--- SYNC COMPLETE ---");
  process.exit(0);
}

main().catch((error) => {
  console.error("SYNC_FATAL:", error);
  process.exit(1);
});
