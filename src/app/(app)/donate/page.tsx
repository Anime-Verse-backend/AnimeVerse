"use client"

export const dynamic = 'force-dynamic';

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

// IMPORTANTE: Reemplaza esto con tu email de PayPal o tu Merchant ID.
const PAYPAL_BUSINESS_EMAIL = "your-paypal-email@example.com";

const donationAmounts = [5, 10, 20, 50];

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState(10);

  const getPayPalLink = (amount: number) => {
    if (!PAYPAL_BUSINESS_EMAIL || PAYPAL_BUSINESS_EMAIL === "your-paypal-email@example.com") {
        return "#"; // Return a dead link if the email is not set
    }
    const url = new URL("https://www.paypal.com/donate/");
    url.searchParams.set("business", PAYPAL_BUSINESS_EMAIL);
    url.searchParams.set("amount", amount.toString());
    url.searchParams.set("currency_code", "USD");
    url.searchParams.set("item_name", `Donation to AnimeVerse`);
    url.searchParams.set("no_recurring", "1");
    return url.toString();
  }

  const isPayPalConfigured = PAYPAL_BUSINESS_EMAIL && PAYPAL_BUSINESS_EMAIL !== "your-paypal-email@example.com";

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Apoya a AnimeVerse</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Tu contribución nos ayuda a mantener los servidores funcionando y a seguir trayéndote el mejor anime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPayPalConfigured && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Atención:</strong> La función de donación no está configurada. El desarrollador debe editar el archivo 
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">src/app/(app)/donate/page.tsx</code> 
                y reemplazar el email de PayPal de ejemplo.
            </div>
          )}

          <p className="mb-4 font-semibold">Elige un monto para donar:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {donationAmounts.map(amount => (
              <Button
                key={amount}
                variant="outline"
                className={cn("h-16 text-xl", selectedAmount === amount && "border-2 border-primary ring-2 ring-primary/20")}
                onClick={() => setSelectedAmount(amount)}
              >
                <DollarSign className="h-6 w-6 mr-1" />{amount}
              </Button>
            ))}
          </div>

          <Button 
            asChild
            size="lg" 
            className="w-full text-lg"
            disabled={!isPayPalConfigured}
          >
            <a href={getPayPalLink(selectedAmount)} target="_blank" rel="noopener noreferrer">
              Donar con PayPal
            </a>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Serás redirigido a la página segura de PayPal para completar la transacción.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
