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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a5f7a]">
      <div className="container mx-auto py-6 px-4 max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#2596be] mb-1 tracking-tight drop-shadow-[0_2px_8px_rgba(37,150,190,0.3)]">
            Mutant Warplet
          </h1>
          <p className="text-[10px] text-[#2596be]/80 font-semibold tracking-widest uppercase">
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
        <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-[#1a5f7a]/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(37,150,190,0.25)] p-10 text-center border border-[#2596be]/30">
          <div className="relative inline-block mb-4">
            <div className="w-14 h-14 border-[3px] border-[#2596be]/30 rounded-full absolute"></div>
            <div className="w-14 h-14 border-[3px] border-[#2596be] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-semibold text-[#2596be] tracking-wide">
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
        <div className="bg-gradient-to-br from-red-900/80 to-red-800/70 border-2 border-red-500/50 rounded-3xl p-8 text-center shadow-[0_8px_24px_rgba(239,68,68,0.3)]">
          <p className="text-red-300 font-semibold mb-2">⚠️ {error}</p>
          <p className="text-xs text-red-400 font-medium">
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
        <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-[#1a5f7a]/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(37,150,190,0.25)] p-10 text-center border border-[#2596be]/30">
          <p className="text-[#2596be] font-semibold mb-4 text-base">
            Connect your wallet to mutate your Warplet
          </p>
          <p className="text-xs text-[#2596be]/70 font-medium">
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
