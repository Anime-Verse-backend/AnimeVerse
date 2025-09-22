"use client"

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your account and site preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your current plan and billing details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start justify-between rounded-lg border p-4">
            <div className="space-y-1.5 mb-4 sm:mb-0">
                <Label className="text-base flex items-center gap-2"> 
                    Your Plan: 
                    <Badge>Free Tier</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                    Limited access with ads. Upgrade for the full experience.
                </p>
            </div>
            <Button>
                <Star className="mr-2 h-4 w-4" />
                Upgrade to Premium
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Premium Plan Benefits</h3>
            <ul className="mt-4 space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Watch everything ad-free.</span>
                </li>
                 <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Access the full catalog in Full HD (1080p).</span>
                </li>
                 <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Get new episodes right after they air in Japan.</span>
                </li>
                 <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Support the anime industry.</span>
                </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="theme-toggle" className="text-base">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select a light or dark theme for the interface.
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="space-y-2 pt-4">
            <Label className="text-base">Language</Label>
            <p className="text-sm text-muted-foreground">
              Changing the language is a complex feature that will be implemented in a future update.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
