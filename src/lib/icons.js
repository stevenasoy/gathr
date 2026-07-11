// Explicit icon maps so lucide-react stays tree-shakeable.
// `import * as Icons` + dynamic access defeats tree shaking and ships the
// entire icon library (~1,500 icons) in the bundle — never do that.
// New category/amenity icons must be added here by hand.
import {
  Sparkles, Heart, Briefcase, PartyPopper, Presentation, Building2,
  Camera, Trees, Frame, UtensilsCrossed, Waves,
  Volume2, MonitorPlay, CircleParking, Snowflake, Accessibility,
  DoorOpen, Wine, Wifi, Drama, UserCheck, CheckCircle2,
} from 'lucide-react'

// Keyed by the `icon` names in data/categories.js
const CATEGORY_ICONS = {
  Sparkles, Heart, Briefcase, PartyPopper, Presentation, Building2,
  Camera, Trees, Frame, UtensilsCrossed, Waves,
}

// Keyed by amenity label (see AMENITIES in data/categories.js)
const AMENITY_ICONS = {
  'In-house catering': UtensilsCrossed,
  'Sound system': Volume2,
  'Projector + screen': MonitorPlay,
  'Free parking': CircleParking,
  'Air-conditioned': Snowflake,
  'Wheelchair access': Accessibility,
  'Bridal / green room': DoorOpen,
  'Bar service': Wine,
  'Outdoor space': Trees,
  'Wi-Fi': Wifi,
  'Stage / platform': Drama,
  'On-site coordinator': UserCheck,
}

export const categoryIcon = (name) => CATEGORY_ICONS[name] || Sparkles
export const amenityIcon = (label) => AMENITY_ICONS[label] || CheckCircle2
