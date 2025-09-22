"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Ally } from '@/lib/types';
import * as api from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Handshake, Link as LinkIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AlliesPage() {
    const [allies, setAllies] = useState<Ally[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAllies()
            .then(data => setAllies(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const featuredAllies = allies.filter(a => a.isFeatured);
    const regularAllies = allies.filter(a => !a.isFeatured);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto max-w-5xl py-8 space-y-12">
            <div>
                <h1 className="text-4xl font-bold font-headline flex items-center gap-3">
                    <Handshake className="h-10 w-10 text-primary" />
                    Our Allies
                </h1>
                <p className="text-lg text-muted-foreground mt-2">Meet the partners and communities that support AnimeVerse.</p>
            </div>

            {featuredAllies.length > 0 && (
                 <div>
                    <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2">
                        <Star className="h-6 w-6 text-yellow-400 fill-current" />
                        Featured Allies
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {featuredAllies.map(ally => (
                            <Card key={ally.id} className="flex flex-col sm:flex-row items-center gap-6 p-6 hover:shadow-lg transition-shadow duration-300">
                                <Image
                                    src={ally.imageUrl}
                                    alt={`Logo of ${ally.name}`}
                                    width={100}
                                    height={100}
                                    className="rounded-full object-cover h-24 w-24 shrink-0"
                                />
                                <div className="text-center sm:text-left">
                                    <CardTitle className="text-xl font-bold">{ally.name}</CardTitle>
                                    <CardDescription className="mt-2">{ally.description}</CardDescription>
                                    <CardFooter className="p-0 mt-4 flex justify-center sm:justify-start">
                                         {ally.mainUrl && (
                                            <Button asChild>
                                                <Link href={ally.mainUrl} target="_blank" rel="noopener noreferrer">
                                                    <LinkIcon className="mr-2 h-4 w-4" />
                                                    Visit Website
                                                </Link>
                                            </Button>
                                         )}
                                    </CardFooter>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            {regularAllies.length > 0 && (
                <div>
                     <h2 className="text-2xl font-bold font-headline mb-4">Allies</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {regularAllies.map(ally => (
                            <Card key={ally.id} className="text-center hover:shadow-lg transition-shadow duration-300">
                                <CardHeader className="items-center">
                                     <Image
                                        src={ally.imageUrl}
                                        alt={`Logo of ${ally.name}`}
                                        width={80}
                                        height={80}
                                        className="rounded-full object-cover h-20 w-20"
                                    />
                                    <CardTitle>{ally.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground min-h-[40px]">{ally.description}</p>
                                </CardContent>
                                <CardFooter className="justify-center">
                                     {ally.mainUrl && (
                                        <Button asChild variant="secondary">
                                            <Link href={ally.mainUrl} target="_blank" rel="noopener noreferrer">
                                                <LinkIcon className="mr-2 h-4 w-4" />
                                                Visit
                                            </Link>
                                        </Button>
                                     )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
