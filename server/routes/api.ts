import { Router } from 'express';
import {
  createConfirmedBooking,
  deleteTripRecord,
  getBookingById,
  getConversationMessages,
  getOrCreateProfile,
  getTripById,
  getVoucherForBooking,
  listApprovals,
  listBookings,
  listTrips,
  saveProfile,
  updateBookingStatus,
  updateTripRecord,
} from '../db.ts';
import { processChatTurn, replanTrip, runSupervisorWorkflow } from '../agents/orchestrator.ts';
import {
  DESTINATION_CATALOG,
  fetchOpenMeteoForecast,
  fetchOverpassPOIs,
  geocodeLocation,
  scoreDestinations,
} from '../services/travelData.ts';
import type { TravellerProfile } from '../../src/types/travel.ts';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TravelGenie' });
});

router.get('/chat/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  res.json({
    messages: getConversationMessages(sessionId),
    profile: getOrCreateProfile(sessionId),
  });
});

router.post('/chat', async (req, res) => {
  try {
    const { session_id, message, active_trip_id } = req.body as {
      session_id?: string;
      message?: string;
      active_trip_id?: number | null;
    };
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    const result = await processChatTurn({
      sessionId: session_id || 'default-session',
      message: message.trim(),
      activeTripId: active_trip_id ?? null,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Chat processing failed',
    });
  }
});

router.post('/chat/:sessionId/reset', (req, res) => {
  const { sessionId } = req.params;
  saveProfile(sessionId, {
    origin: null,
    destination: null,
    duration_days: null,
    budget: null,
    budget_scope: 'per_person',
    currency: 'INR',
    interests: [],
    travellers: null,
    travel_dates: null,
    hotel_preference: null,
    pace: 'balanced',
    avoid_crowds: false,
  });
  res.json({ ok: true });
});

router.get('/trips', (_req, res) => {
  res.json({ trips: listTrips() });
});

router.get('/trips/:id', (req, res) => {
  const trip = getTripById(Number(req.params.id));
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ trip });
});

router.post('/trips/plan', async (req, res) => {
  try {
    const body = req.body as Partial<TravellerProfile> & { session_id?: string };
    const dest = body.destination?.trim();
    const originCity = body.origin?.trim();
    if (!originCity) {
      res.status(400).json({ error: 'Please enter your departure (source) city.' });
      return;
    }
    if (!dest) {
      res.status(400).json({ error: 'Please enter a destination city.' });
      return;
    }

    const durationDays = Math.max(1, Number(body.duration_days) || 4);
    const sessionId = body.session_id || 'quick-plan';
    const profile: TravellerProfile = {
      origin: originCity,
      destination: dest,
      duration_days: durationDays,
      budget: Number(body.budget) || 25000,
      budget_scope: body.budget_scope || 'per_person',
      currency: 'INR',
      interests: Array.isArray(body.interests) ? body.interests.filter(Boolean) : [],
      travellers: Math.max(1, Number(body.travellers) || 2),
      travel_dates: body.travel_dates?.trim() || `${durationDays}-day flexible schedule`,
      hotel_preference: body.hotel_preference || 'budget',
      pace: body.pace || 'balanced',
      avoid_crowds: Boolean(body.avoid_crowds),
    };
    const trip = await runSupervisorWorkflow({
      profile,
      sessionId,
    });
    saveProfile(sessionId, trip.profile);
    res.json({ trip, profile: trip.profile });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to plan trip' });
  }
});

router.put('/trips/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getTripById(id);
  if (!existing) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const updated = updateTripRecord(id, {
    ...existing,
    ...req.body,
  });
  res.json({ trip: updated });
});

router.delete('/trips/:id', (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteTripRecord(id);
  if (!deleted) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ deleted: true, id });
});

router.post('/trips/:id/replan', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await replanTrip(id, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Replan failed' });
  }
});

