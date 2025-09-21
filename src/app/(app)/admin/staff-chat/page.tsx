"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import type { StaffChatMessage } from '@/lib/types';
import * as api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Paperclip, Reply, X, Image as ImageIcon, Trash, Pencil, Check, MessageSquareWarning } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
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

const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


export default function StaffChatPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<StaffChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [replyTo, setReplyTo] = useState<StaffChatMessage | null>(null);
    const [mediaBase64, setMediaBase64] = useState<string | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);

    const [editingMessage, setEditingMessage] = useState<StaffChatMessage | null>(null);
    const [editedText, setEditedText] = useState("");
    const [deletingMessage, setDeletingMessage] = useState<StaffChatMessage | null>(null);

    const fetchMessages = async () => {
        try {
            const fetchedMessages = await api.getStaffChatMessages();
            setMessages(fetchedMessages);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch chat messages.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 15000); // Poll every 15 seconds
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);
    
    const resetForm = () => {
        setEditedText('');
        setReplyTo(null);
        setMediaBase64(null);
        setMediaPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageText = editedText; // Use editedText for both new and edited messages
        if ((!messageText.trim() && !mediaBase64) || isSending) return;

        setIsSending(true);
        try {
            if (editingMessage) {
                const updatedMessage = await api.updateStaffChatMessage(editingMessage.id, messageText);
                 setMessages(messages.map(m => m.id === updatedMessage.id ? updatedMessage : m));
                 setEditingMessage(null);
            } else {
                 const sentMessage = await api.postStaffChatMessage({
                    text: messageText,
                    parentId: replyTo?.id,
                    mediaBase64: mediaBase64,
                });
                setMessages((prev) => [...prev, sentMessage]);
            }
            resetForm();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not send message.',
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async () => {
        if (!deletingMessage) return;
        try {
            await api.deleteStaffChatMessage(deletingMessage.id);
            // Replace message with a deleted marker, or remove it if it has no replies
            const hasReplies = messages.some(m => m.parent?.id === deletingMessage.id);
            if(hasReplies) {
                setMessages(prev => prev.map(m => m.id === deletingMessage.id ? { ...m, isDeleted: true, text: "[deleted]", mediaUrl: undefined } : m));
            } else {
                 setMessages(prev => prev.filter(m => m.id !== deletingMessage.id));
            }
            setDeletingMessage(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not delete message.' });
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setMediaPreview(previewUrl);
            const dataUri = await fileToDataUri(file);
            setMediaBase64(dataUri);
        }
    };

    const handleEditClick = (message: StaffChatMessage) => {
        setEditingMessage(message);
        setEditedText(message.text || '');
        setReplyTo(null);
    }

    const cancelEdit = () => {
        setEditingMessage(null);
        setEditedText("");
    }

    if (loading) {
        return <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
            <header className="border-b p-4">
                <h1 className="text-xl font-bold font-headline">Staff Chat</h1>
                <p className="text-sm text-muted-foreground">Internal communication channel for administrators.</p>
            </header>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div className="p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex items-end gap-3 group",
                                    msg.author?.id === user?.id ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.author?.id !== user?.id && !msg.isDeleted && (
                                     <Link href={`/profile/${msg.author.username}`}>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.author?.avatarUrl} />
                                            <AvatarFallback>{getInitials(msg.author?.name)}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                )}
                                <div className={cn("flex flex-col", msg.author?.id === user?.id ? "items-end" : "items-start")}>
                                     {!editingMessage && !msg.isDeleted && msg.author?.id === user?.id && (
                                        <div className="hidden group-hover:flex mb-1 flex-row-reverse items-center">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditClick(msg)}><Pencil className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingMessage(msg)}><Trash className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(msg)}><Reply className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-xs lg:max-w-md rounded-lg p-3 relative",
                                            msg.author?.id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                                        )}
                                    >
                                        {msg.parent && (
                                            <div className="border-l-2 border-primary-foreground/50 pl-2 mb-2 text-xs opacity-80">
                                                <p className="font-bold">{msg.parent.author.name}</p>
                                                <p className="truncate">{msg.parent.isDeleted ? <i>[deleted]</i> : msg.parent.text}</p>
                                            </div>
                                        )}
                                        {msg.author?.id !== user?.id && !msg.isDeleted && (
                                            <p className="text-xs font-bold mb-1">{msg.author?.name}</p>
                                        )}
                                        {msg.isDeleted ? (
                                            <div className="flex items-center gap-2 italic text-sm opacity-70">
                                                <MessageSquareWarning className="h-4 w-4" />
                                                <span>This message was deleted.</span>
                                            </div>
                                        ) : (
                                            <>
                                                {msg.mediaUrl && <Image src={msg.mediaUrl} alt="chat media" width={300} height={200} className="rounded-md my-2" />}
                                                {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                            </>
                                        )}
                                        <p className={cn("text-xs mt-2 text-right", msg.author?.id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
                                            {format(new Date(msg.timestamp), 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                 {msg.author?.id === user?.id && !msg.isDeleted && (
                                    <Link href={`/profile/${msg.author.username}`}>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.author?.avatarUrl} />
                                            <AvatarFallback>{getInitials(msg.author?.name)}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <footer className="border-t p-4 space-y-2">
                 {editingMessage && (
                    <div className="bg-muted p-2 rounded-lg text-sm flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-primary">Editing message...</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                    </div>
                )}
                {replyTo && !editingMessage && (
                    <div className="bg-muted p-2 rounded-lg text-sm flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-primary">Replying to {replyTo.author?.name}</p>
                            <p className="text-muted-foreground truncate">{replyTo.text}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
                    </div>
                )}
                 {mediaPreview && !editingMessage && (
                    <div className="bg-muted p-2 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { setMediaBase64(null); setMediaPreview(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {!editingMessage && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-5 w-5"/>
                            <span className="sr-only">Attach file</span>
                        </Button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
                        autoComplete="off"
                        disabled={isSending}
                        rows={1}
                        className="resize-none max-h-24"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <Button type="submit" size="icon" disabled={(!editedText.trim() && !mediaBase64) || isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingMessage ? <Check className="h-4 w-4" /> :<Send className="h-4 w-4" />)}
                        <span className="sr-only">Send</span>
                    </Button>
                    {editingMessage && <Button type="button" variant="ghost" size="icon" onClick={cancelEdit}><X className="h-4 w-4"/></Button>}
                </form>
            </footer>

            <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this message. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingMessage(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
