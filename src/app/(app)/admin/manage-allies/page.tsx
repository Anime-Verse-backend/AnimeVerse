"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import type { Ally } from '@/lib/types';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlusCircle, Trash, Pencil, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AllyDialog } from '@/components/ally-dialog';

export default function ManageAlliesPage() {
    const [allies, setAllies] = useState<Ally[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAlly, setEditingAlly] = useState<Ally | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [allyToDelete, setAllyToDelete] = useState<Ally | null>(null);
    const { toast } = useToast();

    const fetchAllies = () => {
        setLoading(true);
        api.getAllies()
            .then(data => setAllies(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAllies();
    }, []);

    const handleOpenDialog = (ally: Ally | null = null) => {
        setEditingAlly(ally);
        setIsDialogOpen(true);
    };

    const handleOpenAlert = (ally: Ally) => {
        setAllyToDelete(ally);
        setIsAlertOpen(true);
    };

    const handleSave = async (data: Omit<Ally, 'id'> & { imageBase64?: string | null }) => {
        try {
            if (editingAlly) {
                await api.updateAlly(editingAlly.id, data);
                toast({ title: "Success", description: "Ally updated successfully." });
            } else {
                await api.addAlly(data);
                toast({ title: "Success", description: "Ally added successfully." });
            }
            setIsDialogOpen(false);
            setEditingAlly(null);
            fetchAllies();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: `Failed to save ally: ${error.message}` });
        }
    };

    const handleDelete = async () => {
        if (!allyToDelete) return;
        try {
            await api.deleteAlly(allyToDelete.id);
            setAllies(allies.filter(a => a.id !== allyToDelete.id));
            toast({ title: "Success", description: "Ally deleted successfully." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete ally." });
        } finally {
            setIsAlertOpen(false);
            setAllyToDelete(null);
        }
    };

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Manage Allies</h1>
                    <p className="text-muted-foreground">Add, edit, or delete allies.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Ally
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allies.map(ally => (
                    <Card key={ally.id} className="flex flex-col">
                        <CardHeader className="items-center text-center">
                            <Image src={ally.imageUrl} alt={ally.name} width={80} height={80} className="rounded-full aspect-square object-cover" />
                            <CardTitle className="mt-4">{ally.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow text-center">
                            <p className="text-sm text-muted-foreground">{ally.description}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center">
                           {ally.isFeatured && <Star className="h-5 w-5 text-yellow-400 fill-current" />}
                           <div className="flex gap-2 ml-auto">
                             <Button variant="outline" size="sm" onClick={() => handleOpenDialog(ally)}>
                                <Pencil className="mr-2 h-3 w-3" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleOpenAlert(ally)}>
                                <Trash className="mr-2 h-3 w-3" /> Delete
                            </Button>
                           </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {allies.length === 0 && (
                 <div className="col-span-full py-12 text-center text-muted-foreground">
                    <p>No allies added yet. Click "Add New Ally" to get started.</p>
                </div>
            )}

            <AllyDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                ally={editingAlly}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the ally "{allyToDelete?.name}". This action cannot be undone.
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
