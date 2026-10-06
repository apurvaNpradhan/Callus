import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/shared/lib/orpc";

export const serverStatusQueryKeys = {
  live: () => orpc.health.live.key(),
  privateData: () => orpc.private.data.key()
};

export function useGetServerStatusQuery() {
  const healthQuery = useQuery(orpc.health.live.queryOptions());
  const privateQuery = useQuery(orpc.private.data.queryOptions());

  return {
    health: healthQuery.data?.status,
    isError: healthQuery.isError || privateQuery.isError,
    isLoading: healthQuery.isLoading || privateQuery.isLoading,
    privateMessage: privateQuery.data?.message
  };
}
