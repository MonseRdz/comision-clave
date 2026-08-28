import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

// Server function: envía el correo de prueba. Solo el Contralor puede invocarlo.
export const enviarCorreoPrueba = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        destinatario: z.string().email(),
        nombre: z.string().max(120).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any

    const { data: esContralor } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'contralor',
    })
    if (!esContralor) {
      throw new Error('Solo el Contralor puede enviar correos de prueba')
    }

    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
    return sendTemplateEmail('correo-prueba', data.destinatario, {
      templateData: { nombre: data.nombre, fecha: `${fecha} (CDMX)` },
      idempotencyKey: `correo-prueba-${userId}-${Date.now()}`,
    })
  })
