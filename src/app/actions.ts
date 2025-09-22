'use server';

// By importing the functions directly from the flow files (which are marked 'use server'),
// we ensure that the entire call chain remains on the server.
import { suggestRelatedAnime } from '@/ai/flows/related-animes-flow';
import type { RelatedAnimeInput, RelatedAnimeOutput } from '@/ai/flows/related-animes-flow';


/**
 * Server Action to suggest related anime.
 * This function is safe to call from client components.
 */
export async function suggestRelatedAnimeAction(input: RelatedAnimeInput): Promise<RelatedAnimeOutput> {
  return await suggestRelatedAnime(input);
}
