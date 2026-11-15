import type { Booking, BookingSlot, Payment } from "@/db/schema";

export type BookingStatus =
  | "pending_payment"
  | "pending_owner_approval"
  | "confirmed"
  | "completed"
  | "cancelled_by_customer"
  | "cancelled_by_owner"
  | "expired"
  | "rejected"
  | "owner_review_timed_out";

export type BookingShift = "morning" | "evening" | "full_day";

export type BookingSource = "online" | "manual_owner";

export type EventType =
  | "wedding"
  | "engagement"
  | "seminar"
  | "family_gathering"
  | "recreation"
  | "other";

export type CurrencyType = "YER" | "SAR" | "USD";

export interface GuestDetailsInput {
  guestName: string;
  guestPhone: string;
  notes?: string;
}

export interface CreateBookingInput {
  venueId: string;
  bookingSource: BookingSource;
  isFullVenue: boolean;
  requestedUnitIds?: string[];
  eventType: EventType;
  guestCount: number;
  eventDate: string; // YYYY-MM-DD
  shift: BookingShift;
  timeSlotStart: string; // ISO 8601
  timeSlotEnd: string; // ISO 8601
  idempotencyKey?: string;
  customerNotes?: string;
  guestDetails?: GuestDetailsInput; // Required if bookingSource === 'manual_owner'
  extraAmenityIds?: string[];
  requiresOwnerApproval?: boolean;
}

export interface TransitionActor {
  userId?: string;
  role: "customer" | "owner" | "admin" | "system";
  reason?: string;
  isAdminWaiver?: boolean; // تجاوز إداري موثق لشرط الدفع
}

export interface BookingTransitionResult {
  success: boolean;
  idempotent: boolean;
  bookingId: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  updatedAt: string;
}

export interface CreateBookingResult {
  booking: Booking;
  slots: BookingSlot[];
  totalAmount: number;
  depositAmount: number;
  currency: CurrencyType;
}

export interface PaymentWebhookPayload {
  provider: "kuraimi" | "onecash" | "floosak" | "stripe" | "bank_transfer" | "mock";
  eventId: string;
  eventType: string;
  providerTransactionId: string;
  bookingReference: string;
  bookingId?: string;
  amount: number;
  currency: CurrencyType;
  status: "success" | "failed";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProcessingResult {
  success: boolean;
  idempotent: boolean;
  payment: Payment;
  bookingUpdated: boolean;
  newBookingStatus?: BookingStatus;
  message: string;
}
