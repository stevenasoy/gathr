import { createUserSupabase } from './supabase'

const BUCKET = 'venue-photos'
const MAX_MB = 5

// Uploads one image to the venue-photos bucket under the user's folder
// (RLS requires the first path segment to be auth.uid()) and returns its
// public URL, so it can live in venues.image_urls like any pasted link.
export async function uploadVenuePhoto(
  file: File,
  userId: string,
): Promise<{ url: string | null; error: { message: string } | null }> {
  let supabase
  try { supabase = createUserSupabase() } catch { return { url: null, error: { message: 'Please sign in before uploading photos.' } }
  }
  if (!file.type.startsWith('image/')) return { url: null, error: { message: `${file.name} isn't an image.` } }
  if (file.size > MAX_MB * 1024 * 1024) return { url: null, error: { message: `${file.name} is over ${MAX_MB}MB. Resize it and try again.` } }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
  })
  if (error) return { url: null, error: { message: error.message } }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
