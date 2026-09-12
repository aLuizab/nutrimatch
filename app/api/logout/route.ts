import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/jwt'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  // Attributes mirror the ones used when setting the cookie in login/register. Clearing with
  // a different attribute set can leave the original cookie in place in some browsers, and
  // writes a non-secure cookie over HTTPS in the meantime.
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
