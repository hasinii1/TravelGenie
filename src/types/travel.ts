export type SourceStatus = 'Live' | 'Estimated' | 'Simulated' | 'Unavailable';

export interface TravellerProfile {
  origin: string | null;
  destination: string | null;
  duration_days: number | null;
  budget: number | null;
  budget_scope: 'per_person' | 'total';
  currency: string;
  interests: string[];
  travellers: number | null;
  travel_dates: string | null;
  hotel_preference: string | null;
  pace?: 'relaxed' | 'balanced' | 'packed';
  avoid_crowds?: boolean;
}

export interface DestinationOption {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  summary: string;
  why_it_matches: string;
  image_key: string;
  source_status: SourceStatus;
  weather_summary: string;
  avg_temp_c: number;
  rain_risk_pct: number;
  estimated_per_person_inr: number;
  scores: {
    budget: number;
    interest: number;
    duration: number;
    weather: number;
    convenience: number;
    total: number;
  };
}

export interface FlightOption {
  id: string;
  provider: string;
  source_status: SourceStatus;
  route: string;
  origin_code: string;
  destination_code: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_per_person: number;
  currency: string;
  availability: string;
  cancellation_terms: string;
  last_checked: string;
}

export interface HotelOption {
  id: string;
  provider: string;
  source_status: SourceStatus;
  name: string;
  tier: 'budget' | 'midrange' | 'boutique';
  area: string;
  lat: number;
  lng: number;
  price_per_night: number;
  currency: string;
  distance_km: number;
  rating: number;
  breakfast_included: boolean;
  amenities: string[];
  availability: string;
  cancellation_terms: string;
  last_checked: string;
}

export interface ItineraryActivity {
  id: string;
  day_number: number;
  slot: 'Morning' | 'Midday' | 'Afternoon' | 'Evening';
  title: string;
  category: string;
  is_indoor: boolean;
  lat: number;
  lng: number;
  opening_hours: string;
  duration_minutes: number;
  travel_time_from_prev_min: number;
  distance_from_prev_km: number;
  estimated_cost_inr: number;
  description: string;
  source_status: SourceStatus;
  crowd_level: 'Low' | 'Moderate' | 'High';
}

export interface DiscoveredPlace {
  id: string;
  title: string;
  category: string;
  is_indoor: boolean;
  lat: number;
  lng: number;
  opening_hours: string;
  duration_minutes: number;
  estimated_cost_inr: number;
  description: string;
  crowd_level: 'Low' | 'Moderate' | 'High';
  source_status: SourceStatus;
}

export interface ItineraryDay {
  day_number: number;
  title: string;
  date_label: string;
  weather: {
    condition: string;
    temp_max_c: number;
    temp_min_c: number;
    rain_probability_pct: number;
    source_status: SourceStatus;
  };
  activities: ItineraryActivity[];
}

export interface BudgetBreakdown {
  currency: string;
  travellers: number;
  duration_days: number;
  per_person_budget_target: number;
  categories: {
    transport: number;
    accommodation: number;
    food: number;
    activities: number;
    local_transfers: number;
    emergency_buffer: number;
  };
  total_estimated: number;
  per_person_estimated: number;
  within_budget: boolean;
  variance_per_person: number;
  optimization_notes: string[];
  source_status: SourceStatus;
}

export interface ChangeLogEntry {
  before: string;
  after: string;
  impact: string;
}

export interface AgentStepLog {
  id?: number;
  agent_name: string;
  status: 'completed' | 'skipped' | 'loopback' | 'pending';
  summary: string;
  duration_ms: number;
  output_preview?: string;
  created_at?: string;
}

export interface TripRecord {
  id: number;
  title: string;
  status: 'draft' | 'planned' | 'booked' | 'modified';
  profile: TravellerProfile;
  selected_destination: DestinationOption;
  destination_candidates: DestinationOption[];
  selected_flight: FlightOption;
  flight_options: FlightOption[];
  selected_hotel: HotelOption;
  hotel_options: HotelOption[];
  days: ItineraryDay[];
  discovered_places?: DiscoveredPlace[];
  budget: BudgetBreakdown;
  change_log: ChangeLogEntry[];
  agent_logs: AgentStepLog[];
  validation_notes: string[];
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: number;
  trip_id: number;
  booking_reference: string;
  booking_type: 'flight' | 'hotel' | 'activity' | 'package';
  title: string;
  provider: string;
  booking_status: 'Confirmed (Simulated)' | 'Modified' | 'Cancelled' | 'Pending Approval';
  price: number;
  currency: string;
  source_status: SourceStatus;
  check_in_or_date: string;
  check_out_or_return: string;
  guests: number;
  cancellation_terms: string;
  passengers: string[];
  confirmation_data: Record<string, unknown>;
  voucher_code: string;
  created_at: string;
}

export interface ApprovalRecord {
  id: number;
  trip_id: number | null;
  booking_id: number | null;
  action_type: string;
  summary: string;
  fee_impact_inr: number;
  status: 'pending' | 'approved' | 'declined';
  approved_by: string;
  created_at: string;
  resolved_at: string | null;
}

export interface ChatMessageRecord {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  missing_fields?: string[];
  agent_logs?: AgentStepLog[];
  trip_id?: number | null;
  created_at: string;
}
