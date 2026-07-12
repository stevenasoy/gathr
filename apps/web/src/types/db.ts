// Hand-written Supabase Database type from the v1–v5 schema. Feeds
// `createClient<Database>(...)` so `.from('venues').select('*')` infers its row.
// Keep in sync with supabase/*.sql. uuid columns type as `string` (supabase-js
// convention), timestamptz/date as `string`, text[] as `string[]`, int as number.
//
// Rows are `type` aliases (not `interface`) so they get an implicit index
// signature and satisfy supabase-js's `Record<string, unknown>` GenericTable.

export type VenueRow = {
  id: string
  owner_id: string
  name: string
  city: string
  area: string | null
  types: string[]
  capacity: number
  price_per_hour: number
  blurb: string | null
  amenities: string[]
  image_urls: string[]
  host_name: string | null
  host_type: string
  price_unit: string
  status: string
  included_hours: number | null
  created_at: string
  updated_at: string
}

export type BookingRow = {
  id: string
  user_id: string
  venue_id: string
  venue_name: string
  event_type: string | null
  event_date: string | null
  hours: number
  guests: number | null
  total_php: number
  status: string
  note: string | null
  created_at: string
  updated_at: string
}

export type ConversationRow = {
  id: string
  venue_id: string
  venue_name: string
  guest_id: string
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  booking_id: string | null
  conversation_id: string | null
  sender_id: string
  body: string
  created_at: string
  updated_at: string
}

export type ReviewRow = {
  id: string
  booking_id: string
  venue_id: string
  user_id: string
  author_name: string
  rating: number
  body: string | null
  created_at: string
  updated_at: string
}

export type SavedVenueRow = {
  user_id: string
  venue_id: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      venues: { Row: VenueRow; Insert: Partial<VenueRow>; Update: Partial<VenueRow>; Relationships: [] }
      bookings: { Row: BookingRow; Insert: Partial<BookingRow>; Update: Partial<BookingRow>; Relationships: [] }
      conversations: { Row: ConversationRow; Insert: Partial<ConversationRow>; Update: Partial<ConversationRow>; Relationships: [] }
      messages: { Row: MessageRow; Insert: Partial<MessageRow>; Update: Partial<MessageRow>; Relationships: [] }
      reviews: { Row: ReviewRow; Insert: Partial<ReviewRow>; Update: Partial<ReviewRow>; Relationships: [] }
      saved_venues: { Row: SavedVenueRow; Insert: Partial<SavedVenueRow>; Update: Partial<SavedVenueRow>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}