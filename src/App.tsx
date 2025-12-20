import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { DonutMaker } from "./components/DonutMaker";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-6 px-4 max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
            Donut Factory
          </h1>
          <p className="text-sm text-foreground/80 font-semibold tracking-widest uppercase">
            Bake • Customize • Mint
          </p>
        </header>
        {/* Owner-only admin panel (withdraw treasury). Renders null for non-owners. */}
        <AdminPanel />
        <DonutMakerWrapper />
      </div>
    </div>
  );
}

function DonutMakerWrapper() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [autoConnecting, setAutoConnecting] = useState(false);

  // Mini app lifecycle hooks: mark ready
  useEffect(() => {
    async function onMiniAppReady() {
      try {
        sdk.actions.ready();
      } catch (e) {
        console.debug("Mini app ready failed:", e);
      }
    }
    onMiniAppReady();
  }, []);

  // Auto-connect Farcaster wallet if in miniapp
  useEffect(() => {
    async function autoConnectFarcaster() {
      if (!isConnected && !autoConnecting) {
        setAutoConnecting(true);
        try {
          const farcasterConnector = connectors.find(
            (connector) => connector.id === "farcasterFrame"
          );
          if (farcasterConnector) {
            try {
              await connect({ connector: farcasterConnector });
            } catch (e) {
              console.error("Auto-connect failed:", e);
            }
          }
        } catch (error) {
          console.error("Auto-connect failed:", error);
        } finally {
          setAutoConnecting(false);
        }
      }
    }
    autoConnectFarcaster();
  }, [isConnected, connectors]);

  return <DonutMaker />;
}
