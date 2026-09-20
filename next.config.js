/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

// Next injects inline <script> for hydration/streaming and Tailwind ships inline <style>, so
// 'unsafe-inline' on those two directives is unavoidable without a nonce pipeline. Everything
// that actually stops an attack here is elsewhere: frame-ancestors (clickjacking),
// object-src/base-uri (injection escalation), and a closed default-src.
// 'unsafe-eval' is dev-only — the Next dev bundler needs it, production must not have it.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // res.cloudinary.com serve as fotos de perfil. Sem isto o upload funciona e o navegador
  // recusa a imagem, que é um sintoma difícil de ligar à causa.
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  // Nada é embutido em iframe: o link de pagamento abre em aba própria, no domínio do
  // InfinitePay. Fechar isto evita que uma injeção consiga montar um iframe de phishing.
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Redundant with frame-ancestors for modern browsers, kept for older ones.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

// HSTS only in production: sending it from localhost would pin http://localhost to https in
// the developer's browser and break local dev until they manually clear it.
if (isProd) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  })
}

const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
