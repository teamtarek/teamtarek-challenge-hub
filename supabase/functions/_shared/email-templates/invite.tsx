/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Du wurdest zu Team Tarek eingeladen!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>TEAM TAREK</Text>
        <Heading style={h1}>Du bist eingeladen! 🎉</Heading>
        <Text style={text}>
          Du wurdest eingeladen, Teil von{' '}
          <Link href={siteUrl} style={link}>
            <strong>Team Tarek</strong>
          </Link>{' '}
          zu werden. Klicke auf den Button, um die Einladung anzunehmen.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Einladung annehmen
        </Button>
        <Text style={footer}>
          Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.
        </Text>
        <Text style={footerBrand}>Team Tarek</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = {
  fontSize: '13px',
  fontWeight: '700' as const,
  color: '#c8872b',
  letterSpacing: '2px',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#555555',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const link = { color: '#c8872b', textDecoration: 'underline' }
const button = {
  backgroundColor: '#c8872b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
const footerBrand = { fontSize: '12px', color: '#c8872b', fontWeight: '600' as const, margin: '8px 0 0' }
