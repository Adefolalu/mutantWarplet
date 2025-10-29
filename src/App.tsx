import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { MutationComponent } from "./components/MutationComponent";
import type { NFTData } from "./hooks/useMutation";
import { useFarcasterContext } from "./hooks/useFarcasterContext";
import {
  fetchWarpletByTokenId,
  checkWarpletOwnership,
  fetchUserWarplets,
  type WarpletNFT,
} from "./services/warpletService";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
            🧬 Mutant Warplet
          </h1>
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
  const [ownedWarplets, setOwnedWarplets] = useState<WarpletNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownsWarplet, setOwnsWarplet] = useState<boolean | null>(null);
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
    connectors,
    connect,
    autoConnecting,
  ]);

  useEffect(() => {
    async function loadWarplets() {
      // Wait for Farcaster + wallet
      if (!isConnected || !address) return;
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all owned Warplets
        const list = await fetchUserWarplets(address);
        setOwnedWarplets(list);

        // If we have FID, prefer that token as default selection when owned
        if (farcasterContext.fid) {
          const ownsFid = await checkWarpletOwnership(
            address,
            farcasterContext.fid
          );
          setOwnsWarplet(ownsFid);

          if (ownsFid) {
            const warplet = await fetchWarpletByTokenId(farcasterContext.fid);
            if (warplet) {
              setWarpletData({
                tokenId: warplet.tokenId,
                contractAddress: "0x699727F9E01A822EFdcf7333073f0461e5914b4E",
                name: warplet.name,
                description: warplet.description,
                image: warplet.image,
                attributes: warplet.attributes,
              });
              return;
            }
          }

          // If not owner of FID token, but has other Warplets, default to first owned
          if (list.length > 0) {
            const first = list[0];
            setWarpletData({
              tokenId: first.tokenId,
              contractAddress: "0x699727F9E01A822EFdcf7333073f0461e5914b4E",
              name: first.name,
              description: first.description,
              image: first.image,
              attributes: first.attributes,
            });
          } else {
            setError("No Warplets found for this wallet.");
          }
        } else {
          // No FID available: just pick first owned if any
          if (list.length > 0) {
            const first = list[0];
            setWarpletData({
              tokenId: first.tokenId,
              contractAddress: "0x699727F9E01A822EFdcf7333073f0461e5914b4E",
              name: first.name,
              description: first.description,
              image: first.image,
              attributes: first.attributes,
            });
          } else {
            setError("No Warplets found for this wallet.");
          }
        }
      } catch (err) {
        console.error("Error loading Warplets:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load Warplets"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadWarplets();
  }, [farcasterContext.fid, isConnected, address]);

  // Loading state
  if (farcasterContext.isLoading) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 shadow-lg text-center">
        <div className="animate-pulse">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-xl font-semibold text-gray-800">
            Loading Farcaster context...
          </h3>
        </div>
      </div>
    );
  }

  // No Farcaster context
  if (!farcasterContext.fid) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 shadow-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            Farcaster Context Required
          </h3>
          <p className="text-gray-600 mb-4">
            This Frame must be opened within Farcaster to access your FID.
          </p>
          <p className="text-sm text-gray-500">
            Error: {farcasterContext.error || "No user context found"}
          </p>
        </div>
      </div>
    );
  }

  // Show Farcaster info and wallet connection
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Farcaster User Info */}
      <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              Farcaster User
            </h3>
            <p className="text-gray-600">
              {farcasterContext.username
                ? `@${farcasterContext.username}`
                : "Anonymous"}
            </p>
            <p className="text-sm text-gray-500">FID: {farcasterContext.fid}</p>
            <p className="text-xs text-purple-600 mt-1">
              → Your Warplet Token ID: #{farcasterContext.fid}
            </p>
          </div>
          {!isConnected && (
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">
                Connect wallet to verify ownership
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Connection Status */}
      {!isConnected ? (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Wallet Not Connected
          </h3>
          <p className="text-yellow-700 mb-4">
            Connect your wallet to verify you own Warplet #
            {farcasterContext.fid} and mutate it.
          </p>
          <p className="text-sm text-yellow-600">
            The Frame connector will connect automatically. If not, try
            refreshing.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Info */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">
                  ✅ Wallet Connected
                </h4>
                <p className="text-sm text-green-700 font-mono">{address}</p>
              </div>
              {ownsWarplet === true && (
                <div className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                  Owns Warplet
                </div>
              )}
              {ownsWarplet === false && (
                <div className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">
                  Not Owner
                </div>
              )}
            </div>
          </div>

          {/* Loading Warplet */}
          {isLoading && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
              <div className="animate-pulse">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-blue-800">
                  Loading your Warplet...
                </h3>
                <p className="text-blue-600 mt-2">
                  Fetching Warplet #{farcasterContext.fid}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                ❌ Error
              </h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Owned Warplets Carousel */}
          {ownedWarplets.length > 1 && (
            <div className="bg-white border-2 border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Your Warplets</h4>
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {ownedWarplets.map((w) => (
                  <button
                    key={w.tokenId}
                    onClick={() =>
                      setWarpletData({
                        tokenId: w.tokenId,
                        contractAddress:
                          "0x699727F9E01A822EFdcf7333073f0461e5914b4E",
                        name: w.name,
                        description: w.description,
                        image: w.image,
                        attributes: w.attributes,
                      })
                    }
                    className={`min-w-[140px] border rounded-lg p-2 text-left hover:border-purple-400 ${
                      warpletData?.tokenId === w.tokenId
                        ? "border-purple-500"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={w.image}
                      alt={w.name}
                      className="w-full h-24 object-cover rounded"
                    />
                    <div className="mt-2 text-sm font-medium">{w.name}</div>
                    <div className="text-xs text-gray-500">#{w.tokenId}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Success: Show Warplet and Mutation */}
          {warpletData && !isLoading && ownsWarplet && (
            <MutationComponent
              nftData={warpletData}
              onMutationComplete={(result) => {
                console.log("Mutation completed:", result);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
