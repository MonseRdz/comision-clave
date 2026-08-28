import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  nombre?: string
  fecha?: string
}

const Email = ({ nombre, fecha }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Correo de prueba — Comprobación Clara</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Correo de prueba</Heading>
        <Text style={text}>{nombre ? `Hola ${nombre},` : 'Hola,'}</Text>
        <Text style={text}>
          Este es un correo de prueba del sistema Comprobación Clara de ADEMEBA para
          confirmar que el dominio de envío entrega correctamente.
        </Text>
        <Section style={box}>
          <Text style={boxText}>
            Enviado: {fecha || 'fecha no disponible'}
          </Text>
        </Section>
        <Text style={footer}>
          Si recibiste este correo por error, puedes ignorarlo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Correo de prueba — Comprobación Clara',
  displayName: 'Correo de prueba',
  previewData: { nombre: 'Contralor', fecha: '28/08/2026 13:24 (CDMX)' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { color: '#08081C', fontSize: '22px' }
const text = { color: '#08081C', fontSize: '14px', lineHeight: '22px' }
const box = { backgroundColor: '#FFF3E6', border: '1px solid #FF8A00', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }
const boxText = { color: '#08081C', fontSize: '13px', margin: '0' }
const footer = { color: '#6b6b7a', fontSize: '12px', marginTop: '24px' }
