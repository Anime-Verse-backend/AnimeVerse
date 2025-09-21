"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce una dirección de correo válida." }),
})

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      const response = await api.forgotPassword(values.email)
      toast({
        title: "Petición Enviada",
        description: response.message,
      })
      setSubmitted(true)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo procesar la solicitud.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Mail className="h-6 w-6" /> Recuperar Contraseña
          </CardTitle>
          <CardDescription>
            {submitted
              ? "Revisa tu bandeja de entrada (y la carpeta de spam) para continuar."
              : "Introduce tu correo electrónico para recibir un enlace y restablecer tu contraseña."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center">
              <Button asChild className="mt-4">
                <Link href="/login">Volver a Iniciar Sesión</Link>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Enlace de Recuperación
                </Button>
              </form>
            </Form>
          )}
           <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:underline">
                Volver a Iniciar Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
