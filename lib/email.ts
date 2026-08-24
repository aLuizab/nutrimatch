// Thin Resend REST client. Without RESEND_API_KEY every send is logged to the console
// instead — dev and CI work with zero e-mail setup, and no notification path ever throws.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'NutriMatch <onboarding@resend.dev>'

  if (!apiKey) {
    console.log(`[email:console-fallback] to=${to} subject="${subject}"`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[email] Resend returned ${res.status} for "${subject}" to ${to}: ${body}`)
  }
}
