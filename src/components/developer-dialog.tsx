"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Episode } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, PlusCircle, Trash } from 'lucide-react';
import { Textarea } from './ui/textarea';

const sourceSchema = z.object({
  server: z.string().min(1, 'Server name is required.'),
  url: z.string().min(1, 'URL or IFrame code is required.'),
  language: z.enum(['Subtitled', 'Latin Spanish', 'Castilian', 'English']),
  type: z.enum(['url', 'iframe']),
});

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  duration: z.coerce.number().min(1, 'Duration is required.'),
  synopsis: z.string().optional(),
  sources: z.array(sourceSchema).min(1, 'At least one source is required.'),
  seasonId: z.string().optional(), // Important for creation
});

type FormData = z.infer<typeof FormSchema>;

interface EpisodeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (episode: Partial<Omit<Episode, 'id'>>) => Promise<void>;
  episode: Episode | null;
  seasonId: string | null;
}

export function EpisodeDialog({ isOpen, onOpenChange, onSave, episode, seasonId }: EpisodeDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      duration: 0,
      synopsis: '',
      sources: [],
      seasonId: undefined,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sources"
  });

  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        if (episode) {
            form.reset({
                title: episode.title,
                duration: episode.duration,
                synopsis: episode.synopsis || '',
                sources: episode.sources.map(s => ({ server: s.server, url: s.url, language: s.language, type: s.type || 'url' })),
                seasonId: episode.seasonId,
            });
        } else {
            form.reset({
                title: '',
                duration: 0,
                synopsis: '',
                sources: [{ server: '', language: 'Subtitled', url: '', type: 'url' }],
                seasonId: seasonId || undefined
            });
        }
    }
  }, [episode, isOpen, form, seasonId]);

  const handleSubmit = async (data: FormData) => {
    setIsSaving(true);
    await onSave(data);
    setIsSaving(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{episode ? 'Edit Episode' : 'Add New Episode'}</DialogTitle>
          <DialogDescription>
             {episode ? 'Make changes to the episode details below.' : 'Add a new episode to the season.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (min)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

             <FormField control={form.control} name="synopsis" render={({ field }) => (
                <FormItem>
                  <FormLabel>Synopsis</FormLabel>
                  <FormControl><Textarea placeholder="Episode synopsis..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            
            <div className="space-y-4">
              <FormLabel>Sources</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-3 rounded-lg relative">
                   <Button variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-6 w-6">
                        <Trash className="h-4 w-4 text-destructive" />
                   </Button>
                   <FormField
                    control={form.control}
                    name={`sources.${index}.server`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Server</FormLabel>
                        <FormControl><Input placeholder="e.g., PixelStream" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`sources.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="iframe">IFrame</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`sources.${index}.url`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">URL or IFrame Code</FormLabel>
                        <FormControl><Textarea placeholder="https://... or <iframe ...>" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`sources.${index}.language`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Language</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Subtitled">Subtitled</SelectItem>
                              <SelectItem value="Latin Spanish">Latin Spanish</SelectItem>
                              <SelectItem value="Castilian">Castilian</SelectItem>
                              <SelectItem value="English">English</SelectItem>
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ server: '', url: '', language: 'Subtitled', type: 'url' })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>\n                {isSaving && <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />}\n                Save Changes\n              </Button>\n            </DialogFooter>\n          </form>\n        </Form>\n      </DialogContent>\n    </Dialog>\n  );\n}\n