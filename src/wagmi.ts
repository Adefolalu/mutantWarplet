import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
import { base, mainnet, sepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "@wagmi/connectors";

// Get WalletConnect project ID from environment (optional)
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo-project-id";

export const config = createConfig({
  chains: [base, mainnet, sepolia],
  connectors: [
    injected(), // MetaMask, Rainbow, Coinbase Wallet browser extensions
    farcasterFrame(), // Farcaster Frame connector
    walletConnect({ projectId }), // WalletConnect
    coinbaseWallet({ appName: "Mutant Warplet" }), // Coinbase Wallet
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
