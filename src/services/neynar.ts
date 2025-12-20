export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
}

export async function getUserByUsername(
  username: string
): Promise<NeynarUser | null> {
  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  if (!apiKey) {
    console.warn("VITE_NEYNAR_API_KEY is missing");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_username?username=${username}`,
      {
        headers: {
          accept: "application/json",
          api_key: apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Error fetching user from Neynar:", error);
    return null;
  }
}

export async function getUserByFid(fid: number): Promise<NeynarUser | null> {
  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  if (!apiKey) {
    console.warn("VITE_NEYNAR_API_KEY is missing");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          accept: "application/json",
          api_key: apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.users[0] || null;
  } catch (error) {
    console.error("Error fetching user from Neynar:", error);
    return null;
  }
}
