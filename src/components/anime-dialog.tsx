
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Anime } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

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
  isFeatured: z.boolean().optional(),
});

type FormData = z.infer<typeof FormSchema>;

interface AnimeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (anime: Omit<Anime, 'id' | 'comments' | 'seasons' | 'genres'> & { imageBase64?: string | null, genre: string[] }) => Promise<void>;
  anime?: Anime | null;
}

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


export function AnimeDialog({ isOpen, onOpenChange, onSave, anime }: AnimeDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const defaultImageUrl = 'https://placehold.co/600x400.png';
    if (isOpen) {
        if (anime) {
            form.reset({
                title: anime.title,
                description: anime.description,
                announcement: anime.announcement || '',
                genre: Array.isArray(anime.genres) ? anime.genres.map(g => g.name).join(', ') : '',
                audience: anime.audience,
                rating: anime.rating,
                status: anime.status,
                imageUrl: anime.imageUrl,
                trailerUrl: anime.trailerUrl || '',
                isFeatured: anime.isFeatured || false,
            });
            setImagePreview(anime.imageUrl);
        } else {
            form.reset({
                title: '',
                description: '',
                announcement: '',
                genre: '',
                audience: 'Teens',
                rating: 0,
                status: 'Airing',
                imageUrl: defaultImageUrl,
                trailerUrl: '',
                isFeatured: false,
            });
            setImagePreview(defaultImageUrl);
        }
        setImageBase64(null);
    }
  }, [anime, form, isOpen]);


  const handleSubmit = async (data: FormData) => {
    setIsSaving(true);
    // If there's a base64 image, we use it, otherwise we keep the existing imageUrl
    const submissionData = { 
        ...data, 
        imageBase64, 
        genre: data.genre.split(',').map(g => g.trim()) 
    };
    if (imageBase64) {
        submissionData.imageUrl = imageBase64;
    }

    await onSave(submissionData);
    setIsSaving(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setImagePreview(null);
      setImageBase64(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{anime ? 'Edit Anime' : 'Add New Anime'}</DialogTitle>
          <DialogDescription>
            {anime ? 'Make changes to the anime details.' : 'Add a new series to the catalog.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="announcement" render={({ field }) => ( <FormItem><FormLabel>Announcement (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="e.g. New season coming soon!" /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="genre" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genres (comma-separated)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField control={form.control} name="rating" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (0-5)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="audience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Kids">Kids</SelectItem>
                          <SelectItem value="Teens">Teens</SelectItem>
                          <SelectItem value="Adults">Adults</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Airing">Airing</SelectItem>
                          <SelectItem value="Finished">Finished</SelectItem>
                          <SelectItem value="Upcoming">Upcoming</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                              value={field.value.startsWith('blob:') || field.value.startsWith('data:') ? '' : field.value}
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
                                    setImagePreview(previewUrl);
                                    const dataUri = await fileToDataUri(file);
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
            <FormField control={form.control} name="trailerUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Trailer URL</FormLabel>
                  <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    