router.get('/destinations', (req, res) => {
  const interests = String(req.query.interests || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const budget = Number(req.query.budget) || 20000;
  const days = Number(req.query.days) || 4;
  const preferred = req.query.destination ? String(req.query.destination) : null;
  const destinations = scoreDestinations(interests, budget, days, preferred);
  res.json({ destinations });
});

router.get('/places', async (req, res) => {
  const q = req.query.q ? String(req.query.q).trim() : '';
  if (!q) {
    res.status(400).json({ error: 'Query parameter q (destination name) is required' });
    return;
  }
  const geo = await geocodeLocation(q);
  const livePois = await fetchOverpassPOIs(geo.lat, geo.lng, 8);
  const catalogMatch = DESTINATION_CATALOG.find((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  res.json({
    location: geo,
    live_overpass_pois: livePois,
    curated_pois: catalogMatch?.pois || [],
  });
});

router.get('/weather', async (req, res) => {
  const lat = Number(req.query.lat) || 15.4909;
  const lng = Number(req.query.lng) || 73.8278;
  const days = Number(req.query.days) || 4;
  const forecast = await fetchOpenMeteoForecast(lat, lng, days);
  res.json({ forecast });
});

router.post('/budget/calculate', (req, res) => {
  const {
    travellers = 3,
    duration_days = 4,
    per_person_target = 25000,
    flight_fare = 4200,
    hotel_per_night = 1500,
    activities_per_person = 2000,
    shared_transfers = false,
  } = req.body as Record<string, number | boolean>;

  const t = Number(travellers);
  const d = Number(duration_days);
  const nights = Math.max(1, d - 1);
  const rooms = Math.max(1, Math.ceil(t / 2));

  const transport = Math.round(Number(flight_fare) * 2 * t * 0.72);
  const accommodation = Math.round(Number(hotel_per_night) * nights * rooms);
  const food = Math.round(950 * d * t);
  const activities = Math.round(Number(activities_per_person) * t);
  const local_transfers = Math.round((shared_transfers ? 450 : 800) * d * (shared_transfers ? 1 : Math.ceil(t / 3)));
  const emergency_buffer = Math.round((transport + accommodation + food + activities) * 0.08);

  const total_estimated = transport + accommodation + food + activities + local_transfers + emergency_buffer;
  const per_person_estimated = Math.round(total_estimated / Math.max(1, t));

  res.json({
    currency: 'INR',
    travellers: t,
    duration_days: d,
    per_person_budget_target: Number(per_person_target),
    categories: { transport, accommodation, food, activities, local_transfers, emergency_buffer },
    total_estimated,
    per_person_estimated,
    within_budget: per_person_estimated <= Number(per_person_target),
    variance_per_person: per_person_estimated - Number(per_person_target),
    source_status: 'Estimated',
  });
});

router.get('/bookings', (_req, res) => {
  res.json({
    bookings: listBookings(),
    approvals: listApprovals(),
  });
});

router.post('/bookings/preview', (req, res) => {
  const {
    trip_id,
    booking_type,
    title,
    provider,
    price,
    check_in_or_date,
    check_out_or_return,
    guests,
    cancellation_terms,
    passengers,
  } = req.body as Record<string, unknown>;

  res.json({
    preview: {
      trip_id: trip_id ?? null,
      booking_type: booking_type || 'hotel',
      title: title || 'Demo Reservation',
      provider: provider || 'demo_inventory',
      price: Number(price) || 4500,
      currency: 'INR',
      source_status: 'Simulated',
      check_in_or_date: check_in_or_date || '2026-12-18',
      check_out_or_return: check_out_or_return || '2026-12-21',
      guests: Number(guests) || 3,
      cancellation_terms: cancellation_terms || 'Free cancellation up to 48 hours prior; ₹500 simulated fee thereafter.',
      passengers: Array.isArray(passengers) && passengers.length ? passengers : ['Aarav Sharma', 'Rohan Verma', 'Kabir Nair'],
      requires_explicit_approval: true,
      disclaimer: 'Simulated prototype booking — does not charge a card or reserve a real airline/hotel seat.',
    },
  });
});

router.post('/bookings/confirm', (req, res) => {
  const {
    trip_id,
    idempotency_key,
    booking_type,
    title,
    provider,
    price,
    check_in_or_date,
    check_out_or_return,
    guests,
    cancellation_terms,
    passengers,
    approved_by,
  } = req.body as Record<string, unknown>;

  if (!idempotency_key) {
    res.status(400).json({ error: 'idempotency_key is required' });
    return;
  }

  const booking = createConfirmedBooking({
    trip_id: trip_id ? Number(trip_id) : null,
    idempotency_key: String(idempotency_key),
    booking_type: (booking_type as 'flight' | 'hotel' | 'activity' | 'package') || 'hotel',
    title: String(title || 'Demo Reservation'),
    provider: String(provider || 'demo_inventory'),
    price: Number(price) || 4500,
    currency: 'INR',
    source_status: 'Simulated',
    check_in_or_date: String(check_in_or_date || '2026-12-18'),
    check_out_or_return: String(check_out_or_return || '2026-12-21'),
    guests: Number(guests) || 3,
    cancellation_terms: String(cancellation_terms || 'Free cancellation up to 48 hours prior; ₹500 fee thereafter.'),
    passengers: Array.isArray(passengers) ? passengers.map(String) : ['Aarav Sharma'],
    confirmation_data: { confirmed_via: 'explicit_approval_gate' },
    approved_by: approved_by ? String(approved_by) : 'Traveller',
  });

  res.json({ booking });
});

router.post('/bookings/:id/cancel/preview', (req, res) => {
  const booking = getBookingById(Number(req.params.id));
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const fee = booking.booking_type === 'flight' ? 750 : 500;
  const refund = Math.max(0, booking.price - fee);
  res.json({
    booking_id: booking.id,
    booking_reference: booking.booking_reference,
    cancellation_fee_inr: fee,
    estimated_refund_inr: refund,
    warning: `Cancelling ${booking.booking_reference} (${booking.title}) incurs a simulated ₹${fee} cancellation fee. Estimated refund: ₹${refund.toLocaleString('en-IN')}. Do you want to continue?`,
  });
});

router.post('/bookings/:id/cancel/confirm', (req, res) => {
  const id = Number(req.params.id);
  const existing = getBookingById(id);
  if (!existing) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const fee = existing.booking_type === 'flight' ? 750 : 500;
  const updated = updateBookingStatus({
    booking_id: id,
    new_status: 'Cancelled',
    action_type: 'booking_cancel',
    summary: `Cancelled ${existing.booking_reference} with ₹${fee} simulated fee.`,
    fee_impact_inr: fee,
  });
  res.json({ booking: updated });
});

router.post('/bookings/:id/modify/preview', (req, res) => {
  const booking = getBookingById(Number(req.params.id));
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const fee = 500;
  const newCheckIn = String(req.body.new_check_in || booking.check_in_or_date);
  const newCheckOut = String(req.body.new_check_out || booking.check_out_or_return);
  res.json({
    booking_id: booking.id,
    booking_reference: booking.booking_reference,
    fee_inr: fee,
    proposed_dates: `${newCheckIn} to ${newCheckOut}`,
    warning: `Modifying ${booking.booking_reference} to ${newCheckIn} – ${newCheckOut} incurs a ₹${fee} modification fee. Do you want to continue?`,
  });
});

router.post('/bookings/:id/modify/confirm', (req, res) => {
  const id = Number(req.params.id);
  const existing = getBookingById(id);
  if (!existing) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const fee = 500;
  const newCheckIn = String(req.body.new_check_in || existing.check_in_or_date);
  const newCheckOut = String(req.body.new_check_out || existing.check_out_or_return);
  const updated = updateBookingStatus({
    booking_id: id,
    new_status: 'Modified',
    action_type: 'booking_modify',
    summary: `Modified ${existing.booking_reference} dates to ${newCheckIn}–${newCheckOut} (₹${fee} fee).`,
    fee_impact_inr: fee,
    new_price: existing.price + fee,
    new_check_in: newCheckIn,
    new_check_out: newCheckOut,
  });
  res.json({ booking: updated });
});

router.get('/bookings/:id/voucher', (req, res) => {
  const voucher = getVoucherForBooking(Number(req.params.id));
  if (!voucher) {
    res.status(404).json({ error: 'Voucher not found' });
    return;
  }
  res.json({ voucher });
});

router.post('/disruptions/resolve', async (req, res) => {
  try {
    const { trip_id, booking_id, disruption_type, apply } = req.body as {
      trip_id?: number;
      booking_id?: number;
      disruption_type: 'flight_delayed' | 'hotel_unavailable' | 'bad_weather' | 'attraction_closed' | 'early_return';
      apply?: boolean;
    };

    const trip = trip_id ? getTripById(Number(trip_id)) : listTrips()[0];
    if (!trip) {
      res.status(404).json({ error: 'No active trip found' });
      return;
    }

    const day1Stop = trip.days[0]?.activities[1]?.title || `${trip.selected_destination.name} arrival orientation`;
    const day2Stops =
      trip.days[1]?.activities.map((a) => a.title).join(', ') || `Day 2 outdoor stops in ${trip.selected_destination.name}`;
    const indoorBackup =
      trip.days.flatMap((d) => d.activities).find((a) => a.is_indoor && a.category !== 'Logistics')?.title ||
      `${trip.selected_destination.name} Indoor Museum & Cultural Quarter`;

    const scenarios = {
      flight_delayed: {
        title: `Inbound Flight Delayed by 4 Hours (${trip.selected_flight.flight_number})`,
        affected: `Day 1 Morning Arrival & ${day1Stop}`,
        alternative: `Shift Day 1 arrival to 14:30, notify ${trip.selected_hotel.name} for late check-in, and reschedule ${day1Stop} to evening.`,
        additional_cost_inr: 0,
        fee_implication: 'Zero airline rebooking fee under delay protection (Simulated).',
      },
      hotel_unavailable: {
        title: 'Booked Hotel Room Maintenance / Overbooking',
        affected: `${trip.selected_hotel.name} reservation (${trip.selected_destination.name})`,
        alternative: `Rebook to ${
          trip.hotel_options[1]?.name || `${trip.selected_destination.name} Partner Courtyard Stay`
        } nearby at matched simulated rate.`,
        additional_cost_inr: 500,
        fee_implication: '₹0 cancellation penalty on disrupted property; ₹500 upgrade difference.',
      },
      bad_weather: {
        title: `Heavy Rain Advisory in ${trip.selected_destination.name} on Day 2`,
        affected: day2Stops,
        alternative: `Swap outdoor stops on Day 2 for sheltered venues including ${indoorBackup}.`,
        additional_cost_inr: 0,
        fee_implication: 'Activity fees adjusted automatically based on indoor replacements.',
      },
      attraction_closed: {
        title: `Primary Landmark Temporary Closure in ${trip.selected_destination.name}`,
        affected: trip.days[1]?.activities[0]?.title || `Day 2 Landmark Stop`,
        alternative: `Re-route to nearby ${indoorBackup} and walkable heritage district.`,
        additional_cost_inr: 150,
        fee_implication: 'No cancellation penalty on open public landmark.',
      },
      early_return: {
        title: 'Traveller Needs to Return 1 Day Early',
        affected: `Final day schedule in ${trip.selected_destination.name} & final night stay`,
        alternative: `Shorten itinerary to ${Math.max(2, trip.days.length - 1)} days and issue modified return voucher.`,
        additional_cost_inr: 500,
        fee_implication: '₹500 simulated modification fee; remaining night refunded.',
      },
    };

    const plan = scenarios[disruption_type] || scenarios.bad_weather;

    if (!apply) {
      res.json({
        proposal: {
          disruption_type,
          ...plan,
          requires_approval: true,
        },
      });
      return;
    }

    let updatedTrip = trip;
    if (disruption_type === 'bad_weather') {
      const resReplan = await replanTrip(trip.id, { action: 'weather_rain', day_number: 2 });
      updatedTrip = resReplan.trip;
    } else if (disruption_type === 'hotel_unavailable' && trip.hotel_options[1]) {
      const resReplan = await replanTrip(trip.id, {
        action: 'change_hotel',
        hotel_id: trip.hotel_options[1].id,
      });
      updatedTrip = resReplan.trip;
    } else {
      updatedTrip = updateTripRecord(trip.id, {
        ...trip,
        status: 'modified',
        change_log: [
          ...(trip.change_log || []),
          {
            before: plan.affected,
            after: plan.alternative,
            impact: plan.fee_implication,
          },
        ],
      });
    }

    if (booking_id) {
      updateBookingStatus({
        booking_id: Number(booking_id),
        new_status: 'Modified',
        action_type: `disruption_${disruption_type}`,
        summary: `Support Agent resolved "${plan.title}": ${plan.alternative}`,
        fee_impact_inr: plan.additional_cost_inr,
      });
    }

    res.json({
      resolved: true,
      trip: updatedTrip,
      summary: plan.alternative,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Disruption resolution failed' });
  }
});

router.get('/approvals', (_req, res) => {
  res.json({ approvals: listApprovals() });
});

export default router;
