import { rpcClient } from "@/shared/api/rpc-client";

/** Reads API health and the authenticated user's private test response. */
export async function getServerStatus() {
  const [health, privateData] = await Promise.all([
    rpcClient.health.live(),
    rpcClient.private.data()
  ]);

  return {
    health: health.status,
    privateMessage: privateData.message
  };
}
