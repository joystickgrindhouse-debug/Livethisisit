import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateRoomRequest, type JoinRoomRequest } from "@shared/routes";
import { useToast } from "./use-toast";

export function useRooms() {
  return useQuery({
    queryKey: [api.rooms.listPublic.path],
    queryFn: async () => {
      const res = await fetch(api.rooms.listPublic.path);
      if (!res.ok) throw new Error("Failed to fetch public rooms");
      return api.rooms.listPublic.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

export function useRoom(code: string) {
  return useQuery({
    queryKey: [api.rooms.get.path, code],
    queryFn: async () => {
      const res = await fetch(api.rooms.get.path.replace(":code", code));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch room");
      return api.rooms.get.responses[200].parse(await res.json());
    },
    enabled: !!code,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateRoomRequest) => {
      const res = await fetch(api.rooms.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create room");
      }
      return api.rooms.create.responses[201].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rooms.listPublic.path] });
    },
  });
}

export function useJoinRoom() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: JoinRoomRequest) => {
      const res = await fetch(api.rooms.join.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Room not found");
        throw new Error("Failed to join room");
      }
      return api.rooms.join.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Cannot join room",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
