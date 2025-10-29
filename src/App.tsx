import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { MutationComponent } from "./components/MutationComponent";
import type { NFTData } from "./hooks/useMutation";
import { useFarcasterContext } from "./hooks/useFarcasterContext";
// Removed Alchemy dependency for local test flow

export default function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto py-6 px-4 max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 mb-1 tracking-tight">
            🧬 Mutant Warplet
          </h1>
          <p className="text-xs text-purple-400 font-medium">
            Evolve • Mutate • Mint
          </p>
        </header>
        <WarpletMutator />
      </div>
    </div>
  );
}

function WarpletMutator() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const farcasterContext = useFarcasterContext();
  const [warpletData, setWarpletData] = useState<NFTData | null>(null);
  // No remote loading in test mode
  // minimal UI: no error surface
  // Local test inputs for origin and metadata
  const [testTokenId] = useState<string>("123");
  const [testName] = useState<string>("Test Warplet");
  const [testDesc] = useState<string>("Local test image");
  const [autoConnecting, setAutoConnecting] = useState(false);

  // Auto-connect Farcaster wallet if in miniapp
  useEffect(() => {
    async function autoConnectFarcaster() {
      if (farcasterContext.isSDKLoaded && !isConnected && !autoConnecting) {
        setAutoConnecting(true);
        try {
          // Find the Farcaster connector
          const farcasterConnector = connectors.find(
            (connector) => connector.id === "farcasterFrame"
          );

          if (farcasterConnector) {
            console.log("Auto-connecting Farcaster wallet...");
            await connect({ connector: farcasterConnector });
          }
        } catch (error) {
          console.error("Auto-connect failed:", error);
        } finally {
          setAutoConnecting(false);
        }
      }
    }

    autoConnectFarcaster();
  }, [
    farcasterContext.isSDKLoaded,
    isConnected,
    autoConnecting,
    connectors,
    connect,
  ]);

  // Seed local test NFT data once connected
  useEffect(() => {
    // Seed a test NFTData using the static image (no extra UI)
    const imagePath = "/.well-known/download.jpeg";
    setWarpletData({
      tokenId: testTokenId,
      contractAddress: "0x699727F9E01A822EFdcf7333073f0461e5914b4E",
      name: testName,
      description: testDesc,
      image: imagePath,
      attributes: [],
    });
  }, [testTokenId, testName, testDesc]);

  // Minimal UI: only image and mint button are rendered by MutationComponent
  return (
    <div className="w-full">
      {warpletData && <MutationComponent nftData={warpletData} />}
    </div>
  );
}
