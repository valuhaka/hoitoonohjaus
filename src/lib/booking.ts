// How a group takes reservations is configured per listing:
// - contact:    show contact details only, the seat is arranged by phone or email
// - external:   link out to the organiser's own booking system
// - integrated: reserve in-app through a registered adapter
export type BookingConfig =
  | { type: 'contact' }
  | { type: 'external'; system: string; url: string }
  | { type: 'integrated'; system: string; adapter: AdapterId }

export type Contact = { name?: string; role?: string; phone?: string; email?: string }

// Only what the booking system needs to hold a seat. Patient data travels in the referral.
export type ReservationRequest = { groupId: string; referrer: string }
export type ReservationResult = { reference: string }
export type ReservationAdapter = (request: ReservationRequest) => Promise<ReservationResult>

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const mockAdapter: ReservationAdapter = async ({ groupId }) => {
  await delay(900)
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return { reference: `PSY-${groupId.toUpperCase()}-${suffix}` }
}

// Register real integrations here, e.g. the region's scheduling system API
export const ADAPTERS = { mock: mockAdapter } satisfies Record<string, ReservationAdapter>

export type AdapterId = keyof typeof ADAPTERS
