"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <AlertTriangle className="h-16 w-16 text-primary mb-4 animate-bounce" />
      <h1 className="text-4xl md:text-6xl font-bold font-headline mb-2">404</h1>
      <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">Página no Encontrada</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        ¡Ups! Parece que te has perdido en el universo. La página que buscas no existe o ha sido movida a otra galaxia.
      </p>
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Volver al Inicio
        </Link>
      </Button>
    </div>
  );
}
