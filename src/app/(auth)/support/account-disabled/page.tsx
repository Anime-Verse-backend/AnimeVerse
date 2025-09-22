"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShieldAlert, LifeBuoy } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce una dirección de correo válida." }),
  message: z.string().min(10, { message: "El mensaje debe tener al menos 10 caracteres." }),
})

export default function DisabledAccountSupportPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      message: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      const response = await api.submitDisabledAccountTicket(values.email, values.message)
      toast({
        title: "Mensaje Enviado",
        description: response.message,
      })
      setSubmitted(true)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo enviar tu mensaje.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <ShieldAlert className="h-6 w-6 text-destructive" /> Soporte para Cuenta Deshabilitada
          </CardTitle>
          <CardDescription>
            {submitted
              ? "Gracias por contactarnos. Revisaremos tu caso y nos pondremos en contacto contigo pronto."
              : "Entendemos que esto puede ser frustrante. Por favor, proporciona tu correo y explica por qué crees que tu cuenta fue deshabilitada por error."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center">
              <p className="text-muted-foreground">
                Tu ticket de soporte ha sido creado.
              </p>
              <Button asChild className="mt-4">
                <Link href="/login">Volver a la página principal</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tu Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="el correo de tu cuenta deshabilitada" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="Explica tu situación aquí..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Enviar Solicitud
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
