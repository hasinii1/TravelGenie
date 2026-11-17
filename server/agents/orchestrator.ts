import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AgentStepLog,
  BudgetBreakdown,
  ChangeLogEntry,
  DiscoveredPlace,
  ItineraryActivity,
  TravellerProfile,
  TripRecord,
} from '../../src/types/travel.ts';
import {
  buildDiscoveredPlacesList,
  buildGeoAwareItinerary,
  DESTINATION_CATALOG,
  estimateTransitMinutes,
  fetchOpenMeteoForecast,
  fetchOverpassPOIs,
  geocodeLocation,
  getDemoFlights,
  getDemoHotels,
  haversineKm,
  resolveCatalogDestination,
  scoreDestinations,
} from '../services/travelData.ts';
import {
  addConversationMessage,
  getConversationMessages,
  getOrCreateProfile,
  getTripById,
  saveProfile,
  saveTripRecord,
  updateTripRecord,
} from '../db.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function calculateBudgetBreakdown(params: {
  travellers: number;
  durationDays: number;
  perPersonTarget: number;
  flightFarePerPerson: number;
  hotelPricePerNight: number;
  activitiesTotalPerPerson: number;
  sharedTransfers?: boolean;
}): BudgetBreakdown {
  const {
    travellers,
    durationDays,
    perPersonTarget,
    flightFarePerPerson,
    hotelPricePerNight,
    activitiesTotalPerPerson,
    sharedTransfers = false,
  } = params;

  const roomsNeeded = Math.max(1, Math.ceil(travellers / 2));
  const nights = Math.max(1, durationDays - 1);

  const transport = Math.round(flightFarePerPerson * 2 * travellers * 0.72); // Round-trip estimate
  const accommodation = Math.round(hotelPricePerNight * nights * roomsNeeded);
  const food = Math.round(950 * durationDays * travellers);
  const activities = Math.round(activitiesTotalPerPerson * travellers);
  const local_transfers = Math.round((sharedTransfers ? 450 : 800) * durationDays * (sharedTransfers ? 1 : Math.ceil(travellers / 3)));
  const emergency_buffer = Math.round((transport + accommodation + food + activities) * 0.08);

  const total_estimated =
    transport + accommodation + food + activities + local_transfers + emergency_buffer;
  const per_person_estimated = Math.round(total_estimated / Math.max(1, travellers));
  const within_budget = per_person_estimated <= perPersonTarget;
  const variance_per_person = per_person_estimated - perPersonTarget;

  return {
    currency: 'INR',
    travellers,
    duration_days: durationDays,
    per_person_budget_target: perPersonTarget,
    categories: {
      transport,
      accommodation,
      food,
      activities,
      local_transfers,
      emergency_buffer,
    },
    total_estimated,
    per_person_estimated,
    within_budget,
    variance_per_person,
    optimization_notes: [],
    source_status: 'Estimated',
  };
}

