import { z } from 'zod';

export const oauthCallbackSchema = z.object({
  query: z.object({
    code: z.string().optional(),
    error: z.string().optional(),
    'accounts-server': z.string().optional(),
    location: z.string().optional(),
    state: z.string().optional(),
  }),
});

export type OAuthCallbackQuery = z.infer<typeof oauthCallbackSchema>['query'];
