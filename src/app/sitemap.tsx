import { MetadataRoute } from 'next';
import { getAnimes } from '@/lib/api';
import { slugify } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const animes = await getAnimes();

  const animePages = animes.map((anime) => ({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/anime/${anime.id}/${slugify(anime.title)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const staticPages = [
    { url: `${process.env.NEXT_PUBLIC_BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${process.env.NEXT_PUBLIC_BASE_URL}/allies`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${process.env.NEXT_PUBLIC_BASE_URL}/developers`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${process.env.NEXT_PUBLIC_BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.4 },
    { url: `${process.env.NEXT_PUBLIC_BASE_URL}/donate`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.2 },
  ];

  return [...staticPages, ...animePages];
}