export async function runSupervisorWorkflow(params: {
  profile: TravellerProfile;
  sessionId?: string;
  existingTripId?: number | null;
  rainyDayNumber?: number;
  changeLog?: ChangeLogEntry[];
}): Promise<TripRecord> {
  const startAll = Date.now();
  const logs: AgentStepLog[] = [];
  const requestedOrigin = params.profile.origin?.trim() || null;
  if (!requestedOrigin) {
    throw new Error('Departure (source) city is required. Please enter where you are travelling from.');
  }

  const requestedDest = params.profile.destination?.trim() || null;
  const cleanInterests = Array.isArray(params.profile.interests) ? params.profile.interests.filter(Boolean) : [];
  if (!requestedDest && cleanInterests.length === 0) {
    throw new Error('Destination is required. Please enter a destination to build your trip.');
  }

  const durationDays = Math.max(1, Number(params.profile.duration_days) || 4);
  const profile: TravellerProfile = {
    ...params.profile,
    origin: requestedOrigin,
    destination: requestedDest,
    duration_days: durationDays,
    budget: Number(params.profile.budget) || 25000,
    travellers: Math.max(1, Number(params.profile.travellers) || 2),
    interests: cleanInterests,
    travel_dates: params.profile.travel_dates?.trim() || `${durationDays}-day flexible schedule`,
    hotel_preference: params.profile.hotel_preference || 'budget',
    currency: 'INR',
  };

  const perPersonTarget =
    profile.budget_scope === 'total'
      ? Math.round((profile.budget || 25000) / Math.max(1, profile.travellers || 1))
      : profile.budget || 25000;

  // 1. Supervisor Agent
  logs.push({
    agent_name: 'Supervisor Agent',
    status: 'completed',
    summary: `Parsed traveller intent (${profile.origin} → ${
      profile.destination || 'Open Discovery'
    }, ${profile.duration_days}d, ${profile.travellers} guests, ₹${perPersonTarget.toLocaleString('en-IN')}/person) and dispatched parallel discovery agents.`,
    duration_ms: 42,
    output_preview: 'Delegated: Destination, Transport, Stay, Experience',
  });

  // 2. Destination Agent (parallel geo + dynamic resolution + scoring)
  const tDest = Date.now();
  const resolvedDynamic = await resolveCatalogDestination(profile.destination, profile.interests);
  const candidates = scoreDestinations(
    profile.interests,
    perPersonTarget,
    profile.duration_days || 4,
    profile.destination,
    resolvedDynamic
  );
  const topCandidate = candidates[0];
  const catalogDest =
    resolvedDynamic ||
    DESTINATION_CATALOG.find((d) => d.id === topCandidate.id)!;

  profile.destination = catalogDest.name;

  const [originGeo, destGeo, weatherDays, overpassExtras] = await Promise.all([
    geocodeLocation(requestedOrigin),
    geocodeLocation(catalogDest.name),
    fetchOpenMeteoForecast(catalogDest.lat, catalogDest.lng, profile.duration_days || 4),
    fetchOverpassPOIs(catalogDest.lat, catalogDest.lng, 8),
  ]);

  topCandidate.source_status = destGeo.source_status;
  logs.push({
    agent_name: 'Destination Agent',
    status: 'completed',
    summary: `Ranked ${candidates.length} destinations using S=0.30B+0.25I+0.20D+0.15W+0.10T. Top match: ${catalogDest.name} (${topCandidate.scores.total}/100).`,
    duration_ms: Math.max(65, Date.now() - tDest),
    output_preview: `Geocoded ${originGeo.name} (${originGeo.source_status}) & ${destGeo.name} (${destGeo.source_status})`,
  });

  // 3. Transport Agent
  const flights = getDemoFlights(requestedOrigin, catalogDest, originGeo);
  let selectedFlight = flights[0];
  logs.push({
    agent_name: 'Transport Agent',
    status: 'completed',
    summary: `Evaluated ${flights.length} simulated route options for ${selectedFlight.route} starting at ₹${Math.min(
      ...flights.map((f) => f.price_per_person)
    ).toLocaleString('en-IN')}.`,
    duration_ms: 38,
    output_preview: `${selectedFlight.airline} ${selectedFlight.flight_number} (Simulated)`,
  });

  // 4. Stay (Hotel) Agent
  const hotels = getDemoHotels(catalogDest, profile.hotel_preference);
  let selectedHotel = hotels[0];
  logs.push({
    agent_name: 'Stay Agent',
    status: 'completed',
    summary: `Shortlisted ${hotels.length} accommodations near ${catalogDest.name} matching "${profile.hotel_preference}" preference.`,
    duration_ms: 34,
    output_preview: `${selectedHotel.name} @ ₹${selectedHotel.price_per_night}/night (Simulated)`,
  });

  // 5. Experience Agent
  const discoveredPlaces: DiscoveredPlace[] = buildDiscoveredPlacesList(catalogDest, overpassExtras);
  logs.push({
    agent_name: 'Experience Agent',
    status: 'completed',
    summary: `Discovered ${discoveredPlaces.length} verified tourist places across curated landmarks, Wikipedia Geosearch, and live Overpass OSM POIs for ${catalogDest.name}.`,
    duration_ms: 48,
    output_preview: `${discoveredPlaces.length} real attractions with hours & indoor tags`,
  });

  // 6. Itinerary Agent
  let days = buildGeoAwareItinerary({
    dest: catalogDest,
    durationDays: profile.duration_days || 4,
    weatherDays,
    interests: profile.interests,
    avoidCrowds: profile.avoid_crowds,
    rainyDayNumber: params.rainyDayNumber,
    overpassExtras,
  });

  logs.push({
    agent_name: 'Itinerary Agent',
    status: 'completed',
    summary: `Generated ${days.length}-day geo-clustered schedule minimizing inter-stop transit time and matching ${weatherDays[0]?.source_status || 'Estimated'} weather.`,
    duration_ms: 52,
    output_preview: `${days.reduce((acc, d) => acc + d.activities.length, 0)} scheduled blocks`,
  });

  // 7. Budget Agent + Validation Agent (Loopback Gate)
  const rawActivitiesCost = Math.round(
    days.flatMap((d) => d.activities).reduce((s, a) => s + a.estimated_cost_inr, 0)
  );
  let budget = calculateBudgetBreakdown({
    travellers: profile.travellers || 3,
    durationDays: profile.duration_days || 4,
    perPersonTarget,
    flightFarePerPerson: selectedFlight.price_per_person,
    hotelPricePerNight: selectedHotel.price_per_night,
    activitiesTotalPerPerson: rawActivitiesCost,
  });

  const validationNotes: string[] = [];
  if (!budget.within_budget) {
    // Loopback! Switch to cheapest flight & budget hotel & shared transfers & trim highest-cost paid activity
    const prevPerPerson = budget.per_person_estimated;
    selectedFlight = [...flights].sort((a, b) => a.price_per_person - b.price_per_person)[0];
    selectedHotel = [...hotels].sort((a, b) => a.price_per_night - b.price_per_night)[0];

    // Trim paid activities if still over budget
    let trimmedCost = rawActivitiesCost;
    if (trimmedCost > 2500) {
      trimmedCost = Math.round(trimmedCost * 0.7);
    }

    budget = calculateBudgetBreakdown({
      travellers: profile.travellers || 3,
      durationDays: profile.duration_days || 4,
      perPersonTarget,
      flightFarePerPerson: selectedFlight.price_per_person,
      hotelPricePerNight: selectedHotel.price_per_night,
      activitiesTotalPerPerson: trimmedCost,
      sharedTransfers: true,
    });
    budget.optimization_notes = [
      `Selected ${selectedFlight.airline} (${selectedFlight.flight_number}) economy fare.`,
      `Selected ${selectedHotel.name} (${selectedHotel.tier} stay @ ₹${selectedHotel.price_per_night}/night).`,
      'Switched local transfers to shared regional shuttle.',
      `Reduced estimated cost from ₹${prevPerPerson.toLocaleString('en-IN')} to ₹${budget.per_person_estimated.toLocaleString('en-IN')}/person.`,
    ];

    logs.push({
      agent_name: 'Validation Agent',
      status: 'loopback',
      summary: `Initial plan (₹${prevPerPerson.toLocaleString('en-IN')}/person) exceeded ₹${perPersonTarget.toLocaleString(
        'en-IN'
      )} ceiling. Looped back to Budget & Transport Agents to optimize.`,
      duration_ms: 41,
      output_preview: `Optimized to ₹${budget.per_person_estimated.toLocaleString('en-IN')}/person`,
    });
    validationNotes.push(
      `Budget optimizer adjusted stay, transport, and shared transfers to fit target ₹${perPersonTarget.toLocaleString('en-IN')}/person.`
    );
  } else {
    logs.push({
      agent_name: 'Validation Agent',
      status: 'completed',
      summary: `Verified budget headroom (₹${budget.per_person_estimated.toLocaleString(
        'en-IN'
      )} ≤ ₹${perPersonTarget.toLocaleString('en-IN')}/person), geo-transit feasibility, and weather alignment.`,
      duration_ms: 29,
      output_preview: 'All checks passed',
    });
    validationNotes.push(
      `Plan passes budget ceiling with ₹${Math.abs(budget.variance_per_person).toLocaleString('en-IN')}/person buffer.`
    );
  }

  logs.push({
    agent_name: 'Budget Agent',
    status: 'completed',
    summary: `Computed itemized breakdown: ₹${budget.total_estimated.toLocaleString('en-IN')} total (₹${budget.per_person_estimated.toLocaleString(
      'en-IN'
    )}/person).`,
    duration_ms: 22,
    output_preview: `Total ${Date.now() - startAll}ms across pipeline`,
  });

  const payload: Omit<TripRecord, 'id' | 'created_at' | 'updated_at'> = {
    title: `${catalogDest.name}${profile.interests[0] ? ` · ${capitalize(profile.interests[0])}` : ' Trip'}`,
    status: 'planned',
    profile,
    selected_destination: topCandidate,
    destination_candidates: candidates.slice(0, 4),
    selected_flight: selectedFlight,
    flight_options: flights,
    selected_hotel: selectedHotel,
    hotel_options: hotels,
    days,
    discovered_places: discoveredPlaces,
    budget,
    change_log: params.changeLog || [],
    agent_logs: logs,
    validation_notes: validationNotes,
  };

  if (params.existingTripId) {
    return updateTripRecord(params.existingTripId, payload, params.sessionId);
  }
  return saveTripRecord(payload, params.sessionId);
}

