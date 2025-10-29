const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const WARPLET_CONTRACT = "0x699727F9E01A822EFdcf7333073f0461e5914b4E";

export interface WarpletNFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  owner: string | null;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Fetch a specific Warplet by token ID (FID)
 */
export async function fetchWarpletByTokenId(
  tokenId: number
): Promise<WarpletNFT | null> {
  try {
    const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${WARPLET_CONTRACT}&tokenId=${tokenId}&refreshCache=false`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NFT: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error || !data.image) {
      console.error("NFT not found or error:", data);
      return null;
    }

    return {
      tokenId: data.tokenId,
      name: data.name || `Warplet #${tokenId}`,
      description:
        data.description || "A unique Warplet from the Farcaster ecosystem",
      image: data.image.cachedUrl || data.image.originalUrl,
      owner: null, // Will be checked separately
      attributes: data.raw?.metadata?.attributes || [],
    };
  } catch (error) {
    console.error("Error fetching Warplet:", error);
    return null;
  }
}

/**
 * Check if an address owns a specific Warplet token
 */
export async function checkWarpletOwnership(
  ownerAddress: string,
  tokenId: number
): Promise<boolean> {
  try {
    // Precise per-token ownership check
    const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getOwnersForToken?contractAddress=${WARPLET_CONTRACT}&tokenId=${tokenId}`;

    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) return false;

    const data = await response.json();

    // Alchemy typically returns an array of owners. Support common shapes.
    const owners: string[] =
      (Array.isArray(data?.owners) && data.owners) ||
      (Array.isArray(data?.ownerAddresses) && data.ownerAddresses) ||
      [];

    const target = ownerAddress.toLowerCase();
    return owners.some((addr) => typeof addr === "string" && addr.toLowerCase() === target);
  } catch (error) {
    console.error("Error checking ownership:", error);
    return false;
  }
}

/**
 * Get all Warplets owned by an address
 */
export async function fetchUserWarplets(
  ownerAddress: string
): Promise<WarpletNFT[]> {
  try {
    const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${ownerAddress}&contractAddresses[]=${WARPLET_CONTRACT}&withMetadata=true`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NFTs: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.ownedNfts || []).map((nft: any) => ({
      tokenId: nft.tokenId,
      name: nft.name || `Warplet #${nft.tokenId}`,
      description: nft.description || "",
      image: nft.image?.cachedUrl || nft.image?.originalUrl,
      owner: ownerAddress,
      attributes: nft.raw?.metadata?.attributes || [],
    }));
  } catch (error) {
    console.error("Error fetching user Warplets:", error);
    return [];
  }
}
