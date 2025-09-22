"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Developer } from '@/lib/types';
import * as api from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Code, Github, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DevelopersPage() {
    const [developers, setDevelopers] = useState<Developer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getDevelopers()
            .then(data => setDevelopers(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const socialIcons = {
        github: <Github className="h-5 w-5" />,
        linkedin: <Linkedin className="h-5 w-5" />,
        twitter: <Twitter className="h-5 w-5" />,
    }

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto max-w-5xl py-8 space-y-12">
            <div>
                <h1 className="text-4xl font-bold font-headline flex items-center gap-3">
                    <Code className="h-10 w-10 text-primary" />
                    Our Developers
                </h1>
                <p className="text-lg text-muted-foreground mt-2">Meet the team behind AnimeVerse.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {developers.map(dev => (
                    <Card key={dev.id} className="text-center hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
                        <CardHeader className="items-center p-6">
                             <Image
                                src={dev.imageUrl}
                                alt={`Photo of ${dev.name}`}
                                width={120}
                                height={120}
                                className="rounded-full object-cover h-32 w-32 border-4 border-primary/20"
                            />
                        </CardHeader>
                        <CardContent className="px-6">
                            <CardTitle className="text-2xl font-bold">{dev.name}</CardTitle>
                            <p className="text-primary font-semibold mt-1">{dev.role}</p>
                        </CardContent>
                        <CardFooter className="justify-center p-6 gap-2">
                             {dev.socialMedia && Object.entries(dev.socialMedia).map(([key, url]) => (
                                socialIcons[key as keyof typeof socialIcons] && url && (
                                    <Button asChild key={key} variant="ghost" size="icon">
                                        <Link href={url} target="_blank" rel="noopener noreferrer" aria-label={`${dev.name}'s ${key}`}>
                                            {socialIcons[key as keyof typeof socialIcons]}
                                        </Link>
                                    </Button>
                                )
                             ))}
                        </CardFooter>
                    </Card>
                ))}
            </div>

             {developers.length === 0 && (
                <div className="col-span-full py-24 text-center text-muted-foreground">
                    <p>Information about the developers is not available at the moment.</p>
                </div>
            )}
        </div>
    );
}
