import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";
import { z } from "zod";

type CreateRoomRequest = any;
type JoinRoomRequest = any;

export function useRooms() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.rooms.listPublic.path],
    queryFn: async () => {
      const res = await fetch(api.rooms.listPublic.path);
      if (!res.ok) throw new Error("Failed to fetch public rooms");
      return (await res.json()) as any;
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
      return (await res.json()) as any;
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
      return (await res.json()) as any;
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
      return (await res.json()) as any;
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
