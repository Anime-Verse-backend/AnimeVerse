"use client"

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import type { Anime, Genre } from '@/lib/types';
import * as api from '@/lib/api';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Search, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AnimeCard } from '@/components/anime-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ContinueWatching } from '@/components/continue-watching';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function DashboardPage() {
  const [homeSections, setHomeSections] = useState<Record<string, Anime[]>>({});
  const [featuredAnimes, setFeaturedAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating_desc');
  
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredAnimes, setFilteredAnimes] = useState<Anime[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  
  const activeFilters = searchTerm || genreFilter !== 'all' || statusFilter !== 'all';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [sections, featured, apiGenres] = await Promise.all([
          api.getAnimesForHome(),
          api.getAnimes({ isFeatured: true }),
          api.getGenres(),
        ]);
        setHomeSections(sections);
        setFeaturedAnimes(featured);
        setGenres(apiGenres);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSearchAndFilter = async () => {
      if (!activeFilters) {
          setIsFiltering(false);
          return;
      }

      setIsFiltering(true);
      setFilterLoading(true);
      try {
          const params = {
              q: searchTerm,
              genre: genreFilter === 'all' ? undefined : genreFilter,
              status: statusFilter === 'all' ? undefined : statusFilter,
              sort_by: sortBy,
          };
          const results = await api.getAnimes(params);
          setFilteredAnimes(results);
      } catch (error) {
          console.error("Failed to fetch filtered animes:", error);
      } finally {
          setFilterLoading(false);
      }
  };
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
        handleSearchAndFilter();
    }, 300); // Debounce API calls

    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, genreFilter, statusFilter, sortBy]);


  const clearFilters = () => {
      setSearchTerm('');
      setGenreFilter('all');
      setStatusFilter('all');
      setSortBy('rating_desc');
      setIsFiltering(false);
  };
  
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Explora el Universo del Anime</h1>
          <p className="text-muted-foreground">Encuentra tu próxima serie favorita.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Busca un anime por título..."
            className="pl-10 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Filter Controls */}
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="genre-filter">Género</Label>
                        <Select value={genreFilter} onValueChange={setGenreFilter}>
                            <SelectTrigger id="genre-filter"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Géneros</SelectItem>
                                {genres.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="status-filter">Estado</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger id="status-filter"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Estados</SelectItem>
                                <SelectItem value="Airing">En Emisión</SelectItem>
                                <SelectItem value="Finished">Finalizado</SelectItem>
                                <SelectItem value="Upcoming">Próximamente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sort-filter">Ordenar Por</Label>
                         <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger id="sort-filter"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rating_desc">Rating: Mayor a Menor</SelectItem>
                                <SelectItem value="title_asc">Alfabético</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {activeFilters && (
                        <Button variant="ghost" onClick={clearFilters} className="w-full md:w-auto">
                            <X className="mr-2 h-4 w-4" /> Limpiar Filtros
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      {isFiltering ? (
        <div className="mt-8">
          <h2 className="text-2xl font-bold font-headline">Resultados de Búsqueda</h2>
           {filterLoading ? (
             <div className="flex justify-center items-center py-24">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
           ) : (
              filteredAnimes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                  {filteredAnimes.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
                </div>
              ) : (
                <p className="mt-4 text-muted-foreground py-12 text-center">No se encontraron animes para tus criterios de búsqueda.</p>
              )
           )}
        </div>
      ) : (
        <div className="space-y-12">
          
          <ContinueWatching />

          {featuredAnimes.length > 0 && (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold font-headline">Destacados</h2>
                <Carousel opts={{ align: "start", loop: true, }} className="w-full">
                  <CarouselContent>
                    {featuredAnimes.map((anime) => (
                       <CarouselItem key={anime.id} className="basis-11/12 md:basis-1/2 lg:basis-1/3">
                          <Link href={`/anime/${anime.id}`} className="block group">
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                              <Image src={anime.imageUrl} alt={anime.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="anime action" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                              <div className="absolute bottom-0 left-0 p-4">
                                <h3 className="text-xl font-bold text-white font-headline">{anime.title}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {(anime.genres || []).slice(0, 2).map((g) => (<Badge key={g.id} variant="secondary" className="text-xs backdrop-blur-sm bg-black/20 text-white border-white/20">{g.name}</Badge>))}
                                </div>
                              </div>
                              <div className="absolute top-2 right-2 flex items-center gap-1 text-yellow-400 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="font-bold text-sm text-white">{anime.rating}</span>
                              </div>
                            </div>
                          </Link>
                       </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
            </div>
          )}

          <div className="space-y-8">
            {Object.entries(homeSections).map(([genre, animes]) => (
              <div key={genre}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold font-headline">{capitalize(genre)}</h2>
                  <Button asChild variant="link" onClick={() => setGenreFilter(genre)}>
                    <span className="cursor-pointer">Ver Todos</span>
                  </Button>
                </div>
                <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                  <CarouselContent>
                    {animes.map((anime: Anime) => (
                      <CarouselItem key={anime.id} className="basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                        <AnimeCard anime={anime} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex"/>
                </Carousel>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
