'use server';
/**
 * @fileOverview Suggests related anime based on a given anime's details.
 *
 * - suggestRelatedAnime - A function that provides related anime suggestions.
 * - RelatedAnimeInput - The input type for the suggestRelatedAnime function.
 * - RelatedAnimeOutput - The return type for the suggestRelatedAnime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RelatedAnimeInputSchema = z.object({
  title: z.string().describe("The title of the anime to base recommendations on."),
  genres: z.string().describe("A comma-separated list of genres for the anime."),
  description: z.string().describe("A short description of the anime."),
});
export type RelatedAnimeInput = z.infer<typeof RelatedAnimeInputSchema>;

const RelatedAnimeOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('A list of 3-5 anime titles that are similar to the input anime.'),
});
export type RelatedAnimeOutput = z.infer<typeof RelatedAnimeOutputSchema>;

export async function suggestRelatedAnime(input: RelatedAnimeInput): Promise<RelatedAnimeOutput> {
  return relatedAnimeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'relatedAnimePrompt',
  input: {schema: RelatedAnimeInputSchema},
  output: {schema: RelatedAnimeOutputSchema},
  prompt: `You are an expert anime recommender. A user is viewing an anime with the following details:
- Title: {{{title}}}
- Genres: {{{genres}}}
- Description: {{{description}}}

Based on these details, suggest 3 to 5 other anime series that they might enjoy. Provide only the titles of the recommended anime. Your output must be a list of strings.`,
});

const relatedAnimeFlow = ai.defineFlow(
  {
    name: 'relatedAnimeFlow',
    inputSchema: RelatedAnimeInputSchema,
    outputSchema: RelatedAnimeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
