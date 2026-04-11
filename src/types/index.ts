export type Tenant = {
  id: string
  business_name: string
  owner_name: string
  email: string
  phone: string | null
  plan: 'essencial' | 'plus' | 'premium'
  status: 'active' | 'inactive' | 'trial' | 'cancelled'
  auth_user_id: string | null
  site_domain: string | null
  site_color: string
  monthly_amount: number | null
  last_payment_at: string | null
  next_payment_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Property = {
  id: string
  tenant_id: string | null
  name: string
  slug: string
  description: string | null
  max_guests: number
  base_price_weekday: number
  base_price_weekend: number
  single_night_weekday_price: number | null
  min_nights_weekend: number
  min_nights_weekday: number
  whatsapp: string | null
  checkin_time: string
  checkout_time: string
  checkin_instructions: string | null
  latitude: number | null
  longitude: number | null
  instagram: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  property_id: string
  guest_name: string
  guest_phone: string
  guest_email: string | null
  check_in: string
  check_out: string
  guests_count: number
  total_amount: number
  deposit_amount: number
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'
  payment_status: 'awaiting_deposit' | 'deposit_paid' | 'fully_paid' | 'refunded'
  mp_preference_id: string | null
  mp_payment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  properties?: { name: string; slug: string }
}

export type BlockedDate = {
  id: string
  property_id: string
  date: string
  reason: string | null
  created_at: string
}

export type PricingRule = {
  id: string
  property_id: string
  label: string
  price: number
  valid_from: string
  valid_until: string
}
