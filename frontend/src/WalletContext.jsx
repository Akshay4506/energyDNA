import React, { createContext, useState, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

// Contract ABI — only the functions we need
const CONTRACT_ABI = [
  "function mintEnergyToken(address to, uint256 tokenId, string turbineId, uint256 timestamp, string windSpeed, string windDirection, string energyOutput, string energyDnaHash, string tokenURI) public returns (uint256)",
  "function transferEnergyToken(address from, address to, uint256 tokenId) public",
  "function retireEnergyToken(uint256 tokenId) public",
  "function getEnergyMetadata(uint256 tokenId) public view returns (string, uint256, string, string, string, string, uint8)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "event EnergyTokenMinted(uint256 indexed tokenId, string energyDnaHash, address owner)",
  "event EnergyTokenTransferred(uint256 indexed tokenId, address from, address to)",
  "event EnergyTokenRetired(uint256 indexed tokenId, address owner)"
];

// Default to Hardhat localhost contract address
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [chainId, setChainId] = useState(null);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const userSigner = await browserProvider.getSigner();
        const network = await browserProvider.getNetwork();
        
        const energyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, userSigner);

        setAccount(accounts[0]);
        setSigner(userSigner);
        setProvider(browserProvider);
        setContract(energyContract);
        setChainId(Number(network.chainId));

        window.ethereum.on('accountsChanged', async (newAccounts) => {
          if (newAccounts.length > 0) {
            setAccount(newAccounts[0]);
            const newSigner = await browserProvider.getSigner();
            setSigner(newSigner);
            setContract(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner));
          } else {
            setAccount('');
            setSigner(null);
            setContract(null);
          }
        });

        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });

      } catch (err) {
        console.error('MetaMask connection failed:', err);
      }
    } else {
      toast.error("MetaMask is not installed. Please install it to use this DApp.");
    }
  }, []);

  return (
    <WalletContext.Provider value={{ account, signer, provider, contract, chainId, connectWallet, CONTRACT_ADDRESS }}>
      {children}
    </WalletContext.Provider>
  );
};
