"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Loader2, KeyRound } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
})

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) {
      setError("Token no encontrado. Por favor, solicita un nuevo enlace.");
      return;
    }
    setLoading(true)
    setError(null)
    try {
      const response = await api.resetPassword(token, values.password)
      toast({
        title: "Éxito",
        description: response.message,
      })
      router.push("/login")
    } catch (err: any) {
      const errorMessage = err.message || "Ocurrió un error al restablecer la contraseña.";
      setError(errorMessage);
      toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
      });
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center text-destructive">
        <p>Token de recuperación inválido o no proporcionado.</p>
        <Button asChild variant="link">
          <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva Contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Nueva Contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Restablecer Contraseña
        </Button>
      </form>
    </Form>
  )
}


export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <KeyRound className="h-6 w-6" /> Restablecer Contraseña
          </CardTitle>
          <CardDescription>
            Introduce tu nueva contraseña a continuación.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <ResetPasswordForm />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
