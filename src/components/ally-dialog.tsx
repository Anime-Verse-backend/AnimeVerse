"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Ally } from '@/lib/types';
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
import { Switch } from './ui/switch';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const socialMediaSchema = z.object({
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    discord: z.string().optional(),
    youtube: z.string().optional(),
}).optional();

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
  imageUrl: z.string().min(1, 'Image is required.'),
  mainUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  socialMedia: socialMediaSchema
});

type FormData = z.infer<typeof FormSchema>;

interface AllyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (ally: Omit<Ally, 'id'> & { imageBase64?: string | null }) => Promise<void>;
  ally: Ally | null;
}

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export function AllyDialog({ isOpen, onOpenChange, onSave, ally }: AllyDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        if (ally) {
            form.reset({
                name: ally.name,
                description: ally.description || '',
                imageUrl: ally.imageUrl,
                mainUrl: ally.mainUrl || '',
                isFeatured: ally.isFeatured || false,
                socialMedia: ally.socialMedia || {}
            });
            setImagePreview(ally.imageUrl);
        } else {
            form.reset({
                name: '',
                description: '',
                imageUrl: 'https://placehold.co/400x400.png',
                mainUrl: '',
                isFeatured: false,
                socialMedia: {}
            });
            setImagePreview('https://placehold.co/400x400.png');
        }
        setImageBase64(null);
    }
  }, [ally, form, isOpen]);

  const handleSubmit = async (data: FormData) => {
    setIsSaving(true);
    await onSave({ ...data, imageBase64 });
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
          <DialogTitle>{ally ? 'Edit Ally' : 'Add New Ally'}</DialogTitle>
          <DialogDescription>
            {ally ? 'Make changes to the ally details.' : 'Add a new ally to the list.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
            
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                    <FormLabel>Image</FormLabel>
                    <div className='flex items-center gap-4'>
                        {imagePreview && <Image src={imagePreview} alt="Preview" width={80} height={80} className="rounded-full aspect-square object-cover" />}
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
                    </div>
                    <FormMessage />
                </FormItem>
            )}/>

            <FormField control={form.control} name="mainUrl" render={({ field }) => ( <FormItem><FormLabel>Main Website URL</FormLabel><FormControl><Input placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
            
            <FormField control={form.control} name="isFeatured" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Featured Ally</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
           
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