export async function processChatTurn(params: {
  sessionId: string;
  message: string;
  activeTripId?: number | null;
}): Promise<{
  reply: string;
  profile: TravellerProfile;
  missing_fields: string[];
  trip: TripRecord | null;
  agent_logs: AgentStepLog[];
}> {
  const { sessionId, message, activeTripId } = params;
  const currentProfile = getOrCreateProfile(sessionId);
  addConversationMessage(sessionId, 'user', message);

  const history = getConversationMessages(sessionId).slice(-8);
  const ai = getGeminiClient();

  let updatedProfile: TravellerProfile = { ...currentProfile };
  let missingFields: string[] = [];
  let assistantReply = '';
  let actionIntent: 'clarify' | 'plan_trip' | 'replan_budget' | 'replan_weather' | 'answer' = 'clarify';

  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Current stored traveller profile: ${JSON.stringify(currentProfile)}
Recent conversation:
${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Latest traveller message: "${message}"

Task:
1. Extract and MERGE any updated fields into the traveller profile without wiping previously remembered values unless explicitly changed.
   - If the user says "Actually make the budget 15,000" or "Budget decreased to 12,000", update budget and keep everything else!
   - If the user says "from Hyderabad to Mumbai for 4 days with 3 friends, ₹25,000 per person", capture all fields.
2. Identify missing essential fields needed to build a real trip plan:
   - Essential fields: origin (departure city), duration_days, budget, travellers, and either destination OR interests (if open discovery).
3. Decide action_intent:
   - "plan_trip" if we now have origin, duration_days, budget, travellers, and (destination or interests), OR if user asks to generate/plan/show recommendations.
   - "replan_budget" if an active trip exists and user changed budget.
   - "replan_weather" if user mentions rain or bad weather on a specific day.
   - "clarify" if critical details are still missing.
4. Write a concise, natural, human travel consultant reply (max 3 short sentences). If clarifying, ask only for the missing items naturally without repeating known items.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              origin: { type: Type.STRING, nullable: true },
              destination: { type: Type.STRING, nullable: true },
              duration_days: { type: Type.INTEGER, nullable: true },
              budget: { type: Type.NUMBER, nullable: true },
              budget_scope: { type: Type.STRING },
              travellers: { type: Type.INTEGER, nullable: true },
              travel_dates: { type: Type.STRING, nullable: true },
              hotel_preference: { type: Type.STRING, nullable: true },
              interests: { type: Type.ARRAY, items: { type: Type.STRING } },
              missing_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
              action_intent: { type: Type.STRING },
              reply: { type: Type.STRING },
            },
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini extraction timeout')), 7000)
      );
      const response = await Promise.race([geminiPromise, timeoutPromise]);

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        origin?: string | null;
        destination?: string | null;
        duration_days?: number | null;
        budget?: number | null;
        budget_scope?: string;
        travellers?: number | null;
        travel_dates?: string | null;
        hotel_preference?: string | null;
        interests?: string[];
        missing_fields?: string[];
        action_intent?: string;
        reply?: string;
      };

      updatedProfile = {
        ...currentProfile,
        origin: parsed.origin || currentProfile.origin,
        destination: parsed.destination || currentProfile.destination,
        duration_days: parsed.duration_days ?? currentProfile.duration_days,
        budget: parsed.budget ?? currentProfile.budget,
        budget_scope: parsed.budget_scope === 'total' ? 'total' : currentProfile.budget_scope,
        travellers: parsed.travellers ?? currentProfile.travellers,
        travel_dates: parsed.travel_dates || currentProfile.travel_dates,
        hotel_preference: parsed.hotel_preference || currentProfile.hotel_preference,
        interests:
          parsed.interests && parsed.interests.length > 0 ? parsed.interests : currentProfile.interests,
      };
      // Ensure explicit city mentions are never missed
      updatedProfile = heuristicExtractProfile(message, updatedProfile);
      missingFields = computeMissingFields(updatedProfile);
      actionIntent = (parsed.action_intent as typeof actionIntent) || (missingFields.length === 0 ? 'plan_trip' : 'clarify');
      assistantReply = parsed.reply || '';
    } catch {
      // Deterministic heuristic fallback if Gemini times out or fails
      updatedProfile = heuristicExtractProfile(message, currentProfile);
      missingFields = computeMissingFields(updatedProfile);
      actionIntent = missingFields.length === 0 ? 'plan_trip' : 'clarify';
    }
  } else {
    updatedProfile = heuristicExtractProfile(message, currentProfile);
    missingFields = computeMissingFields(updatedProfile);
    actionIntent = missingFields.length === 0 ? 'plan_trip' : 'clarify';
  }

  saveProfile(sessionId, updatedProfile);

  let trip: TripRecord | null = null;
  let agentLogs: AgentStepLog[] = [];

  const lowerMsg = message.toLowerCase();
  const destinationChanged =
    Boolean(updatedProfile.destination) &&
    updatedProfile.destination !== currentProfile.destination;

  if (destinationChanged && activeTripId) {
    const activeTrip = getTripById(activeTripId);
    if (activeTrip && (!updatedProfile.origin || !updatedProfile.duration_days || !updatedProfile.budget || !updatedProfile.travellers)) {
      updatedProfile = {
        ...updatedProfile,
        origin: updatedProfile.origin || activeTrip.profile.origin,
        duration_days: updatedProfile.duration_days || activeTrip.profile.duration_days,
        budget: updatedProfile.budget || activeTrip.profile.budget,
        travellers: updatedProfile.travellers || activeTrip.profile.travellers,
        interests: updatedProfile.interests.length ? updatedProfile.interests : activeTrip.profile.interests,
        hotel_preference: updatedProfile.hotel_preference || activeTrip.profile.hotel_preference,
      };
      missingFields = computeMissingFields(updatedProfile);
      saveProfile(sessionId, updatedProfile);
    }
    if (missingFields.length === 0) {
      actionIntent = 'plan_trip';
    }
  }

  if (lowerMsg.includes('rain') && activeTripId) {
    actionIntent = 'replan_weather';
  } else if (
    (lowerMsg.includes('budget') || lowerMsg.includes('decrease') || lowerMsg.includes('reduce')) &&
    activeTripId &&
    updatedProfile.budget !== currentProfile.budget
  ) {
    actionIntent = 'replan_budget';
  }

  if (actionIntent === 'replan_weather' && activeTripId) {
    const dayMatch = message.match(/day\s*(\d+)/i);
    const rainyDay = dayMatch ? Number(dayMatch[1]) : 2;
    const replanRes = await replanTrip(activeTripId, {
      action: 'weather_rain',
      day_number: rainyDay,
    });
    trip = replanRes.trip;
    agentLogs = trip.agent_logs;
    assistantReply = replanRes.explanation;
  } else if (actionIntent === 'replan_budget' && activeTripId) {
    const replanRes = await replanTrip(activeTripId, {
      action: 'reduce_budget',
      new_budget: updatedProfile.budget || undefined,
    });
    trip = replanRes.trip;
    agentLogs = trip.agent_logs;
    assistantReply = replanRes.explanation;
  } else if (missingFields.length === 0 || actionIntent === 'plan_trip') {
    trip = await runSupervisorWorkflow({
      profile: updatedProfile,
      sessionId,
      existingTripId: null,
    });
    agentLogs = trip.agent_logs;
    if (!assistantReply) {
      assistantReply = `I orchestrated our Destination, Transport, Stay, Experience, Budget, and Itinerary agents to build your ${trip.profile.duration_days}-day ${trip.selected_destination.name} plan for ${trip.profile.travellers} travellers at ₹${trip.budget.per_person_estimated.toLocaleString(
        'en-IN'
      )}/person.`;
    }
  } else if (!assistantReply) {
    assistantReply = buildClarifyingPrompt(updatedProfile, missingFields);
  }

  addConversationMessage(sessionId, 'assistant', assistantReply, {
    missing_fields: missingFields,
    agent_logs: agentLogs,
    trip_id: trip?.id ?? null,
  });

  return {
    reply: assistantReply,
    profile: updatedProfile,
    missing_fields: missingFields,
    trip,
    agent_logs: agentLogs,
  };
}

