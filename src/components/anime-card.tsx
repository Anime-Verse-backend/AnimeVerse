"use client"

import type { Anime } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { Star } from "lucide-react"

interface AnimeCardProps {
  anime: Anime
}

export function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.id}-${anime.title.toLowerCase().replace(/ /g, '-')}`} className="block h-full group">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 animate-slide-up opacity-0 [--delay:50ms] [animation-fill-mode:forwards] [animation-delay:var(--delay)]">
        <CardHeader className="p-0 overflow-hidden">
          <Image
            src={anime.imageUrl}
            alt={`Poster for ${anime.title}`}
            width={600}
            height={400}
            className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={`${(anime.genres?.[0]?.name || 'anime').toLowerCase()} poster`}
          />
        </CardHeader>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
              <CardTitle className="mb-2 font-headline text-base">{anime.title}</CardTitle>
              <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-bold text-sm text-foreground">{anime.rating}</span>
              </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {(anime.genres || []).map((g) => (
              <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
            ))}
            <Badge variant="outline" className="text-xs">{anime.audience}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
