# 🖼️ EnergyDNA - Frontend (React.js)

This is the interactive frontend for the **EnergyDNA** platform. It provides a sleek, modern, and highly interactive interface for Wind Plant operators and Energy Users.

---

## 🚀 Built With
- **React.js**: [v18.2.0](https://reactjs.org/)
- **Vite**: [v5.0](https://vitejs.dev/) - Lightning-fast frontend tooling.
- **Tailwind CSS**: [v3.4](https://tailwindcss.com/) - Utility-first styling.
- **Lucide-React**: [v0.344.0](https://lucide.dev/) - Modern icons.
- **Axios**: For API communication.
- **Ethers.js**: For direct blockchain/MetaMask interaction.

---

## 🎨 UI & UX Features
- **Dark-First Modern Aesthetic**: A custom, premium theme using teal and emerald gradients tailored for the renewable energy sector.
- **Real-Time Data Streams**: Live visualization of turbine metrics directly from the T1 Dataset.
- **Advanced Energy Matchmaker**: An interactive search system with:
    - Best-fit generation matching.
    - Greedy-optimized bundle recommendations.
    - Transparent, high-fidelity custom scrollbars.
- **Blockchain Feedback**: Real-time status updates (Wait for Confirmation, MetaMask Prompts, Tx Hashes).
- **Responsive Layouts**: Fully adaptive design for desktop and mobile monitoring.

---

## 🏗️ Project Structure
```text
src/
├── components/     # Reusable UI components (Navbar, Stats Cards, etc.)
├── pages/          # Full-page views (Dashboard, Mint Energy, Explorer)
├── WalletContext.js # MetaMask state and Ethers.js integration
├── AuthContext.js   # JWT-based user session management
└── index.css       # Global Tailwind overrides & custom animations
```

---

## 🚦 Core Pages
1.  **Dashboard**: High-level overview of system stats, recent transactions, and total tokenized power.
2.  **Mint Energy**: The primary interface for Wind Plant operators to convert generation data into NFTs using the **Matchmaker**.
3.  **Token Explorer**: A searchable database of every energy token on the blockchain, including its full audit trail and EnergyDNA hash.
4.  **Trace Energy**: A visual timeline showing the "Story of Energy" for any individual token ID.

---

## 🛠️ Running Locally
1. Ensure the backend is running at `http://localhost:5000`.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run dev`.
4. Open `http://localhost:5173` in your browser.

---

**Built with React and ⚡ Vite.**
