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
      {/* Mobile-optimized card with glassmorphism effect */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
        {/* Image container with fixed aspect ratio */}
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          <div className="absolute inset-0 flex items-center justify-center p-6">
            {status !== "ready" || !result ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl animate-pulse flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-medium text-purple-600">
                    {status === "error" ? "Mutation failed" : "Mutating..."}
                  </p>
                  {error && (
                    <p className="text-xs text-red-500 mt-2">{error}</p>
                  )}
                </div>
              </div>
            ) : (
              <img
                src={result.mutatedImageUrl}
                alt="Mutated NFT"
                className="w-full h-full object-cover rounded-2xl shadow-xl"
              />
            )}
          </div>
        </div>

        {/* Mint button */}
        <div className="p-6">
          <button
            disabled={status !== "ready"}
            onClick={handleProceedToMint}
            className={`w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all duration-300 ${
              status === "ready"
                ? "bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 hover:shadow-2xl hover:scale-105 active:scale-95"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {status === "ready" ? (
              <span className="flex flex-col items-center justify-center gap-1">
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
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
                  Mint Mutant
                </span>
                <span className="text-xs font-normal opacity-90">
                  {mutationFee ? formatEther(mutationFee) : "0.00037"} ETH
                </span>
              </span>
            ) : (
              "Mutating..."
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
