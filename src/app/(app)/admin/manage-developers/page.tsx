"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import type { Developer } from '@/lib/types';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlusCircle, Trash, Pencil, Loader2, Code, Github, Linkedin, Twitter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { DeveloperDialog } from '@/components/developer-dialog';
import Link from 'next/link';

export default function ManageDevelopersPage() {
    const [developers, setDevelopers] = useState<Developer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [developerToDelete, setDeveloperToDelete] = useState<Developer | null>(null);
    const { toast } = useToast();

    const fetchDevelopers = () => {
        setLoading(true);
        api.getDevelopers()
            .then(data => setDevelopers(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDevelopers();
    }, []);

    const handleOpenDialog = (dev: Developer | null = null) => {
        setEditingDeveloper(dev);
        setIsDialogOpen(true);
    };

    const handleOpenAlert = (dev: Developer) => {
        setDeveloperToDelete(dev);
        setIsAlertOpen(true);
    };

    const handleSave = async (data: Omit<Developer, 'id'> & { imageBase64?: string | null }) => {
        try {
            if (editingDeveloper) {
                await api.updateDeveloper(editingDeveloper.id, data);
                toast({ title: "Success", description: "Developer updated successfully." });
            } else {
                await api.addDeveloper(data);
                toast({ title: "Success", description: "Developer added successfully." });
            }
            setIsDialogOpen(false);
            setEditingDeveloper(null);
            fetchDevelopers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: `Failed to save developer: ${error.message}` });
        }
    };

    const handleDelete = async () => {
        if (!developerToDelete) return;
        try {
            await api.deleteDeveloper(developerToDelete.id);
            setDevelopers(developers.filter(a => a.id !== developerToDelete.id));
            toast({ title: "Success", description: "Developer deleted successfully." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete developer." });
        } finally {
            setIsAlertOpen(false);
            setDeveloperToDelete(null);
        }
    };
    
    const socialIcons = {
        github: <Github className="h-5 w-5" />,
        linkedin: <Linkedin className="h-5 w-5" />,
        twitter: <Twitter className="h-5 w-5" />,
    }

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Code /> Manage Developers</h1>
                    <p className="text-muted-foreground">Add, edit, or delete developer profiles.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Developer
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {developers.map(dev => (
                    <Card key={dev.id} className="flex flex-col text-center">
                        <CardHeader className="items-center">
                            <Image src={dev.imageUrl} alt={dev.name} width={96} height={96} className="rounded-full aspect-square object-cover border-4 border-muted" />
                            <CardTitle className="mt-4">{dev.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-primary">{dev.role}</p>
                            <div className="flex justify-center gap-1 mt-2">
                                {dev.socialMedia && Object.entries(dev.socialMedia).map(([key, url]) => (
                                    socialIcons[key as keyof typeof socialIcons] && url && (
                                        <Button asChild key={key} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                            <Link href={url} target="_blank" rel="noopener noreferrer" aria-label={`${dev.name}'s ${key}`}>
                                                {socialIcons[key as keyof typeof socialIcons]}
                                            </Link>
                                        </Button>
                                    )
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-center gap-2">
                           <Button variant="outline" size="sm" onClick={() => handleOpenDialog(dev)}>
                              <Pencil className="mr-2 h-3 w-3" /> Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleOpenAlert(dev)}>
                              <Trash className="mr-2 h-3 w-3" /> Delete
                          </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {developers.length === 0 && (
                 <div className="col-span-full py-12 text-center text-muted-foreground">
                    <p>No developers added yet. Click "Add New Developer" to get started.</p>
                </div>
            )}

            <DeveloperDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                developer={editingDeveloper}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the developer profile for "{developerToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
