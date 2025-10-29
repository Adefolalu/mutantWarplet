import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { MutationComponent } from "./components/MutationComponent";
import type { NFTData } from "./hooks/useMutation";
import { useFarcasterContext } from "./hooks/useFarcasterContext";
import {
  fetchWarpletByTokenId,
  checkWarpletOwnership,
} from "./services/warpletService";

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
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const farcasterContext = useFarcasterContext();
  const [warpletData, setWarpletData] = useState<NFTData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch the user's Warplet based on their FID
  useEffect(() => {
    async function loadWarplet() {
      // Wait for both Farcaster context and wallet connection
      if (!farcasterContext.fid || !address || !isConnected) return;

      setIsLoading(true);
      setError(null);

      try {
        // FID = tokenId for Warplets
        const tokenId = farcasterContext.fid;

        // Check if user owns this Warplet
        const ownsWarplet = await checkWarpletOwnership(address, tokenId);

        if (!ownsWarplet) {
          setError(
            `You don't own Warplet #${tokenId}. Connect the wallet that owns your Warplet NFT.`
          );
          setIsLoading(false);
          return;
        }

        // Fetch the Warplet NFT data
        const warplet = await fetchWarpletByTokenId(tokenId);

        if (!warplet) {
          setError(`Could not load Warplet #${tokenId}. Please try again.`);
          setIsLoading(false);
          return;
        }

        setWarpletData({
          tokenId: warplet.tokenId,
          contractAddress: "0x699727F9E01A822EFdcf7333073f0461e5914b4E",
          name: warplet.name,
          description: warplet.metadata?.description || "",
          image: warplet.image,
          attributes: warplet.metadata?.attributes || [],
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading Warplet:", err);
        setError(err instanceof Error ? err.message : "Failed to load Warplet");
        setIsLoading(false);
      }
    }

    loadWarplet();
  }, [farcasterContext.fid, address, isConnected]);

  // Show loading state
  if (farcasterContext.isLoading || isLoading) {
    return (
      <div className="w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-purple-600">
            Loading your Warplet...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center">
          <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
          <p className="text-xs text-red-500">
            FID: {farcasterContext.fid || "Not detected"}
          </p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt
  if (!isConnected) {
    return (
      <div className="w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-purple-600 font-medium mb-4">
            Connect your wallet to mutate your Warplet
          </p>
          <p className="text-xs text-gray-500">
            Your FID: {farcasterContext.fid || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Render mutation component
  return (
    <div className="w-full">
      {warpletData && <MutationComponent nftData={warpletData} />}
    </div>
  );
}
