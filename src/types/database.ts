export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus =
  | 'pending_payment'
  | 'pending_owner_approval'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_customer'
  | 'cancelled_by_owner'
  | 'expired'
  | 'rejected'
  | 'owner_review_timed_out';

export type UserRole = 'customer' | 'owner' | 'admin';

export type VenueUnitType =
  | 'women_section'
  | 'men_section'
  | 'dining_hall'
  | 'full_venue'
  | 'chalet_unit';

export type VenueMemberRole =
  | 'primary_owner'
  | 'co_owner'
  | 'manager'
  | 'receptionist';

export type CurrencyType = 'YER' | 'SAR' | 'USD';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VenueCategory {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Venue {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  district: string;
  address_details: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string;
  contact_whatsapp: string | null;
  status: 'draft' | 'pending_verification' | 'active' | 'suspended' | 'archived';
  cancellation_policy_id: string | null;
  default_currency: CurrencyType;
  default_deposit_percentage: number;
  has_multiple_units: boolean;
  featured: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueUnit {
  id: string;
  venue_id: string;
  name: string;
  unit_type: VenueUnitType;
  capacity_min: number;
  capacity_max: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  idempotency_key: string | null;
  venue_id: string;
  customer_id: string | null;
  booking_source: 'online' | 'manual_owner';
  is_full_venue: boolean;
  event_type: 'wedding' | 'engagement' | 'seminar' | 'family_gathering' | 'recreation' | 'other';
  guest_count: number;
  event_date: string;
  shift: 'morning' | 'evening' | 'full_day';
  time_slot: string; // TSTZRANGE
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  currency: CurrencyType;
  cancellation_policy_snapshot: Json;
  customer_notes: string | null;
  owner_private_notes: string | null;
  expires_at: string | null;
  owner_review_expires_at: string | null;
  admin_escalation_expires_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingSlot {
  id: string;
  booking_id: string;
  venue_id: string;
  unit_id: string;
  time_slot: string;
  status: BookingStatus;
  created_at: string;
}

export interface BookingRequestedUnit {
  id: string;
  booking_id: string;
  venue_id: string;
  unit_id: string;
  created_at: string;
}

export interface BookingPriceItem {
  id: string;
  booking_id: string;
  item_type: 'unit_rate' | 'full_venue_rate' | 'extra_service' | 'discount' | 'custom_override';
  description_ar: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  currency: CurrencyType;
  created_at: string;
}

export interface CancellationPolicy {
  id: string;
  name_ar: string;
  description_ar: string;
  rules: Json;
  created_at: string;
}

export interface VenueMember {
  id: string;
  venue_id: string;
  user_id: string;
  role: VenueMemberRole;
  permissions: Json;
  created_at: string;
}

export interface VenueAvailability {
  id: string;
  venue_id: string;
  unit_id: string | null;
  override_date: string;
  shift: 'morning' | 'evening' | 'full_day';
  is_blocked: boolean;
  block_reason: string | null;
  custom_price: number | null;
  currency: CurrencyType;
  created_by: string | null;
  created_at: string;
}

export interface PricingTier {
  id: string;
  venue_id: string;
  unit_id: string | null;
  shift: 'morning' | 'evening' | 'full_day';
  day_of_week: number | null;
  is_seasonal: boolean;
  season_start: string | null;
  season_end: string | null;
  price: number;
  currency: CurrencyType;
  created_at: string;
}

export interface Amenity {
  id: string;
  slug: string;
  name_ar: string;
  icon_name: string | null;
  category: 'general' | 'entertainment' | 'hospitality';
  created_at: string;
}

export interface VenueAmenity {
  venue_id: string;
  amenity_id: string;
  is_free: boolean;
  additional_price: number;
  currency: CurrencyType;
  created_at: string;
}

export interface BookingGuestDetail {
  booking_id: string;
  guest_name: string;
  guest_phone: string;
  notes: string | null;
  created_at: string;
}

export interface BookingExtra {
  id: string;
  booking_id: string;
  amenity_id: string | null;
  name_ar: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  currency: CurrencyType;
  created_at: string;
}

export interface BookingAuditLog {
  id: string;
  booking_id: string;
  actor_id: string | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  action_description: string;
  payload: Json;
  created_at: string;
}

export interface CreateBookingWithSlotsParams {
  p_venue_id: string;
  p_booking_source: 'online' | 'manual_owner';
  p_is_full_venue: boolean;
  p_requested_unit_ids: string[];
  p_event_type: 'wedding' | 'engagement' | 'seminar' | 'family_gathering' | 'recreation' | 'other';
  p_guest_count: number;
  p_event_date: string;
  p_shift: 'morning' | 'evening' | 'full_day';
  p_time_slot: string; // TSTZRANGE
  p_idempotency_key?: string | null;
  p_customer_notes?: string | null;
  p_guest_details?: {
    guest_name: string;
    guest_phone: string;
    notes?: string | null;
  } | null;
  p_extras?: Array<{
    amenity_id: string;
    quantity: number;
  }>;
}

export interface ManageVenueUnitParams {
  p_venue_id: string;
  p_unit_id?: string | null;
  p_action: 'CREATE' | 'UPDATE_INFO' | 'ACTIVATE' | 'DEACTIVATE' | 'SOFT_DELETE';
  p_name?: string | null;
  p_unit_type?: VenueUnitType | null;
  p_capacity_min?: number | null;
  p_capacity_max?: number | null;
}

