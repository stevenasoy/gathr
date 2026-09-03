// Contact masking for pre-confirmation threads.
//
// Every inquiry and every "requested" booking thread runs through here before
// the message is stored. Phone numbers, emails, links and social handles are
// replaced with a placeholder so a booking that started on Gathr cannot be
// moved to Viber or Messenger before the Host confirms it. Once a booking is
// confirmed the parties can share whatever they like.
//
// The database has the same rules in a BEFORE INSERT trigger
// (supabase/v11-keep-bookings-on-gathr.sql). Keep the two in step: this layer
// exists so the API can tell the client the message was masked; the trigger
// exists so a client talking to Supabase directly gets the same treatment.

export const MASK_PLACEHOLDER = '[hidden until the booking is confirmed]'

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// http(s)://…, www.…, or a bare domain on a common TLD (fb.com/venue, venue.ph).
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[A-Za-z0-9-]+\.(?:com|ph|net|org|co|io|me|link|page|site|app|xyz|info)\b(?:\/\S*)?/gi
// Ten or more digits with at most one separator between each pair (") " after
// an area code counts as one). Catches 0917 123 4567, +63 917-123-4567,
// (02) 8123 4567. Leaves dates (8 digits) and prices (commas are not a
// separator here) alone.
const PHONE_RE = /\+?\(?\d(?:(?:[\s().-]|\)\s)?\d){9,}/g
// @handle, at least 3 chars, not preceded by a word char (emails are gone by now).
const HANDLE_RE = /(?<![\w@])@[A-Za-z0-9_.]{3,}/g

export interface MaskResult {
  body: string
  masked: boolean
}

export function maskContactInfo(body: string): MaskResult {
  let out = body
  let hits = 0
  const swap = (re: RegExp) => {
    out = out.replace(re, () => { hits += 1; return MASK_PLACEHOLDER })
  }
  swap(EMAIL_RE)
  swap(URL_RE)
  swap(PHONE_RE)
  swap(HANDLE_RE)
  return { body: out, masked: hits > 0 }
}

// A thread is "pre-confirmation" while there is no confirmed booking behind it.
// Inquiries (conversation threads) never have one. Booking threads leave this
// state when the Host confirms; declined and cancelled requests stay masked
// because nothing binds the two parties.
export function isPreConfirmation(status: string | null | undefined): boolean {
  return status !== 'confirmed' && status !== 'completed'
}
