"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export function AdBanner() {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Advertisement</p>
        </div>
        <div className="h-24 w-full bg-muted flex items-center justify-center rounded-md">
            {/* 
              AQUÍ ES DONDE PEGAS TU CÓDIGO DE ANUNCIO.
              Por ejemplo, el código que te da Google AdSense.
              Reemplaza el <p> de abajo con tu código.
            */}
            <p className="text-sm text-muted-foreground">Your Ad Code (e.g., from AdSense) Goes Here</p>
        </div>
      </CardContent>
    </Card>
  )
}
