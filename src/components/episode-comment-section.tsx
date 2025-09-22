"use client";

import { useState, useEffect, useRef } from 'react';
import type { EpisodeComment as CommentType, User } from '@/lib/types';
import * as api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { Trash, Reply, X, Paperclip, Pencil, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
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

interface EpisodeCommentSectionProps {
  initialComments: CommentType[];
  episodeId: string;
}

const getInitials = (name?: string) => {
  if (typeof name !== 'string' || !name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const isAdminRole = (role?: User['role']) => {
    if (!role) return false;
    return ['owner', 'co-owner', 'admin'].includes(role);
}

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const Comment = ({ comment, onReply, onDelete, onEdit }: { comment: CommentType, onReply: (c: CommentType) => void, onDelete: (id: string) => void, onEdit: (c: CommentType) => void }) => {
    const { user } = useAuth();
    
    return (
        <div className="flex items-start gap-4">
            <Link href={`/profile/${comment.author?.username}`}>
                <Avatar>
                    <AvatarImage src={comment.author?.avatarUrl || `https://placehold.co/40x40.png`} alt={`@${comment.author?.name}`} />
                    <AvatarFallback>{getInitials(comment.author?.name)}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/profile/${comment.author?.username}`}>
                      <p className="font-semibold hover:underline">{comment.author?.name}</p>
                    </Link>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                    </span>
                </div>
                {comment.parent && (
                    <p className="text-xs text-muted-foreground italic mt-1">
                        Replying to {comment.parent.author?.name}
                    </p>
                )}
                {comment.isDeleted ? (
                    <p className="mt-1 text-sm italic text-muted-foreground">[deleted]</p>
                ) : (
                    <>
                        {comment.text && <p className="mt-1 text-sm text-foreground/90 pr-4">{comment.text}</p>}
                        {comment.mediaUrl && <Image src={comment.mediaUrl} alt="Comment media" width={200} height={150} className="mt-2 rounded-md" />}
                    </>
                )}
                
                <div className="flex items-center gap-2 mt-2">
                    {!comment.isDeleted && user && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => onReply(comment)} className="text-xs">
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                        </Button>
                        {(user.id === comment.author?.id || isAdminRole(user.role)) && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => onEdit(comment)} className="text-xs">
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => onDelete(comment.id)}>
                                <Trash className="h-3 w-3 mr-1" />
                                Delete
                            </Button>
                          </>
                        )}
                      </>
                    )}
                </div>

                {comment.replies && comment.replies.length > 0 && (
                     <div className="mt-4 pl-4 border-l-2 border-muted-foreground/20 space-y-4">
                        {comment.replies.map(reply => (
                            <Comment key={reply.id} comment={reply} onReply={onReply} onDelete={onDelete} onEdit={onEdit} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export function EpisodeCommentSection({ initialComments, episodeId }: EpisodeCommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentType[]>(initialComments);
  const [newCommentText, setNewCommentText] = useState('');
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommentType | null>(null);
  const [editingComment, setEditingComment] = useState<CommentType | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (editingComment) {
        setNewCommentText(editingComment.text || '');
        setReplyTo(null);
        setMediaBase64(null);
        setMediaPreview(null);
        textareaRef.current?.focus();
    }
  }, [editingComment]);

  const resetForm = () => {
    setNewCommentText('');
    setMediaBase64(null);
    setMediaPreview(null);
    setReplyTo(null);
    setEditingComment(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newCommentText.trim() && !mediaBase64) || !user) return;

    try {
        if(editingComment) {
            const updated = await api.updateEpisodeComment(episodeId, editingComment.id, newCommentText);
            const updateInState = (list: CommentType[]): CommentType[] => {
                return list.map(c => {
                    if (c.id === updated.id) return { ...c, text: updated.text };
                    if (c.replies) return { ...c, replies: updateInState(c.replies) };
                    return c;
                });
            };
            setComments(prev => updateInState(prev));
            toast({ title: "Comment updated" });
        } else {
            const addedComment = await api.addEpisodeComment(episodeId, { 
                text: newCommentText, 
                parentId: replyTo?.id,
                mediaBase64: mediaBase64 
            });
            const addReplyToComment = (comments: CommentType[], parentId: string, reply: CommentType): CommentType[] => {
                return comments.map(c => {
                    if (c.id === parentId) {
                        const newReplies = [...(c.replies || []), reply];
                        return { ...c, replies: newReplies };
                    }
                    if (c.replies) {
                        return { ...c, replies: addReplyToComment(c.replies, parentId, reply) };
                    }
                    return c;
                });
            };
            if(replyTo) {
                setComments(prev => addReplyToComment(prev, replyTo.id, addedComment));
            } else {
                setComments(prev => [addedComment, ...prev]);
            }
        }
      resetForm();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to post comment.' });
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingCommentId) return;
    try {
        await api.deleteEpisodeComment(episodeId, deletingCommentId);
        const removeOrMarkComment = (list: CommentType[]): CommentType[] => {
            return list.reduce((acc, c) => {
                if (c.id === deletingCommentId) {
                    if (c.replies && c.replies.length > 0) {
                        acc.push({ ...c, text: '[deleted]', isDeleted: true, mediaUrl: undefined });
                    }
                } else {
                    if(c.replies) c.replies = removeOrMarkComment(c.replies);
                    acc.push(c);
                }
                return acc;
            }, [] as CommentType[]);
        };
        setComments(prev => removeOrMarkComment(prev));
        toast({ title: "Comment Deleted" });
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete comment.' });
    } finally {
        setDeletingCommentId(null);
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setMediaPreview(URL.createObjectURL(file));
        const dataUri = await fileToDataUri(file);
        setMediaBase64(dataUri);
    }
  };

  const topLevelComments = comments.filter(c => !c.parent);

  return (
    <>
    <div className="py-4">
      {user && (
        <form onSubmit={handleCommentSubmit} className="mb-6 space-y-4">
          <div className="flex gap-4">
            <Link href={`/profile/${user.username}`}>
              <Avatar>
                <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png`} alt={`@${user.name}`} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="w-full">
              {replyTo && (
                  <div className="text-sm bg-muted p-2 rounded-t-md flex justify-between items-center">
                      <p className="text-muted-foreground">Replying to <span className="font-semibold text-foreground">{replyTo.author?.name}</span></p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={resetForm}><X className="h-3 w-3" /></Button>
                  </div>
              )}
               {editingComment && (
                  <div className="text-sm bg-muted p-2 rounded-t-md flex justify-between items-center">
                      <p className="font-semibold text-primary">Editing comment...</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={resetForm}><X className="h-3 w-3" /></Button>
                  </div>
              )}
              <Textarea
                ref={textareaRef}
                placeholder="Share your thoughts on this episode..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className={cn((replyTo || editingComment) && "rounded-t-none")}
                rows={3}
              />
               {mediaPreview && (
                  <div className="mt-2 p-2 border rounded-lg relative w-fit">
                      <Image src={mediaPreview} alt="media preview" width={100} height={100} className="rounded-md" />
                      <Button variant="destructive" size="icon" className="h-6 w-6 absolute top-1 right-1" onClick={() => { setMediaBase64(null); setMediaPreview(null); }}>
                          <X className="h-4 w-4" />
                      </Button>
                  </div>
               )}
            </div>
          </div>
          <div className="flex justify-between items-center ml-14">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={!!editingComment}>
               <Paperclip className="h-5 w-5" />
            </Button>
            <Button type="submit" disabled={!newCommentText.trim() && !mediaBase64}>
              {editingComment ? <><Check className="mr-2 h-4 w-4"/>Save</> : "Post Comment"}
            </Button>
          </div>
        </form>
      )}
      <Separator className="mb-6" />
      <div className="space-y-6">
        {topLevelComments.length > 0 ? (
          topLevelComments.map(comment => (
            <Comment key={comment.id} comment={comment} onReply={setReplyTo} onDelete={setDeletingCommentId} onEdit={setEditingComment} />
          ))
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
    <AlertDialog open={!!deletingCommentId} onOpenChange={(open) => !open && setDeletingCommentId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this comment.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
