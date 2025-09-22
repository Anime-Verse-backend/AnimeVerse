"use client";

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/lib/types';
import * as api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Info, Clock, PlayCircle, ChevronRight, Loader2, Youtube } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CommentSection } from '@/components/comment-section';
import { RelatedAnimes } from '@/components/related-animes';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    let videoId: string | null = null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
    } catch (e) {
        return null; // Invalid URL
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

export default function AnimeDetailPage() {
  const params = useParams();
  const animeId = typeof params.id === 'string' ? params.id.split('-')[0] : '';
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (animeId) {
      api.getAnimeById(animeId)
        .then(data => {
          if (data) {
            setAnime(data);
          } else {
            notFound();
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [animeId]);

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!anime) {
    return notFound();
  }

  const embedUrl = getYouTubeEmbedUrl(anime.trailerUrl);

  return (
    <div className="space-y-8">
      <div className="relative h-64 md:h-96 w-full rounded-xl overflow-hidden">
        <Image
          src={anime.imageUrl}
          alt={`Banner para ${anime.title}`}
          fill
          className="object-cover"
          data-ai-hint={`${(anime.genres?.[0]?.name || 'anime').toLowerCase()} landscape`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-8">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">Ver {anime.title} Online</h1>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Star className="h-5 w-5 fill-current" />
              <span className="font-bold text-lg text-foreground">{anime.rating}</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-wrap gap-2">
              {(anime.genres || []).map((g) => (
                <Badge key={g.id} variant="secondary">{g.name}</Badge>
              ))}
              <Badge variant="outline">{anime.audience}</Badge>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {anime.announcement && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Anuncio</AlertTitle>
              <AlertDescription>{anime.announcement}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Sinopsis de {anime.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{anime.description}</p>
            </CardContent>
          </Card>
          
          {embedUrl && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center gap-2"><Youtube className="text-red-500" /> Tráiler Oficial</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video">
                        <iframe
                            className="w-full h-full rounded-lg"
                            src={embedUrl}
                            title={`Tráiler de ${anime.title}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl">Temporadas y Episodios</CardTitle>
            </CardHeader>
            <CardContent>
                {anime.seasons && anime.seasons.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                        {anime.seasons.map((season, index) => (
                            <AccordionItem value={`item-${index}`} key={season.id}>
                                <AccordionTrigger>{season.title}</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2">
                                        {season.episodes.map(episode => (
                                          <li key={episode.id}>
                                            <Link href={`/watch/${anime.id}/${episode.id}`} className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-4">
                                                    <PlayCircle className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    <div>
                                                        <p className="font-medium group-hover:text-primary transition-colors">{episode.title}</p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{episode.duration} min</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </Link>
                                          </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground text-center py-4">La lista de episodios no está disponible aún.</p>
                )}
            </CardContent>
          </Card>

          <CommentSection initialComments={anime.comments || []} animeId={anime.id} />
        </div>

        <div className="space-y-8">
          <RelatedAnimes anime={anime} />
        </div>
      </div>
    </div>
  );
}
