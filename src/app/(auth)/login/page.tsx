"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Clapperboard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
        if (user && ['admin', 'co-owner', 'owner'].includes(user.role)) {
            router.push('/admin');
        } else {
            router.push('/');
        }
    }
  }, [isAuthenticated, authLoading, router, user]);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsAccountDisabled(false);
    try {
      await login(email, password);
    } catch (error: any) {
      if (error.message === 'account-disabled') {
        setIsAccountDisabled(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message || 'Invalid email or password. Please try again.',
        });
      }
    } finally {
        setLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Clapperboard className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome to AnimeVerse</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {isAccountDisabled && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Cuenta Deshabilitada</AlertTitle>
              <AlertDescription>
                Tu cuenta ha sido deshabilitada. Si crees que esto es un error, por favor{' '}
                <Link href="/support/account-disabled" className="font-bold underline">
                  contacta a soporte
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@animeverse.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="superadmin123"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
            <p className="text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
