
"use client";

import { useState, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import type { Anime, Season, Episode, EpisodeSource, Genre } from '@/lib/types';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, PlusCircle, Save, Trash, Loader2, Pencil } from 'lucide-react';
import { CommentSection } from '@/components/comment-section';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EpisodeDialog } from '@/components/episode-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  announcement: z.string().optional(),
  genre: z.string().min(1, 'Enter at least one genre.'),
  audience: z.enum(['Kids', 'Teens', 'Adults']),
  rating: z.coerce.number().min(0).max(5),
  status: z.enum(['Airing', 'Finished', 'Upcoming']),
  imageUrl: z.string().min(1, 'Image is required.'),
  trailerUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')), 
  isFeatured: z.boolean(),
});

type FormData = z.infer<typeof FormSchema>;

export default function EditAnimePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const animeId = typeof params.id === 'string' ? params.id : '';
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [newSeasonTitle, setNewSeasonTitle] = useState('');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<{ seasonId: string; episodeId: string; episodeTitle: string } | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);


  const [isEpisodeDialogOpen, setIsEpisodeDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);


  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      description: '',
      announcement: '',
      genre: '',
      audience: 'Teens',
      rating: 0,
      status: 'Airing',
      imageUrl: '',
      trailerUrl: '',
      isFeatured: false,
    },
  });
  
  const fetchAnimeData = () => {
     if (animeId) {
      setLoading(true);
      api.getAnimeById(animeId)
        .then(data => {
          if (data) {
            setAnime(data);
            setSeasons(data.seasons || []);
            form.reset({
              title: data.title,
              description: data.description,
              announcement: data.announcement || '',
              genre: (data.genres || []).map(g => g.name).join(', '),
              audience: data.audience,
              rating: data.rating,
              status: data.status,
              imageUrl: data.imageUrl,
              trailerUrl: data.trailerUrl || '',
              isFeatured: data.isFeatured || false,
            });
            setImagePreview(data.imageUrl);
            setImageBase64(null);

          } else {
            notFound();
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => {
    fetchAnimeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeId]);
  
  const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!anime) {
    return notFound();
  }
  
  const handleFormSubmit = async (data: FormData) => {
    const updatedAnimeData = { 
        ...data, 
        genre: data.genre.split(',').map(s => s.trim()).filter(Boolean),
        imageBase64: imageBase64,
    };
    
    try {
      const updatedAnime = await api.updateAnime(anime.id, updatedAnimeData);
      toast({ title: "Success", description: "Anime details updated successfully." });
      setImageBase64(null);
       if (updatedAnime.imageUrl) {
        setImagePreview(updatedAnime.imageUrl);
        form.setValue('imageUrl', updatedAnime.imageUrl);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update anime: ${error.message}` });
    }
  };

  const handleAddSeason = async () => {
    if (!newSeasonTitle.trim()) return;
    const newSeasonData: Omit<Season, 'id'|'episodes'|'animeId'> = { title: newSeasonTitle };
    try {
        const newSeason = await api.addSeason(anime.id, newSeasonData);
        setSeasons([...seasons, newSeason]);
        setNewSeasonTitle('');
        toast({ title: "Success", description: "Season added." });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add season.' });
    }
  };

  const handleDeleteSeason = async () => {
    if (!seasonToDelete) return;
    // This is a placeholder, you'll need to implement api.deleteSeason
    // await api.deleteSeason(anime.id, seasonToDelete.id);
    console.log("Deleting season (API call not implemented)", seasonToDelete.id);
    setSeasons(seasons.filter(s => s.id !== seasonToDelete.id));
    toast({ title: "Success", description: `Season "${seasonToDelete.title}" deleted.`});
    setSeasonToDelete(null);
  }
  
  const openEpisodeDialog = (seasonId: string, episode: Episode | null = null) => {
    setEditingEpisode(episode);
    setCurrentSeasonId(seasonId);
    setIsEpisodeDialogOpen(true);
  }

  const openDeleteDialog = (seasonId: string, episodeId: string, episodeTitle: string) => {
    setEpisodeToDelete({ seasonId, episodeId, episodeTitle });
    setIsAlertOpen(true);
  };

  const handleDeleteEpisode = async () => {
    if (!episodeToDelete) return;
    try {
      await api.deleteEpisode(anime.id, episodeToDelete.seasonId, episodeToDelete.episodeId);
      setSeasons(seasons.map(s => 
        s.id === episodeToDelete.seasonId 
        ? { ...s, episodes: s.episodes.filter(e => e.id !== episodeToDelete.episodeId) } 
        : s
      ));
      toast({ title: "Success", description: "Episode deleted successfully." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to delete episode." });
    } finally {
      setIsAlertOpen(false);
      setEpisodeToDelete(null);
    }
  };

  const handleEpisodeSave = async (episodeData: Partial<Omit<Episode, 'id'>>) => {
    try {
      let savedEpisode: Episode;
      if (editingEpisode) { // Update existing
        savedEpisode = await api.updateEpisode(animeId, editingEpisode.seasonId, editingEpisode.id, episodeData);
         setSeasons(prevSeasons => prevSeasons.map(season => 
            season.id === savedEpisode.seasonId 
            ? { ...season, episodes: season.episodes.map(ep => ep.id === savedEpisode.id ? savedEpisode : ep) }
            : season
        ));
        toast({ title: "Success", description: "Episode updated successfully." });
      } else { // Create new
        const seasonIdForNewEpisode = currentSeasonId;
        if(!seasonIdForNewEpisode) throw new Error("Season ID is missing to add a new episode.");
        
        // The episodeData from the form already contains the seasonId if we pass it
        const finalEpisodeData = {
          ...episodeData,
          seasonId: seasonIdForNewEpisode,
        }

        savedEpisode = await api.addEpisode(animeId, seasonIdForNewEpisode, finalEpisodeData as Omit<Episode, 'id' | 'comments'>);
        setSeasons(prevSeasons => prevSeasons.map(season => 
            season.id === savedEpisode.seasonId 
            ? { ...season, episodes: [...season.episodes, savedEpisode] }
            : season
        ));
        toast({ title: "Success", description: "Episode added successfully." });
      }
      setIsEpisodeDialogOpen(false);
      setEditingEpisode(null);
      setCurrentSeasonId(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error", description: `Failed to save episode: ${error.message}` });
    }
  };

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.push('/admin/manage-anime')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Anime List
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Anime Details</CardTitle>
                    <CardDescription>Make changes to the main information of the series.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="announcement" render={({ field }) => ( <FormItem><FormLabel>Announcement (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="e.g. New season coming soon!" /></FormControl><FormMessage /></FormItem> )} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="genre" render={({ field }) => ( <FormItem><FormLabel>Genres (comma-separated)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="rating" render={({ field }) => ( <FormItem><FormLabel>Rating (0-5)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="audience" render={({ field }) => ( <FormItem><FormLabel>Audience</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Kids">Kids</SelectItem><SelectItem value="Teens">Teens</SelectItem><SelectItem value="Adults">Adults</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Airing">Airing</SelectItem><SelectItem value="Finished">Finished</SelectItem><SelectItem value="Upcoming">Upcoming</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                             </div>
                             
                             <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image</FormLabel>
                                        {imagePreview && (
                                            <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden my-2">
                                                <Image src={imagePreview} alt="Image Preview" fill objectFit="cover" />
                                            </div>
                                        )}
                                        <Tabs defaultValue="url" className="w-full">
                                            <TabsList>
                                                <TabsTrigger value="url">URL</TabsTrigger>
                                                <TabsTrigger value="upload">Upload</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="url">
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://example.com/image.png" 
                                                        value={field.value?.startsWith('blob:') || field.value?.startsWith('data:') ? '' : field.value}
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            setImagePreview(e.target.value);
                                                            setImageBase64(null);
                                                        }}
                                                    />
                                                </FormControl>
                                            </TabsContent>
                                            <TabsContent value="upload">
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const previewUrl = URL.createObjectURL(file);
                                                                const dataUri = await fileToDataUri(file);
                                                                setImagePreview(previewUrl);
                                                                setImageBase64(dataUri);
                                                                form.setValue('imageUrl', previewUrl, { shouldValidate: true });
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                            </TabsContent>
                                        </Tabs>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField control={form.control} name="trailerUrl" render={({ field }) => ( <FormItem><FormLabel>YouTube Trailer URL</FormLabel><FormControl><Input {...field} placeholder="https://youtube.com/watch?v=..." /></FormControl><FormMessage /></FormItem> )} />
                             
                             <FormField
                                control={form.control}
                                name="isFeatured"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Featured Anime</FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                          Featured animes appear at the top of the dashboard.
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                                />

                            <div className="flex justify-end">
                                <Button type="submit"><Save className="mr-2 h-4 w-4"/>Save Changes</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Seasons & Episodes</CardTitle>
                    <CardDescription>Add or remove seasons and episodes for this anime.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder="New Season Title (e.g., Season 3)" value={newSeasonTitle} onChange={e => setNewSeasonTitle(e.target.value)} />
                            <Button onClick={handleAddSeason}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                        <Accordion type="single" collapsible className="w-full" defaultValue='item-0'>
                            {seasons.map((season, index) => (
                                <AccordionItem value={`item-${index}`} key={season.id}>
                                    <AccordionTrigger>{season.title}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 p-2">
                                            {season.episodes.length > 0 ? season.episodes.map(episode => (
                                                <div key={episode.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                                    <div>
                                                        <span className="font-medium">{episode.title}</span>
                                                        <span className="text-muted-foreground"> ({episode.duration} min)</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEpisodeDialog(season.id, episode)}>
                                                          <Pencil className="h-4 w-4" />
                                                      </Button>
                                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDeleteDialog(season.id, episode.id, episode.title)}>
                                                          <Trash className="h-4 w-4 text-destructive" />
                                                      </Button>
                                                    </div>
                                                </div>
                                            )) : <p className="text-sm text-muted-foreground text-center">No episodes added yet.</p>}
                                            
                                            <Separator className="my-4" />

                                            <div className="flex justify-center">
                                                <Button size="sm" onClick={() => openEpisodeDialog(season.id, null)}><PlusCircle className="mr-2 h-4 w-4" />Add Episode</Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                         {seasons.length === 0 && <p className="text-sm text-muted-foreground text-center pt-4">No seasons added yet.</p>}
                    </div>
                </CardContent>
            </Card>
            
            {anime && <CommentSection initialComments={(anime.comments || [])} animeId={anime.id} />}
        </div>
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the episode "{episodeToDelete?.episodeTitle}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEpisodeToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteEpisode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Episode
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEpisodeDialogOpen && <EpisodeDialog 
        isOpen={isEpisodeDialogOpen}
        onOpenChange={setIsEpisodeDialogOpen}
        episode={editingEpisode}
        seasonId={currentSeasonId}
        onSave={handleEpisodeSave}
      />}

    </div>
  );
}
