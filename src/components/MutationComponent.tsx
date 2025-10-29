import { useState } from "react";
import { useMutation, type NFTData } from "../hooks/useMutation";
import { blobFromUrl, uploadImageBlob, uploadMetadata } from "../services/ipfs";
import { mintMutant } from "../services/mintService";
import { MutationType } from "../services/geminiMutation";

interface MutationComponentProps {
  nftData?: NFTData;
  onMutationComplete?: (result: any) => void;
}

export function MutationComponent({
  nftData,
  onMutationComplete,
}: MutationComponentProps) {
  const {
    mutationState,
    mutationTypes,
    mutateNFT,
    resetMutation,
    isGeminiAvailable,
  } = useMutation();
  const [selectedMutation, setSelectedMutation] = useState<MutationType | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);

  if (!isGeminiAvailable) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          ⚠️ Gemini API Not Available
        </h3>
        <p className="text-red-700">
          Please set your <code>VITE_GEMINI_API_KEY</code> environment variable
          to use AI mutations.
        </p>
      </div>
    );
  }

  if (!nftData) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          🖼️ Select an NFT
        </h3>
        <p className="text-gray-600">
          Connect your wallet and select an NFT to begin the mutation process.
        </p>
      </div>
    );
  }

  const handleMutationSelect = (mutationType: MutationType) => {
    setSelectedMutation(mutationType);
    setShowPreview(true);
  };

  const handleStartMutation = async () => {
    if (!selectedMutation) return;

    try {
      await mutateNFT(nftData, selectedMutation);
      if (mutationState.status === "complete" && onMutationComplete) {
        onMutationComplete(mutationState.result);
      }
    } catch (error) {
      console.error("Mutation failed:", error);
    }
  };

  const handleProceedToMint = async () => {
    try {
      if (!mutationState.result) return;
      // 1) Prepare image blob (handles data URLs and http URLs)
      const imageBlob = await blobFromUrl(mutationState.result.mutatedImageUrl);
      // 2) Upload image to IPFS
      const imageUri = await uploadImageBlob(imageBlob);
      // 3) Build metadata
      const name = `Mutated ${nftData.name}`;
      const description =
        mutationState.result.mutationDescription || nftData.description || name;
      const attributes = [
        ...(nftData.attributes || []),
        ...Object.entries(mutationState.result.traits || {}).map(
          ([trait_type, value]) => ({
            trait_type,
            value: String(value),
          })
        ),
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
          enhancedPrompt: mutationState.result.enhancedPrompt,
          lore: mutationState.result.lore,
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

  const getRarityColor = (rarity: MutationType["rarity"]) => {
    switch (rarity) {
      case "common":
        return "text-green-600 bg-green-50 border-green-200";
      case "rare":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "legendary":
        return "text-purple-600 bg-purple-50 border-purple-200";
    }
  };

  const getStatusIcon = () => {
    switch (mutationState.status) {
      case "analyzing":
        return "🔬";
      case "generating_description":
        return "📝";
      case "generating_image":
        return "🎨";
      case "validating":
        return "✅";
      case "complete":
        return "🎉";
      case "error":
        return "❌";
      default:
        return "🚀";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* API Status Warning */}
      {mutationState.error?.includes("quota") && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">
                Gemini API Quota Exceeded
              </h3>
              <p className="text-sm text-yellow-700">
                The free tier API limit has been reached. Using fallback
                mutation data. Mutations will still work, but with pre-generated
                descriptions.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🧬 NFT Mutation Lab</h2>

        {/* Original NFT Display */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <img
            src={nftData.image}
            alt={nftData.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <h3 className="font-semibold">{nftData.name}</h3>
            <p className="text-sm text-gray-600">{nftData.description}</p>
            <p className="text-xs text-gray-500">Token ID: {nftData.tokenId}</p>
          </div>
        </div>

        {/* Mutation Selection */}
        {!showPreview && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Your Mutation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mutationTypes.map((mutation) => (
                <div
                  key={mutation.id}
                  onClick={() => handleMutationSelect(mutation)}
                  className="cursor-pointer border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{mutation.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full border ${getRarityColor(mutation.rarity)}`}
                    >
                      {mutation.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {mutation.description}
                  </p>
                  <div className="text-sm font-semibold text-green-600">
                    Cost: {mutation.cost} ETH
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mutation Preview & Process */}
        {showPreview && selectedMutation && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Mutation Preview: {selectedMutation.name}
              </h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedMutation(null);
                  resetMutation();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Selection
              </button>
            </div>

            {/* Mutation Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">{getStatusIcon()}</span>
                <span className="font-semibold">
                  {mutationState.currentStep}
                </span>
              </div>

              {mutationState.status !== "idle" && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${mutationState.progress}%` }}
                  />
                </div>
              )}

              {mutationState.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {mutationState.error}
                </div>
              )}
            </div>

            {/* Mutation Results */}
            {mutationState.result && (
              <div className="space-y-4">
                {/* Mutated Image Display */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
                  <h4 className="font-semibold text-purple-900 mb-4 text-xl flex items-center">
                    <span className="text-2xl mr-2">🎨</span> Your Mutated NFT
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Original Image */}
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2 text-center">
                        Original
                      </h5>
                      <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-gray-300">
                        <img
                          src={nftData.image}
                          alt="Original NFT"
                          className="w-full h-auto"
                        />
                      </div>
                    </div>

                    {/* Mutated Image */}
                    <div>
                      <h5 className="font-medium text-purple-700 mb-2 text-center flex items-center justify-center">
                        Mutated
                        {mutationState.result.imageGenerationService ===
                          "replicate" && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            AI Generated
                          </span>
                        )}
                        {mutationState.result.imageGenerationService ===
                          "fallback" && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Canvas Effect
                          </span>
                        )}
                      </h5>
                      <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-purple-500 animate-pulse-slow">
                        <img
                          src={mutationState.result.mutatedImageUrl}
                          alt="Mutated NFT"
                          className="w-full h-auto"
                        />
                        <div className="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          NEW!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">
                    ✨ Mutation Details
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium">Enhanced Prompt:</h5>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                        {mutationState.result.enhancedPrompt}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium">Mutation Description:</h5>
                      <p className="text-sm text-gray-700">
                        {mutationState.result.mutationDescription}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium">New Traits:</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(mutationState.result.traits).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {key}: {value}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium">Mutation Lore:</h5>
                      <p className="text-sm text-gray-700 italic">
                        {mutationState.result.lore}
                      </p>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Quality Score:{" "}
                          {mutationState.result.validation.confidence}%
                        </span>
                        <button
                          onClick={handleProceedToMint}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Proceed to Mint ({selectedMutation.cost} ETH)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Start Mutation Button */}
            {mutationState.status === "idle" && (
              <button
                onClick={handleStartMutation}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
              >
                🧬 Begin {selectedMutation.name} Mutation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
