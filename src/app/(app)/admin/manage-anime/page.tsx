"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Anime, Genre } from '@/lib/types';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Trash, Pencil, Star, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimeDialog } from '@/components/anime-dialog';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const ITEMS_PER_PAGE = 8;

export default function ManageAnimePage() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [animeToDelete, setAnimeToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAnimes = () => {
    setLoading(true);
    api.getAnimes()
      .then(data => setAnimes(data || [])) // Ensure it's always an array
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAnimes();
  }, []);

  const filteredAnimes = useMemo(() => {
    if (!animes) return [];
    return animes
      .filter(anime => 
        statusFilter === 'All' || anime.status === statusFilter
      )
      .filter(anime => 
        anime.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [animes, searchTerm, statusFilter]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil((filteredAnimes?.length || 0) / ITEMS_PER_PAGE);
  const paginatedAnimes = useMemo(() => {
    if (!filteredAnimes) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAnimes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAnimes, currentPage]);

  const handleAddNew = () => {
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (animeId: string) => {
    setAnimeToDelete(animeId);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!animeToDelete) return;
    try {
      await api.deleteAnime(animeToDelete);
      setAnimes(animes.filter(a => a.id !== animeToDelete));
      toast({ title: "Success", description: "Anime deleted successfully." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to delete anime." });
    } finally {
      setIsAlertOpen(false);
      setAnimeToDelete(null);
    }
  };

  const handleSave = async (data: Omit<Anime, 'id' | 'comments' | 'seasons' | 'genres'> & { imageBase64?: string | null, genre: string[] }) => {
    try {
      await api.addAnime(data);
      toast({ title: "Success", description: "Anime added successfully." });
      setIsDialogOpen(false);
      fetchAnimes(); // Refresh the list
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error", description: `Failed to add new anime: ${error.message}` });
    }
  };

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Anime</h1>
          <p className="text-muted-foreground">Add, edit, or delete anime series from the catalog.</p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Anime
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Airing">Airing</SelectItem>
                <SelectItem value="Finished">Finished</SelectItem>
                <SelectItem value="Upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedAnimes && paginatedAnimes.length > 0 ? paginatedAnimes.map(anime => (
          <Card key={anime.id} className="flex flex-col">
            <CardHeader>
              <div className="relative aspect-video">
                <Image src={anime.imageUrl} alt={anime.title} fill className="rounded-md object-cover" />
              </div>
               <div className="flex items-start justify-between gap-2 mt-4">
                  <CardTitle className="text-base leading-tight flex-1">
                    <Link href={`/admin/manage-anime/${anime.id}`} className="hover:underline">
                      {anime.title}
                    </Link>
                  </CardTitle>
                  {anime.isFeatured && <Star className="h-4 w-4 fill-primary text-primary" />}
               </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3 flex-grow">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={anime.status === 'Airing' ? 'default' : 'secondary'}>{anime.status}</Badge>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Rating</span>
                    <span>{anime.rating}</span>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/manage-anime/${anime.id}`}>
                  <Pencil className="mr-2 h-3 w-3" /> Edit
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(anime.id)}>
                <Trash className="mr-2 h-3 w-3" /> Delete
              </Button>
            </CardFooter>
          </Card>
        )) : (
            <div className="col-span-full py-12 text-center text-muted-foreground">
                <p>No results found for your search/filter criteria.</p>
            </div>
        )}
      </div>

       {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      <AnimeDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the anime from the catalog.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAnimeToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