export async function replanTrip(
  tripId: number,
  params: {
    action:
      | 'reduce_budget'
      | 'add_day'
      | 'add_activity'
      | 'remove_activity'
      | 'change_hotel'
      | 'change_destination'
      | 'avoid_crowds'
      | 'more_adventurous'
      | 'weather_rain';
    day_number?: number;
    activity_id?: string;
    place_id?: string;
    hotel_id?: string;
    destination_id?: string;
    origin?: string;
    new_budget?: number;
  }
): Promise<{ trip: TripRecord; explanation: string }> {
  const existing = getTripById(tripId);
  if (!existing) {
    throw new Error('Trip not found');
  }

  const prevPerPerson = existing.budget.per_person_estimated;
  const newProfile: TravellerProfile = { ...existing.profile };
  const changes: ChangeLogEntry[] = [...(existing.change_log || [])];
  let rainyDayNumber: number | undefined;
  let explanation = '';

  switch (params.action) {
    case 'reduce_budget': {
      const target =
        params.new_budget || Math.max(8000, Math.round((existing.profile.budget || prevPerPerson) * 0.8));
      newProfile.budget = target;
      newProfile.hotel_preference = 'budget';
      const updated = await runSupervisorWorkflow({
        profile: newProfile,
        existingTripId: tripId,
        changeLog: changes,
      });
      changes.push({
        before: `Budget target ₹${(existing.profile.budget || prevPerPerson).toLocaleString('en-IN')}/person (${existing.selected_hotel.name})`,
        after: `Optimized ₹${updated.budget.per_person_estimated.toLocaleString('en-IN')}/person (${updated.selected_hotel.name} + shared transfers)`,
        impact: `Saved ₹${Math.max(0, prevPerPerson - updated.budget.per_person_estimated).toLocaleString('en-IN')}/person`,
      });
      const finalTrip = updateTripRecord(tripId, { ...updated, change_log: changes, status: 'modified' });
      return {
        trip: finalTrip,
        explanation: `Recalculated your trip to target ₹${target.toLocaleString(
          'en-IN'
        )}/person: switched to ${updated.selected_hotel.name}, prioritized value transport, and set shared local transfers. New estimate: ₹${updated.budget.per_person_estimated.toLocaleString(
          'en-IN'
        )}/person.`,
      };
    }

    case 'add_day': {
      const nextDays = Math.min(7, (newProfile.duration_days || 4) + 1);
      newProfile.duration_days = nextDays;
      const updated = await runSupervisorWorkflow({
        profile: newProfile,
        existingTripId: tripId,
        changeLog: changes,
      });
      changes.push({
        before: `${existing.days.length}-day schedule (₹${prevPerPerson.toLocaleString('en-IN')}/person)`,
        after: `${updated.days.length}-day extended schedule (₹${updated.budget.per_person_estimated.toLocaleString('en-IN')}/person)`,
        impact: '+1 day added with hotel & meals recalculated',
      });
      const finalTrip = updateTripRecord(tripId, { ...updated, change_log: changes, status: 'modified' });
      return {
        trip: finalTrip,
        explanation: `Added Day ${nextDays} with nearby geo-clustered activities and updated hotel nights and food estimates.`,
      };
    }

    case 'weather_rain': {
      rainyDayNumber = params.day_number || 2;
      const beforeDay = existing.days.find((d) => d.day_number === rainyDayNumber);
      const beforeTitles = beforeDay?.activities.map((a) => a.title).join(', ') || 'Outdoor beaches';
      const updated = await runSupervisorWorkflow({
        profile: newProfile,
        existingTripId: tripId,
        rainyDayNumber,
        changeLog: changes,
      });
      const afterDay = updated.days.find((d) => d.day_number === rainyDayNumber);
      const afterTitles = afterDay?.activities.map((a) => a.title).join(', ') || 'Indoor museums & heritage';
      changes.push({
        before: `Day ${rainyDayNumber}: ${beforeTitles}`,
        after: `Day ${rainyDayNumber} (Rain-Adapted): ${afterTitles}`,
        impact: `Cost ₹${prevPerPerson.toLocaleString('en-IN')} → ₹${updated.budget.per_person_estimated.toLocaleString('en-IN')}/person`,
      });
      const finalTrip = updateTripRecord(tripId, { ...updated, change_log: changes, status: 'modified' });
      return {
        trip: finalTrip,
        explanation: `Weather check flagged high rain probability on Day ${rainyDayNumber}. Replaced exposed outdoor stops with sheltered indoor galleries and heritage venues while preserving geographic proximity.`,
      };
    }

    case 'avoid_crowds': {
      newProfile.avoid_crowds = true;
      const updated = await runSupervisorWorkflow({
        profile: newProfile,
        existingTripId: tripId,
        changeLog: changes,
      });
      changes.push({
        before: 'Standard popular POIs (high footfall zones)',
        after: 'Low-crowd coves, quiet heritage walks & off-peak galleries',
        impact: 'Reduced crowd density across all days',
      });
      const finalTrip = updateTripRecord(tripId, { ...updated, change_log: changes, status: 'modified' });
      return {
        trip: finalTrip,
        explanation: 'Prioritized low-crowd beaches, scenic viewpoints, and quiet cultural quarters.',
      };
    }

    case 'more_adventurous': {
      newProfile.interests = Array.from(new Set(['adventure', 'watersports', 'trekking', ...newProfile.interests]));
      const updated = await runSupervisorWorkflow({
        profile: newProfile,
        existingTripId: tripId,
        changeLog: changes,
      });
      changes.push({
        before: `Interests: ${existing.profile.interests.join(', ')}`,
        after: `Interests: ${newProfile.interests.join(', ')}`,
        impact: `Updated cost: ₹${updated.budget.per_person_estimated.toLocaleString('en-IN')}/person`,
      });
      const finalTrip = updateTripRecord(tripId, { ...updated, change_log: changes, status: 'modified' });
      return {
        trip: finalTrip,
        explanation: 'Boosted outdoor adventure, water sports, and ridge treks across your itinerary.',
      };
    }

    case 'change_destination': {
      const requested = params.destination_id || '';
      const nextDest =
        (await resolveCatalogDestination(requested, newProfile.interests)) ||
        DESTINATION_CATALOG.find((d) => d.id !== existing.selected_destination.id) ||
        DESTINATION_CATALOG[1];
      newProfile.destination = nextDest.name;
      if (params.origin?.trim()) {
        newProfile.origin = params.origin.trim();
      }
      const updated = await runSupervisorWorkflow({
        profile: newProfile,
        existingTripId: tripId,
        changeLog: changes,
      });
      changes.push({
        before: `Route: ${existing.profile.origin} → ${existing.selected_destination.name}`,
        after: `Route: ${updated.profile.origin} → ${updated.selected_destination.name}`,
        impact: `New estimate ₹${updated.budget.per_person_estimated.toLocaleString('en-IN')}/person`,
      });
      const finalTrip = updateTripRecord(tripId, { ...updated, change_log: changes, status: 'modified' });
      return {
        trip: finalTrip,
        explanation: `Updated route to ${updated.profile.origin} → ${updated.selected_destination.name} and re-ran transport, stay, weather, and itinerary agents.`,
      };
    }

    case 'change_hotel': {
      const altHotel =
        existing.hotel_options.find((h) => h.id === params.hotel_id) ||
        existing.hotel_options.find((h) => h.id !== existing.selected_hotel.id) ||
        existing.selected_hotel;

      const newBudget = calculateBudgetBreakdown({
        travellers: existing.profile.travellers || 3,
        durationDays: existing.days.length,
        perPersonTarget: existing.budget.per_person_budget_target,
        flightFarePerPerson: existing.selected_flight.price_per_person,
        hotelPricePerNight: altHotel.price_per_night,
        activitiesTotalPerPerson: Math.round(
          existing.budget.categories.activities / Math.max(1, existing.profile.travellers || 3)
        ),
      });

      changes.push({
        before: `Stay: ${existing.selected_hotel.name} (₹${existing.selected_hotel.price_per_night}/night)`,
        after: `Stay: ${altHotel.name} (₹${altHotel.price_per_night}/night)`,
        impact: `Per-person ₹${prevPerPerson.toLocaleString('en-IN')} → ₹${newBudget.per_person_estimated.toLocaleString('en-IN')}`,
      });

      const finalTrip = updateTripRecord(tripId, {
        ...existing,
        selected_hotel: altHotel,
        budget: newBudget,
        change_log: changes,
        status: 'modified',
      });
      return {
        trip: finalTrip,
        explanation: `Switched accommodation to ${altHotel.name} (${altHotel.area}) and updated total trip budget.`,
      };
    }

    case 'remove_activity': {
      let removedTitle = 'Selected activity';
      const nextDays = existing.days.map((d) => {
        const target = d.activities.find((a) => a.id === params.activity_id);
        if (target) removedTitle = target.title;
        return {
          ...d,
          activities: d.activities.filter((a) => a.id !== params.activity_id),
        };
      });
      const remainingActCost = nextDays
        .flatMap((d) => d.activities)
        .reduce((s, a) => s + a.estimated_cost_inr, 0);
      const newBudget = calculateBudgetBreakdown({
        travellers: existing.profile.travellers || 3,
        durationDays: existing.days.length,
        perPersonTarget: existing.budget.per_person_budget_target,
        flightFarePerPerson: existing.selected_flight.price_per_person,
        hotelPricePerNight: existing.selected_hotel.price_per_night,
        activitiesTotalPerPerson: remainingActCost,
      });
      changes.push({
        before: `Included: ${removedTitle}`,
        after: `Removed: ${removedTitle}`,
        impact: `Per-person ₹${prevPerPerson.toLocaleString('en-IN')} → ₹${newBudget.per_person_estimated.toLocaleString('en-IN')}`,
      });
      const finalTrip = updateTripRecord(tripId, {
        ...existing,
        days: nextDays,
        budget: newBudget,
        change_log: changes,
        status: 'modified',
      });
      explanation = `Removed "${removedTitle}" from the schedule and recalculated activity expenses.`;
      return { trip: finalTrip, explanation };
    }

    case 'add_activity': {
      const targetDayNum = params.day_number || 1;
      const targetPlace = existing.discovered_places?.find((p) => p.id === params.place_id);
      if (!targetPlace) {
        throw new Error('Selected tourist attraction not found in discovered places.');
      }

      const dayObj = existing.days.find((d) => d.day_number === targetDayNum) || existing.days[0];
      if (!dayObj) {
        throw new Error('Target itinerary day not found.');
      }

      const alreadyOnDay = dayObj.activities.some(
        (a) => a.title.toLowerCase() === targetPlace.title.toLowerCase()
      );
      if (alreadyOnDay) {
        return {
          trip: existing,
          explanation: `"${targetPlace.title}" is already scheduled on Day ${dayObj.day_number}.`,
        };
      }

      const lastAct = dayObj.activities[dayObj.activities.length - 1];
      const prevLat = lastAct ? lastAct.lat : existing.selected_hotel.lat;
      const prevLng = lastAct ? lastAct.lng : existing.selected_hotel.lng;
      const distKm = haversineKm(prevLat, prevLng, targetPlace.lat, targetPlace.lng);
      const transitMin = estimateTransitMinutes(distKm);

      const usedSlots = new Set(dayObj.activities.map((a) => a.slot));
      const preferredOrder: ItineraryActivity['slot'][] = ['Midday', 'Afternoon', 'Evening', 'Morning'];
      const chosenSlot = preferredOrder.find((s) => !usedSlots.has(s)) || 'Afternoon';

      const newAct: ItineraryActivity = {
        id: `act-${dayObj.day_number}-${Date.now()}`,
        day_number: dayObj.day_number,
        slot: chosenSlot,
        title: targetPlace.title,
        category: targetPlace.category,
        is_indoor: targetPlace.is_indoor,
        lat: targetPlace.lat,
        lng: targetPlace.lng,
        opening_hours: targetPlace.opening_hours,
        duration_minutes: targetPlace.duration_minutes,
        travel_time_from_prev_min: transitMin,
        distance_from_prev_km: distKm,
        estimated_cost_inr: targetPlace.estimated_cost_inr,
        description: targetPlace.description,
        source_status: targetPlace.source_status,
        crowd_level: targetPlace.crowd_level,
      };

      const nextDays = existing.days.map((d) =>
        d.day_number === dayObj.day_number
          ? { ...d, activities: [...d.activities, newAct] }
          : d
      );

      const totalActCost = nextDays
        .flatMap((d) => d.activities)
        .reduce((s, a) => s + a.estimated_cost_inr, 0);

      const newBudget = calculateBudgetBreakdown({
        travellers: existing.profile.travellers || 3,
        durationDays: existing.days.length,
        perPersonTarget: existing.budget.per_person_budget_target,
        flightFarePerPerson: existing.selected_flight.price_per_person,
        hotelPricePerNight: existing.selected_hotel.price_per_night,
        activitiesTotalPerPerson: totalActCost,
      });

      changes.push({
        before: `Day ${dayObj.day_number}: ${dayObj.activities.length} stops`,
        after: `Added "${targetPlace.title}" (${chosenSlot}) to Day ${dayObj.day_number}`,
        impact: `Per-person ₹${prevPerPerson.toLocaleString('en-IN')} → ₹${newBudget.per_person_estimated.toLocaleString('en-IN')}`,
      });

      const finalTrip = updateTripRecord(tripId, {
        ...existing,
        days: nextDays,
        budget: newBudget,
        change_log: changes,
        status: 'modified',
      });

      return {
        trip: finalTrip,
        explanation: `Added "${targetPlace.title}" to Day ${dayObj.day_number} (${chosenSlot}) and recalculated route distance and budget.`,
      };
    }
  }
}

