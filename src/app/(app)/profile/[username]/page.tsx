"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Calendar, MessageSquare } from 'lucide-react';
import * as api from '@/lib/api';
import type { PublicUser } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const getInitials = (name: string) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '';
};

export default function UserProfilePage() {
    const params = useParams();
    const username = params.username as string;

    const [userProfile, setUserProfile] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (username) {
            setLoading(true);
            api.getUserProfile(username)
                .then(data => {
                    setUserProfile(data);
                })
                .catch(err => {
                    console.error(err);
                    notFound();
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [username]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!userProfile) {
        return notFound();
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-6">
                    <Avatar className="h-24 w-24 text-3xl">
                        <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                        <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                        <h1 className="text-3xl font-bold font-headline">{userProfile.name}</h1>
                        <p className="text-muted-foreground">@{userProfile.username}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground justify-center sm:justify-start">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {format(new Date(userProfile.joined), 'MMMM yyyy')}</span>
                        </div>
                    </div>
                </CardHeader>
                {userProfile.bio && (
                    <CardContent className="pt-0 p-6">
                        <Separator className="mb-4"/>
                        <p className="text-center sm:text-left text-muted-foreground">{userProfile.bio}</p>
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" /> Recent Activity
                    </CardTitle>
                    <CardDescription>
                        {userProfile.comments.length > 0
                            ? "Latest comments from this user."
                            : "This user has not commented yet, or their activity is private."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {userProfile.comments.length > 0 && (
                        <div className="space-y-6">
                            {userProfile.comments.map((comment, index) => (
                                <div key={index} className="flex flex-col">
                                    <p className="text-sm text-muted-foreground">
                                        Commented on{' '}
                                        <Link href={`/anime/${comment.anime_id}`} className="font-semibold text-primary hover:underline">
                                            {comment.anime_title}
                                        </Link>
                                         {' • '} 
                                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                    </p>
                                    <blockquote className="mt-2 pl-4 border-l-2 border-border italic">
                                        {comment.text}
                                    </blockquote>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
