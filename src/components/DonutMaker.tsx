import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { DonutService } from "../services/donutService";
import { useFarcasterContext } from "../hooks/useFarcasterContext";
import { blobFromUrl, uploadImageBlob, uploadMetadata } from "../services/ipfs";
import { mintMutant } from "../services/mintService";
import { getUserByFid } from "../services/neynar";

export function DonutMaker() {
  const { address } = useAccount();
  const farcasterContext = useFarcasterContext();
  const [status, setStatus] = useState<
    "idle" | "generating" | "ready" | "minting" | "success" | "error"
  >("idle");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintData, setMintData] = useState<{
    hash: string;
    tokenId?: bigint;
  } | null>(null);
  const [manualFid, setManualFid] = useState("");
  const [resolvedUsername, setResolvedUsername] = useState("");
  const [apiKey, setApiKey] = useState("");

  const donutService = useMemo(() => new DonutService(apiKey), [apiKey]);

  const activeFid =
    farcasterContext.fid || (manualFid ? parseInt(manualFid) : null);

  const displayUsername =
    resolvedUsername ||
    farcasterContext.username ||
    (activeFid ? `FID: ${activeFid}` : null);

  const handleGenerate = async () => {
    if (!activeFid) {
      setError("Please sign in with Farcaster or enter a valid FID.");
      return;
    }

    setStatus("generating");
    setError(null);

    try {
      let pfpUrl = farcasterContext.pfpUrl;
      let displayName = farcasterContext.displayName;
      let username = farcasterContext.username;

      // If using manual FID and we don't have context (or context doesn't match), fetch from Neynar
      if (!farcasterContext.fid && manualFid) {
        const user = await getUserByFid(parseInt(manualFid));
        if (user) {
          pfpUrl = user.pfp_url;
          displayName = user.display_name;
          username = user.username;
        }
      }

      if (!username) {
        // Fallback if we have FID but couldn't fetch username (shouldn't happen often if API works)
        username = `User ${activeFid}`;
      }

      setResolvedUsername(username);

      if (pfpUrl) {
        console.log("🎨 Using PFP for color analysis:", pfpUrl);
      } else {
        console.log("⚠️ No PFP found, using default colors.");
      }

      const result = await donutService.generateDonut(
        {
          username: username,
          displayName: displayName || undefined,
          pfpUrl: pfpUrl || undefined,
        },
        "/base.webp"
      );

      setGeneratedImage(result.imageUrl);
      setStatus("ready");
    } catch (e: any) {
      console.error("Generation failed:", e);
      const errorMessage = e.message || "";
      if (errorMessage.includes("403") || errorMessage.includes("API Key")) {
        setError(
          "API Key missing or invalid. Please enter a valid Gemini API Key."
        );
      } else if (
        errorMessage.includes("503") ||
        errorMessage.includes("overloaded")
      ) {
        setError(
          "AI service is currently overloaded. Please try again in a moment."
        );
      } else {
        setError("Failed to generate donut. Please try again.");
      }
      setStatus("error");
    }
  };

  const handleMint = async () => {
    if (!generatedImage || !address) return;

    setStatus("minting");
    try {
      // 1. Upload image to IPFS
      const imageBlob = await blobFromUrl(generatedImage);
      const imageUri = await uploadImageBlob(imageBlob, "donut.png");

      // 2. Upload metadata
      const metadataUri = await uploadMetadata({
        name: `${resolvedUsername}'s Donut`,
        description: `A custom donut generated for ${resolvedUsername}`,
        image: imageUri,
        attributes: [
          { trait_type: "Type", value: "Donut PFP" },
          {
            trait_type: "Owner",
            value: resolvedUsername || "Unknown",
          },
        ],
      });

      // 3. Mint
      // Using zero address/id as origin since this is a fresh mint
      // Note: This assumes the contract allows minting with 0x0 origin.
      // If not, we might need to adjust this strategy.
      const result = await mintMutant({
        originContract: "0x0000000000000000000000000000000000000000",
        originTokenId: 0n,
        metadataURI: metadataUri,
      });

      setMintData(result);
      setStatus("success");
    } catch (e: any) {
      console.error("Minting failed:", e);
      setError("Minting failed. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/20">
      <div className="aspect-square w-full rounded-2xl overflow-hidden bg-secondary-bg mb-6 relative shadow-inner">
        {status === "idle" && (
          <img
            src="/base.webp"
            alt="Base Donut"
            className="w-full h-full object-cover"
          />
        )}
        {status === "generating" && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-secondary-bg animate-pulse">
            <div className="text-4xl mb-4">🍩</div>
            <p className="text-foreground/70 font-medium">
              Baking your donut...
            </p>
          </div>
        )}
        {(status === "ready" || status === "minting" || status === "success") &&
          generatedImage && (
            <img
              src={generatedImage}
              alt="Generated Donut"
              className="w-full h-full object-cover"
            />
          )}
        {status === "error" && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500 p-4 text-center">
            <p className="mb-2">{error}</p>
            {error?.includes("API Key") && (
              <input
                type="password"
                placeholder="Enter Gemini API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 mb-2 rounded-lg border border-red-200 text-sm"
              />
            )}
            <button
              onClick={() => setStatus("idle")}
              className="mt-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {status === "idle" && (
          <div className="space-y-3">
            {!farcasterContext.fid && (
              <input
                type="number"
                placeholder="Enter Farcaster FID"
                value={manualFid}
                onChange={(e) => setManualFid(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-foreground/20 text-foreground placeholder:text-foreground/50"
              />
            )}
            <button
              onClick={handleGenerate}
              disabled={!activeFid}
              className="w-full py-4 bg-foreground text-background rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeFid ? "Bake My Donut" : "Enter FID to Bake"}
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="flex gap-3">
            <button
              onClick={() => setStatus("idle")}
              className="flex-1 py-3 bg-white/50 text-foreground rounded-xl font-bold hover:bg-white/70 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleMint}
              className="flex-[2] py-3 bg-foreground text-background rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Mint Donut
            </button>
          </div>
        )}

        {status === "minting" && (
          <button
            disabled
            className="w-full py-3 bg-foreground/80 text-background rounded-xl font-bold cursor-wait"
          >
            Minting...
          </button>
        )}

        {status === "success" && mintData && (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-100 text-green-800 rounded-xl">
              <p className="font-bold">Donut Minted Successfully!</p>
              {mintData.tokenId !== undefined && (
                <p className="text-sm">
                  Token ID: {mintData.tokenId.toString()}
                </p>
              )}
            </div>
            <a
              href={`https://basescan.org/tx/${mintData.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-white text-foreground border-2 border-foreground rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              View on Explorer
            </a>
            <button
              onClick={() => {
                setStatus("idle");
                setGeneratedImage(null);
                setMintData(null);
              }}
              className="block w-full py-3 text-foreground/60 font-medium hover:text-foreground"
            >
              Bake Another
            </button>
          </div>
        )}
      </div>

      {displayUsername && (
        <div className="mt-4 text-center">
          <p className="text-xs text-foreground/50">
            Baking for @{displayUsername}
          </p>
        </div>
      )}
    </div>
  );
}
