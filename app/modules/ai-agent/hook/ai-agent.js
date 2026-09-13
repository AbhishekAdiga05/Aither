import { useQuery } from "@tanstack/react-query";

export const useAIModels = () => {
  return useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const res = await fetch("/api/ai/get-models");
      if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
      return await res.json();
    },
    staleTime: 10 * 60 * 1000, // models list rarely changes, cache for 10 min
  });
};
