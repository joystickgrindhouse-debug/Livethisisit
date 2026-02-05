import { z } from 'zod';
import { rooms, players, insertRoomSchema, insertPlayerSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  rooms: {
    create: {
      method: 'POST' as const,
      path: '/api/rooms',
      input: z.object({
        settings: z.object({
          focusArea: z.enum(['arms', 'legs', 'core', 'total']),
          burnoutType: z.enum(['classic', 'pyramid', 'sudden-death', 'time-attack']),
          roundTime: z.number(),
          rounds: z.number(),
          restTime: z.number(),
        }),
        isPublic: z.boolean(),
        hostName: z.string(),
      }),
      responses: {
        201: z.custom<typeof rooms.$inferSelect & { players: (typeof players.$inferSelect)[] }>(),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/rooms/join',
      input: z.object({
        code: z.string(),
        playerName: z.string(),
      }),
      responses: {
        200: z.object({
          room: z.custom<typeof rooms.$inferSelect>(),
          player: z.custom<typeof players.$inferSelect>(),
          token: z.string(), // Simple session token/ID
        }),
        404: errorSchemas.notFound,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rooms/:code',
      responses: {
        200: z.custom<typeof rooms.$inferSelect & { players: (typeof players.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
      },
    },
    listPublic: {
      method: 'GET' as const,
      path: '/api/rooms/public',
      responses: {
        200: z.array(z.custom<typeof rooms.$inferSelect & { playerCount: number }>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
