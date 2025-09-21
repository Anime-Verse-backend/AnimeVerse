import { getAnimeById, getAnimes } from '@/lib/api';
import { type Anime } from '@/lib/types';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import AnimeDetailClientPage from './[slug]/page';
import { slugify } from '@/lib/utils';

export interface AnimePageProps {
  params: { id: string };
}

// Generate dynamic metadata for the page
export async function generateMetadata(
  { params }: AnimePageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const animeId = params.id.split('-')[0];
  const anime = await getAnimeById(animeId);

  if (!anime) {
    return {
      title: 'Anime No Encontrado',
      description: 'El anime que buscas no existe o fue movido.',
    };
  }
  
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `Ver ${anime.title} Online en AnimeVerse`,
    description: `Disfruta de ${anime.title}. ${anime.description.substring(0, 150)}...`,
    keywords: ['ver anime', anime.title, 'anime online', 'anime español', ...(anime.genres?.map(g => g.name) || [])],
    openGraph: {
      title: `Ver ${anime.title} en AnimeVerse`,
      description: anime.description,
      images: [
        {
          url: anime.imageUrl,
          width: 1200,
          height: 630,
          alt: `Poster de ${anime.title}`,
        },
        ...previousImages,
      ],
    },
     twitter: {
      card: 'summary_large_image',
      title: `Ver ${anime.title} en AnimeVerse`,
      description: anime.description,
      images: [anime.imageUrl],
    },
  };
}

// Statically generate routes at build time
export async function generateStaticParams() {
  const animes = await getAnimes();
  return animes.map((anime) => ({
    id: anime.id,
    slug: slugify(anime.title),
  }));
}

export default async function AnimeDetailPage({ params }: AnimePageProps) {
  const animeId = params.id.split('-')[0];
  const anime = await getAnimeById(animeId);

  if (!anime) {
    notFound();
  }

  return <AnimeDetailClientPage anime={anime} />;
}