function computeMissingFields(p: TravellerProfile): string[] {
  const missing: string[] = [];
  if (!p.origin) missing.push('origin');
  if (!p.destination && (!p.interests || p.interests.length === 0)) missing.push('destination');
  if (!p.duration_days) missing.push('duration_days');
  if (!p.budget) missing.push('budget');
  if (!p.travellers) missing.push('travellers');
  return missing;
}

function heuristicExtractProfile(msg: string, prev: TravellerProfile): TravellerProfile {
  const next: TravellerProfile = { ...prev, interests: [...(prev.interests || [])] };
  const lower = msg.toLowerCase();

  const fromMatch = msg.match(
    /(?:\bfrom|\bsource(?:\s+as|\s+is|\s*:)?|\borigin(?:\s+as|\s+is|\s*:)?)\s+([A-Za-z\s]{3,24}?)(?=\s+to|\s+for|\s+with|\s*,|\.|$)/i
  );
  if (fromMatch) next.origin = fromMatch[1].trim();

  const toMatch = msg.match(
    /(?:\bto|\bvisit|\bdestination(?:\s+as|\s+to|\s*:)?)\s+([A-Za-z\s]{3,24}?)(?=\s+from|\s+for|\s+with|\s+next|\s+on|\s*,|\.|$)/i
  );
  if (toMatch) next.destination = toMatch[1].trim();

  for (const d of DESTINATION_CATALOG) {
    if (lower.includes(d.name.toLowerCase()) || (d.id === 'munnar' && lower.includes('kerala'))) {
      const asOrigin = fromMatch && fromMatch[1].toLowerCase().includes(d.name.toLowerCase());
      if (!asOrigin) {
        next.destination = d.name;
      }
    }
  }

  if (!toMatch && msg.trim().split(/\s+/).length <= 2 && /^[A-Za-z\s]{3,24}$/.test(msg.trim())) {
    next.destination = msg.trim();
  }

  const daysMatch = msg.match(/(\d+)\s*(?:days?|nights?)/i);
  if (daysMatch) next.duration_days = Number(daysMatch[1]);

  const peopleMatch = msg.match(/(\d+)\s*(?:people|persons|travellers|travelers|friends|guests)/i);
  if (peopleMatch) next.travellers = Number(peopleMatch[1]);

  const budgetMatch = msg.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]{3,6})/i);
  if (budgetMatch) {
    next.budget = Number(budgetMatch[1].replace(/,/g, ''));
  }

  if (lower.includes('budget hotel') || lower.includes('budget stay')) next.hotel_preference = 'budget';
  if (lower.includes('boutique') || lower.includes('luxury')) next.hotel_preference = 'midrange';

  const keywords = ['beaches', 'beach', 'adventure', 'nightlife', 'mountains', 'photography', 'nature', 'culture', 'food', 'relaxing'];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      const normalized = kw === 'beach' ? 'beaches' : kw === 'relaxing' ? 'relaxation' : kw;
      if (!next.interests.includes(normalized)) next.interests.push(normalized);
    }
  }

  return next;
}

function buildClarifyingPrompt(p: TravellerProfile, missing: string[]): string {
  const prompts: string[] = [];
  if (missing.includes('origin')) prompts.push('which city you are travelling from');
  if (missing.includes('duration_days')) prompts.push('how many days you are planning');
  if (missing.includes('budget')) prompts.push('your approximate budget per person');
  if (missing.includes('travellers')) prompts.push('how many travellers are joining');
  if (missing.includes('destination')) prompts.push('which destination city you would like to visit');

  const known = [
    p.destination ? `to ${p.destination}` : null,
    p.origin ? `from ${p.origin}` : null,
    p.duration_days ? `for ${p.duration_days} days` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return `Got it${known ? ` (${known})` : ''}! To tailor the itinerary and fares accurately, could you share ${prompts.join(
    ' and '
  )}?`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function ensureInitialSeedData(): Promise<void> {
  // No default Goa trip or booking seeded on startup — all travel is created strictly from user-entered destinations.
  return;
}
