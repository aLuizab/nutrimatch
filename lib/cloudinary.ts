import { createHash } from 'node:crypto'

// Uploads go through the server, never straight from the browser.
//
// Cloudinary supports unsigned browser uploads, which would be less code — and would also mean
// anyone who read the page source could upload anything to this account until the quota ran
// out. Signing here keeps the secret on the server and puts the size and type checks somewhere
// a caller cannot skip.
//
// Same graceful-degradation shape as lib/email.ts and lib/pix-payments.ts: with no credentials
// configured the feature reports itself as unavailable instead of throwing, and the rest of the
// app behaves exactly as it did before photos existed.

const FOLDER = 'nutrimatch/avatars'
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Credentials {
  cloudName: string
  apiKey: string
  apiSecret: string
}

function credentials(): Credentials | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

export function photoUploadsEnabled(): boolean {
  return credentials() !== null
}

/**
 * Cloudinary's signature: the parameters that will be sent, minus file/api_key/resource_type,
 * sorted by name, joined as a query string, with the secret appended, then SHA-1.
 */
function sign(params: Record<string, string>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(canonical + apiSecret).digest('hex')
}

export interface UploadedPhoto {
  url: string
  publicId: string
}

export async function uploadPhoto(file: File, ownerId: string): Promise<UploadedPhoto> {
  const creds = credentials()
  if (!creds) throw new Error('Cloudinary não está configurado')

  const timestamp = Math.floor(Date.now() / 1000).toString()
  // One deterministic public_id per user: a replacement overwrites the previous image instead of
  // piling up a new file on every change, so the account never fills with abandoned avatars.
  const publicId = `${FOLDER}/${ownerId}`
  const signed = { overwrite: 'true', public_id: publicId, timestamp }

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', creds.apiKey)
  for (const [k, v] of Object.entries(signed)) form.append(k, v)
  form.append('signature', sign(signed, creds.apiSecret))

  const res = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const body = (await res.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string; error?: { message?: string } }
    | null

  if (!res.ok || !body?.secure_url || !body.public_id) {
    throw new Error(body?.error?.message ?? `Cloudinary respondeu ${res.status}`)
  }
  return { url: body.secure_url, publicId: body.public_id }
}

export async function deletePhoto(publicId: string): Promise<void> {
  const creds = credentials()
  if (!creds) return

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signed = { public_id: publicId, timestamp }

  const form = new FormData()
  form.append('api_key', creds.apiKey)
  for (const [k, v] of Object.entries(signed)) form.append(k, v)
  form.append('signature', sign(signed, creds.apiSecret))

  const res = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/destroy`, {
    method: 'POST',
    body: form,
  })
  // A failed delete leaves one orphaned file. Worth a log line, never worth failing the request
  // the user actually made.
  if (!res.ok) console.warn('[cloudinary] falha ao apagar', publicId, res.status)
}

/**
 * Cloudinary transforms on delivery, so one stored URL serves every size. Cropping on the face
 * matters here: a square crop of a portrait taken from the centre routinely cuts the head off.
 */
export function avatarUrl(url: string | null | undefined, size = 160): string | null {
  if (!url) return null
  const marker = '/image/upload/'
  const i = url.indexOf(marker)
  if (i < 0) return url
  const transform = `c_fill,g_face,w_${size},h_${size},q_auto,f_auto`
  return url.slice(0, i + marker.length) + transform + '/' + url.slice(i + marker.length)
}
