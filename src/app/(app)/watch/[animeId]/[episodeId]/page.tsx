
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Server, Languages, Loader2, ListVideo, ChevronRight, ChevronLeft, FileText, MessageCircle } from 'lucide-react';
import type { Anime, Episode, EpisodeSource } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RelatedAnimes } from '@/components/related-animes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { EpisodeCommentSection } from '@/components/episode-comment-section';
import { AdBanner } from '@/components/ad-banner';
import { VideoPlayer } from '@/components/video-player';

const sortEpisodes = (episodes: Episode[]) => {
  return [...episodes].sort((a, b) => {
    const numA = parseInt(a.title.match(/(\d+)/)?.[0] || "0");
    const numB = parseInt(b.title.match(/(\d+)/)?.[0] || "0");
    return numA - numB;
  });
};

export default function WatchPage() {
    const router = useRouter();
    const params = useParams();
    const { animeId, episodeId } = params as { animeId: string; episodeId: string };

    const [anime, setAnime] = useState<Anime | null>(null);
    const [episode, setEpisode] = useState<Episode | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [selectedServer, setSelectedServer] = useState<string>('');
    
    const [currentSource, setCurrentSource] = useState<EpisodeSource | null>(null);

    useEffect(() => {
        if (animeId && episodeId) {
            setLoading(true);
            setAnime(null);
            setEpisode(null);
            setSelectedLanguage('');
            setSelectedServer('');
            setCurrentSource(null);

            api.getAnimeById(animeId).then(data => {
                if (data) {
                    const sortedData = {
                      ...data,
                      seasons: data.seasons.map(season => ({
                        ...season,
                        episodes: sortEpisodes(season.episodes)
                      }))
                    };
                    setAnime(sortedData);
                    const currentEpisode = sortedData.seasons?.flatMap(s => s.episodes).find(e => e.id === episodeId);
                    if (currentEpisode) {
                        setEpisode(currentEpisode);
                        const languages = [...new Set(currentEpisode.sources.map(s => s.language))];
                        if (languages.length > 0) {
                            const initialLanguage = languages.includes('Subtitled') ? 'Subtitled' : languages[0];
                            setSelectedLanguage(initialLanguage);
                            const servers = currentEpisode.sources.filter(s => s.language === initialLanguage).map(s => s.server);
                            if (servers.length > 0) {
                                setSelectedServer(servers[0]);
                            }
                        }
                    } else {
                        notFound();
                    }
                } else {
                    notFound();
                }
            }).catch(console.error).finally(() => setLoading(false));
        }
    }, [animeId, episodeId]);

    // Save to local storage for "Continue Watching"
    useEffect(() => {
        if (anime && episode) {
            const continueWatchingData = {
                animeId: anime.id,
                animeTitle: anime.title,
                animeImageUrl: anime.imageUrl,
                episodeId: episode.id,
                episodeTitle: episode.title,
                timestamp: Date.now()
            };
            localStorage.setItem('continue-watching', JSON.stringify(continueWatchingData));
        }
    }, [anime, episode]);

    const availableLanguages = useMemo(() => {
        if (!episode) return [];
        return [...new Set(episode.sources.map(s => s.language))];
    }, [episode]);

    const availableServers = useMemo(() => {
        if (!episode || !selectedLanguage) return [];
        return episode.sources.filter(s => s.language === selectedLanguage).map(s => s.server);
    }, [episode, selectedLanguage]);
    
    const { currentSeasonEpisodes, previousEpisode, nextEpisode } = useMemo(() => {
        if (!anime || !episode) return { currentSeasonEpisodes: [], previousEpisode: null, nextEpisode: null };
        const season = anime.seasons.find(s => s.id === episode.seasonId);
        if (!season) return { currentSeasonEpisodes: [], previousEpisode: null, nextEpisode: null };
        
        const sortedEpisodes = season.episodes; // Already sorted
        const currentIndex = sortedEpisodes.findIndex(e => e.id === episode.id);

        return {
            currentSeasonEpisodes: sortedEpisodes,
            previousEpisode: currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null,
            nextEpisode: currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null
        };
    }, [anime, episode]);

    // Handle language change
    const handleLanguageChange = (lang: string) => {
        setSelectedLanguage(lang);
        const servers = episode?.sources.filter(s => s.language === lang).map(s => s.server) || [];
        setSelectedServer(servers.length > 0 ? servers[0] : '');
    };
    
    useEffect(() => {
        if (episode && selectedLanguage && selectedServer) {
            const source = episode.sources.find(s => s.language === selectedLanguage && s.server === selectedServer);
            setCurrentSource(source || null);
        } else {
            setCurrentSource(null);
        }
    }, [episode, selectedLanguage, selectedServer]);


    if (loading) {
        return <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!anime || !episode) {
        return notFound();
    }

    const videoJsOptions = (currentSource?.type === 'url' && currentSource.url) ? {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        sources: [{
            src: currentSource.url,
            type: 'video/mp4'
        }],
    } : null;


    return (
        <div key={episodeId} className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="lg:col-span-3 space-y-6">
                 <div>
                    <Button variant="outline" onClick={() => router.push(`/anime/${anime.id}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Anime Details
                    </Button>
                </div>
                
                <Card>
                    <CardContent className="p-0">
                        <div className="aspect-video w-full rounded-t-lg overflow-hidden bg-black shadow-lg">
                           {currentSource?.type === 'url' && videoJsOptions ? (
                                <VideoPlayer options={videoJsOptions} />
                           ) : currentSource?.type === 'iframe' && currentSource.url ? (
                                <iframe
                                    src={currentSource.url}
                                    className="w-full h-full"
                                    allowFullScreen
                                    allow="autoplay; encrypted-media; picture-in-picture"
                                ></iframe>
                           ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                                    Select a source to start watching
                                </div>
                           )}
                        </div>
                         <div className="p-6 space-y-4">
                             <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-primary font-semibold">{anime.title}</p>
                                    <CardTitle className="text-3xl font-headline">{episode.title}</CardTitle>
                                </div>
                                <div className="flex gap-2">
                                    {previousEpisode && (
                                        <Button asChild variant="outline">
                                            <Link href={`/watch/${animeId}/${previousEpisode.id}`}>
                                                <ChevronLeft className="h-4 w-4 mr-2" /> Prev
                                            </Link>
                                        </Button>
                                    )}
                                    {nextEpisode && (
                                        <Button asChild>
                                            <Link href={`/watch/${animeId}/${nextEpisode.id}`}>
                                                Next <ChevronRight className="h-4 w-4 ml-2" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center"><Languages className="mr-2 h-4 w-4" /> Language</Label>
                                     <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                        <SelectTrigger><SelectValue placeholder="Select language..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableLanguages.map(lang => (
                                                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label className="flex items-center"><Server className="mr-2 h-4 w-4" /> Server</Label>
                                     <Select value={selectedServer} onValueChange={setSelectedServer} disabled={!selectedLanguage}>
                                        <SelectTrigger><SelectValue placeholder="Select server..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableServers.map(server => (
                                                <SelectItem key={server} value={server}>{server}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                         </div>
                    </CardContent>
                </Card>

                <AdBanner />

                {episode.synopsis && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-headline">
                                <FileText className="h-5 w-5"/> Synopsis del Episodio
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{episode.synopsis}</p>
                        </CardContent>
                    </Card>
                )}


                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 font-headline text-lg">
                                <ListVideo className="h-5 w-5"/> Episode List
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             <Card>
                                <CardHeader>
                                     <CardTitle className="font-headline">{anime.seasons.find(s => s.id === episode?.seasonId)?.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        <ul className="space-y-2 pr-4">
                                            {currentSeasonEpisodes.map((ep, index) => (
                                                <li key={ep.id}>
                                                    <Link href={`/watch/${animeId}/${ep.id}`} className={cn(
                                                        "flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group",
                                                        ep.id === episodeId && "bg-muted"
                                                    )}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "flex h-6 w-6 items-center justify-center rounded-sm text-xs font-bold",
                                                                ep.id === episodeId ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
                                                            )}>
                                                                {index + 1}
                                                            </div>
                                                            <p className={cn("font-medium group-hover:text-primary transition-colors", ep.id === episodeId && "text-primary")}>{ep.title}</p>
                                                        </div>
                                                        {ep.id === episodeId && <ChevronRight className="h-5 w-5 text-primary" />}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-2">
                        <AccordionTrigger>
                             <div className="flex items-center gap-2 font-headline text-lg">
                                <MessageCircle className="h-5 w-5"/> Comments
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <EpisodeCommentSection initialComments={episode.comments} episodeId={episode.id} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <RelatedAnimes anime={anime} />
            </div>
        </div>
    );
}
