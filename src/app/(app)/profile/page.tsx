"use client"

export const dynamic = 'force-dynamic';

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import * as api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2 } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  bio: z.string().max(300, { message: "Bio cannot be longer than 300 characters." }).optional(),
  showActivity: z.boolean().default(true),
})

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
})

const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


export default function ProfilePage() {
  const { user, checkUser, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      bio: "",
      showActivity: true,
    },
  })

  useEffect(() => {
    if(user) {
        setAvatarPreview(user.avatarUrl || null);
        profileForm.reset({
            name: user.name,
            bio: user.bio || "",
            showActivity: user.showActivity,
        });
    }
  }, [user, profileForm]);

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    }
  })

  async function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
    try {
        await api.updateProfile(data);
        await checkUser(); // Re-fetch user data
        toast({
            title: "Profile Updated",
            description: "Your profile information has been saved.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update profile.",
        });
    }
  }

  async function onPasswordSubmit(data: z.infer<typeof passwordFormSchema>) {
     try {
        await api.updatePassword(data.currentPassword, data.newPassword);
        toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
        });
        passwordForm.reset();
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Failed to update password. Check your current password.",
        });
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setIsUploading(true);
      try {
        const base64 = await fileToDataUri(file);
        await api.updateAvatar(base64);
        await checkUser();
        toast({ title: "Avatar Updated", description: "Your new avatar has been saved."});
      } catch (error) {
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not update your avatar." });
        setAvatarPreview(user?.avatarUrl || null); // Revert on failure
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (authLoading || !user) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and public profile.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1">
            <Card>
                <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarPreview || `https://placehold.co/96x96.png`} alt={`@${user?.name}`} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            className="hidden"
                            accept="image/*"
                            disabled={isUploading}
                        />
                        <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            <span className="sr-only">Change photo</span>
                        </Button>
                    </div>
                    <h2 className="text-xl font-bold">{user?.name}</h2>
                    <Link href={`/profile/${user.username}`} className="text-sm text-muted-foreground hover:underline">@{user?.username}</Link>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>This information will be displayed on your public profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField control={profileForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={profileForm.control} name="bio" render={({ field }) => (<FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a little bit about yourself" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={profileForm.control} name="showActivity" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Show Public Activity</FormLabel><FormDescription>Allow other users to see your comments on your profile.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <div className="flex justify-end">
                    <Button type="submit">Save Profile</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your password.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="flex justify-end">
                    <Button type="submit">Update Password</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
