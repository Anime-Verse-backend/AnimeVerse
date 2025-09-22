import { MetadataRoute } from 'next';
import { getAnimes } from '@/lib/api';

// Revalidate the sitemap every hour to fetch new animes
export const revalidate = 60 * 60; 

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/dashboard`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/allies`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/developers`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.4 },
    { url: `${baseUrl}/donate`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.2 },
  ];

  try {
    const animes = await getAnimes();
    const animePages = animes.map((anime) => ({
      url: `${baseUrl}/anime/${anime.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...animePages];
  } catch (error) {
    console.error("Failed to fetch animes for sitemap, returning static pages only. Error:", error);
    // If the API is down or not available during build, just return the static pages.
    return staticPages;
  }
}
