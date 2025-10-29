import { useEffect, useMemo, useState } from "react";
import type { NFTData } from "../hooks/useMutation";
import { blobFromUrl, uploadImageBlob, uploadMetadata } from "../services/ipfs";
import { mintMutant } from "../services/mintService";
import { ImageGenerationService } from "../services/imageGeneration";
import { useReadContract } from "wagmi";
import { mutantWarplet } from "../constants/Abi";
import { formatEther } from "viem";

interface MutationComponentProps {
  nftData?: NFTData;
}

export function MutationComponent({ nftData }: MutationComponentProps) {
  // Single mutation state
  type MutationStatus = "pending" | "generating" | "ready" | "error";
  type MutationResult = {
    mutatedImageUrl: string;
    imageGenerationService: "gemini";
  };

  const [status, setStatus] = useState<MutationStatus>("pending");
  const [result, setResult] = useState<MutationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imageService = useMemo(() => new ImageGenerationService(), []);

  // Read the mutation fee from the contract
  const { data: mutationFee } = useReadContract({
    address: mutantWarplet.address as `0x${string}`,
    abi: mutantWarplet.abi,
    functionName: "mutationFee",
  }) as { data: bigint | undefined };

  useEffect(() => {
    if (!nftData?.image) return;

    let cancelled = false;

    async function generateMutation() {
      setStatus("generating");
      setError(null);

      try {
        const img = await imageService.generateMutatedImage({
          prompt: "cyberpunk mutant",
          imageUrl: nftData!.image,
          strength: 0.75,
          negativePrompt: "",
        });

        if (cancelled) return;

        setResult({
          mutatedImageUrl: img.imageUrl,
          imageGenerationService: img.service,
        });
        setStatus("ready");
      } catch (e: any) {
        if (cancelled) return;
        console.error("Mutation generation failed:", e);
        setError(e?.message || "Failed to generate mutation");
        setStatus("error");
      }
    }

    generateMutation();
    return () => {
      cancelled = true;
    };
  }, [nftData?.tokenId, imageService]);

  if (!nftData) return null;

  const handleRemutate = async () => {
    setStatus("generating");
    setError(null);
    setResult(null);

    try {
      const img = await imageService.generateMutatedImage({
        prompt: "cyberpunk mutant",
        imageUrl: nftData.image,
        strength: 0.75,
        negativePrompt: "",
      });

      setResult({
        mutatedImageUrl: img.imageUrl,
        imageGenerationService: img.service,
      });
      setStatus("ready");
    } catch (e: any) {
      console.error("Re-mutation failed:", e);
      setError(e?.message || "Failed to generate mutation");
      setStatus("error");
    }
  };

  const handleProceedToMint = async () => {
    try {
      if (!result || status !== "ready") return;

      // 1) Prepare image blob (handles data URLs and http URLs)
      const imageBlob = await blobFromUrl(result.mutatedImageUrl);
      // 2) Upload image to IPFS
      const imageUri = await uploadImageBlob(imageBlob);
      // 3) Build metadata
      const name = `Mutated ${nftData.name}`;
      const description = `Cyberpunk mutant version of ${nftData.name}`;
      const attributes = [
        ...(nftData.attributes || []),
        {
          trait_type: "Mutation Type",
          value: "Cyberpunk",
        },
      ];
      const metadataUri = await uploadMetadata({
        name,
        description,
        image: imageUri,
        attributes,
        properties: {
          origin: {
            contract: nftData.contractAddress,
            tokenId: nftData.tokenId,
          },
        },
      });

      // 4) Mint on Base
      const originTokenId = BigInt(nftData.tokenId);
      const { hash, tokenId } = await mintMutant({
        originContract: nftData.contractAddress as `0x${string}`,
        originTokenId,
        metadataURI: metadataUri,
      });

      alert(
        `Minted! Tx: ${hash}\nNew Token ID: ${tokenId !== undefined ? tokenId.toString() : "unknown"}`
      );
    } catch (err: any) {
      console.error("Mint flow failed:", err);
      alert(err?.message || "Mint failed");
    }
  };

  return (
    <div className="relative">
      {/* Elite precision card with #2596be theme and dark background */}
      <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-[#1a5f7a]/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(37,150,190,0.25)] overflow-hidden border border-[#2596be]/30">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#2596be] to-transparent"></div>

        {/* Image container with fixed aspect ratio */}
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          <div className="absolute inset-0 flex items-center justify-center p-8">
            {status !== "ready" || !result ? (
              <div className="w-full h-full bg-gradient-to-br from-slate-700/50 via-slate-800/50 to-[#1a5f7a]/50 rounded-2xl flex items-center justify-center border border-[#2596be]/20 backdrop-blur-sm">
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 border-[3px] border-[#2596be]/30 rounded-full absolute"></div>
                    <div className="w-16 h-16 border-[3px] border-[#2596be] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-sm font-semibold text-[#2596be] tracking-wide">
                    {status === "error" ? "MUTATION FAILED" : "MUTATING..."}
                  </p>
                  {error && (
                    <p className="text-xs text-red-400 mt-2 font-medium">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full group">
                <img
                  src={result.mutatedImageUrl}
                  alt="Mutated NFT"
                  className="w-full h-full object-cover rounded-2xl shadow-[0_8px_24px_rgba(37,150,190,0.2)] ring-1 ring-[#2596be]/20"
                />
                {/* Elegant hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2596be]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 space-y-2">
          {/* Re-mutate button - only show when ready */}
          {status === "ready" && (
            <button
              onClick={handleRemutate}
              className="w-full py-2.5 rounded-xl font-medium text-xs tracking-wide text-[#2596be] bg-slate-700/50 hover:bg-slate-700 border border-[#2596be]/30 hover:border-[#2596be]/50 shadow-[0_2px_12px_rgba(37,150,190,0.15)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            >
              🔄 RE-MUTATE
            </button>
          )}

          {/* Mint button with elite styling */}
          <button
            disabled={status !== "ready"}
            onClick={handleProceedToMint}
            className={`w-full py-3 rounded-xl font-semibold text-sm tracking-wide text-white shadow-[0_4px_16px_rgba(37,150,190,0.25)] transition-all duration-300 relative overflow-hidden group ${
              status === "ready"
                ? "bg-[#2596be] hover:bg-[#1d7a9f] hover:shadow-[0_6px_24px_rgba(37,150,190,0.4)] hover:scale-[1.01] active:scale-[0.99]"
                : "bg-gray-300 cursor-not-allowed opacity-60"
            }`}
          >
            {/* Shimmer effect on hover */}
            {status === "ready" && (
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            )}

            {status === "ready" ? (
              <span className="flex flex-col items-center justify-center gap-1 relative z-10">
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  MINT MUTANT
                </span>
                <span className="text-[10px] font-medium opacity-90 tracking-wide">
                  {mutationFee ? formatEther(mutationFee) : "0.00037"} ETH + GAS
                </span>
              </span>
            ) : (
              <span className="uppercase tracking-wider text-xs">
                Mutating...
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
