"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Anime } from '@/lib/types';
import * as api from '@/lib/api';
import { suggestRelatedAnimeAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clapperboard, Star } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface RelatedAnimesProps {
  anime: Anime;
}

export function RelatedAnimes({ anime }: RelatedAnimesProps) {
  const [relatedAnimes, setRelatedAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      if (!anime) return;
      setLoading(true);
      try {
        const suggestedResult = await suggestRelatedAnimeAction({
          title: anime.title,
          genres: (anime.genres || []).map(g => g.name).join(', '),
          description: anime.description,
        });
        
        if (suggestedResult && suggestedResult.recommendations) {
           const allAnimes = await api.getAnimes();
           const recommendedAnimes = allAnimes
            .filter((a: Anime) => 
              suggestedResult.recommendations.includes(a.title) && a.id !== anime.id
            )
            .sort((a, b) => {
              return suggestedResult.recommendations.indexOf(a.title) - suggestedResult.recommendations.indexOf(b.title);
            })
            .slice(0, 5);
          setRelatedAnimes(recommendedAnimes);
        }
      } catch (error) {
        console.error("Failed to fetch related animes:", error);
        setRelatedAnimes([]);
      } finally {
        setLoading(false);
      }
    }

    if (anime?.id) {
        fetchRelated();
    }
  }, [anime]);

  if (loading) {
     return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Clapperboard className="h-5 w-5 text-primary" />
                    <CardTitle className="font-headline text-xl">You Might Also Like</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-[75px] w-[100px] rounded-md" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
     );
  }

  if (relatedAnimes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-primary" />
          <CardTitle className="font-headline text-xl">You Might Also Like</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {relatedAnimes.map(related => (
            <Link href={`/anime/${related.id}`} key={related.id} className="block group">
              <div className="flex items-start gap-4 p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors">
                 <Image
                    src={related.imageUrl}
                    alt={related.title}
                    width={100}
                    height={75}
                    className="rounded-md object-cover aspect-[4/3]"
                    data-ai-hint={`${(related.genres?.[0]?.name || 'anime').toLowerCase()} poster`}
                 />
                 <div className="flex-1">
                    <p className="font-semibold group-hover:text-primary transition-colors">{related.title}</p>
                    <div className="flex items-center gap-1.5 text-yellow-400 mt-1">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-bold text-foreground">{related.rating}</span>
                    </div>
                     <div className="flex flex-wrap gap-1 mt-2">
                        {(related.genres || []).slice(0, 2).map(g => (
                            <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
                                                ))}
                                            </div>
                                         </div>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }