"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PlayCircle } from 'lucide-react';
import * as api from '@/lib/api';

interface ContinueWatchingData {
    animeId: string;
    animeTitle: string;
    animeImageUrl: string;
    episodeId: string;
    episodeTitle: string;
    timestamp: number;
}

export function ContinueWatching() {
    const [lastWatched, setLastWatched] = useState<ContinueWatchingData | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        setIsClient(true);
        let data: ContinueWatchingData | null = null;
        try {
            const storedData = localStorage.getItem('continue-watching');
            if (storedData) {
                data = JSON.parse(storedData);
            }
        } catch (error) {
            console.error("Failed to parse continue watching data:", error);
            localStorage.removeItem('continue-watching');
        }

        if (data) {
            setLastWatched(data);
        }
    }, []);

    useEffect(() => {
        const checkLastEpisode = async () => {
            if (!lastWatched) {
                setShowBanner(false);
                return;
            }

            const animeDetails = await api.getAnimeById(lastWatched.animeId);
            if (!animeDetails || !animeDetails.seasons || animeDetails.seasons.length === 0) {
                setShowBanner(true); // Show if we can't verify
                return;
            }
            
            const lastSeason = animeDetails.seasons[animeDetails.seasons.length - 1];
            if (!lastSeason.episodes || lastSeason.episodes.length === 0) {
                 setShowBanner(true); // Show if we can't verify
                 return;
            }
            
            const lastEpisode = lastSeason.episodes[lastSeason.episodes.length - 1];
            
            if (lastWatched.episodeId === lastEpisode.id) {
                setShowBanner(false); // It's the last episode, don't show
            } else {
                setShowBanner(true); // It's not the last one, show
            }
        };

        if(isClient) {
            checkLastEpisode();
        }

    }, [lastWatched, isClient]);


    if (!isClient || !lastWatched || !showBanner) {
        return null;
    }

    return (
        <Card className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardHeader>
                <CardTitle>Continue Watching</CardTitle>
                <CardDescription>Pick up where you left off.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative w-full sm:w-48 aspect-video rounded-md overflow-hidden shrink-0">
                        <Image
                            src={lastWatched.animeImageUrl}
                            alt={lastWatched.animeTitle}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-grow text-center sm:text-left">
                        <h3 className="font-bold text-lg">{lastWatched.animeTitle}</h3>
                        <p className="text-sm text-muted-foreground">{lastWatched.episodeTitle}</p>
                    </div>
                    <Button asChild className="w-full sm:w-auto mt-4 sm:mt-0 shrink-0">
                        <Link href={`/watch/${lastWatched.animeId}/${lastWatched.episodeId}`}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Continue
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
