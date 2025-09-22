"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Developer } from '@/lib/types';
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
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const socialMediaSchema = z.object({
    github: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
}).optional();

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  role: z.string().min(1, 'Role is required.'),
  imageUrl: z.string().min(1, 'Image is required.'),
  socialMedia: socialMediaSchema
});

type FormData = z.infer<typeof FormSchema>;

interface DeveloperDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (developer: Omit<Developer, 'id'> & { imageBase64?: string | null }) => Promise<void>;
  developer: Developer | null;
}

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export function DeveloperDialog({ isOpen, onOpenChange, onSave, developer }: DeveloperDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        if (developer) {
            form.reset({
                name: developer.name,
                role: developer.role,
                imageUrl: developer.imageUrl,
                socialMedia: developer.socialMedia || {}
            });
            setImagePreview(developer.imageUrl);
        } else {
            form.reset({
                name: '',
                role: '',
                imageUrl: 'https://placehold.co/400x400.png',
                socialMedia: {}
            });
            setImagePreview('https://placehold.co/400x400.png');
        }
        setImageBase64(null);
    }
  }, [developer, form, isOpen]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{developer ? 'Edit Developer' : 'Add New Developer'}</DialogTitle>
          <DialogDescription>
            {developer ? 'Make changes to the developer profile.' : 'Add a new developer to the team list.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><FormControl><Input placeholder="e.g., Lead Developer" {...field} /></FormControl><FormMessage /></FormItem> )} />
            
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                    <FormLabel>Image</FormLabel>
                    <div className='flex items-center gap-4'>
                        {imagePreview && <Image src={imagePreview} alt="Preview" width={60} height={60} className="rounded-full aspect-square object-cover" />}
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

            <h3 className="text-sm font-medium pt-2">Social Media (Optional)</h3>
            <FormField control={form.control} name="socialMedia.github" render={({ field }) => ( <FormItem><FormLabel className="text-xs">GitHub</FormLabel><FormControl><Input placeholder="https://github.com/..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="socialMedia.linkedin" render={({ field }) => ( <FormItem><FormLabel className="text-xs">LinkedIn</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="socialMedia.twitter" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Twitter / X</FormLabel><FormControl><Input placeholder="https://x.com/..." {...field} /></FormControl><FormMessage /></FormItem> )} />
           
            <DialogFooter className="pt-4">
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
