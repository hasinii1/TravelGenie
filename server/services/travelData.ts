import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  DestinationOption,
  DiscoveredPlace,
  FlightOption,
  HotelOption,
  ItineraryActivity,
  SourceStatus,
} from '../../src/types/travel.ts';
import { EXTRA_CATALOG_DESTINATIONS, EXTRA_POIS_BY_CITY_ID } from './placesCatalog.ts';

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  region: string;
  country: string;
  source_status: SourceStatus;
}

export interface WeatherDay {
  date: string;
  condition: string;
  temp_max_c: number;
  temp_min_c: number;
  rain_probability_pct: number;
  source_status: SourceStatus;
}

export interface CatalogDestination {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  airport_code: string;
  image_key: string;
  summary: string;
  tags: string[];
  ideal_days: [number, number];
  daily_base_cost_inr: number;
  avg_temp_c: number;
  rain_risk_pct: number;
  weather_summary: string;
  pois: Array<{
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
  }>;
  hotels: Array<{
    name: string;
    tier: 'budget' | 'midrange' | 'boutique';
    area: string;
    lat: number;
    lng: number;
    price_per_night: number;
    distance_km: number;
    rating: number;
    breakfast_included: boolean;
    amenities: string[];
    cancellation_terms: string;
  }>;
}

export const DESTINATION_CATALOG: CatalogDestination[] = [
  {
    id: 'goa',
    name: 'Goa',
    region: 'Konkan Coast',
    country: 'India',
    lat: 15.4909,
    lng: 73.8278,
    airport_code: 'GOI',
    image_key: 'goa',
    summary: 'Sun-drenched beaches, Portuguese heritage quarters, coastal water sports, and vibrant evening promenades.',
    tags: ['beaches', 'adventure', 'nightlife', 'food', 'relaxation', 'watersports', 'culture', 'friends'],
    ideal_days: [3, 6],
    daily_base_cost_inr: 3400,
    avg_temp_c: 29,
    rain_risk_pct: 12,
    weather_summary: 'Clear coastal breeze, warm evenings (24–30°C)',
    pois: [
      {
        title: 'Baga & Calangute Coastal Stretch',
        category: 'Beaches',
        is_indoor: false,
        lat: 15.5553,
        lng: 73.7517,
        opening_hours: '06:00 - 22:00',
        duration_minutes: 150,
        estimated_cost_inr: 400,
        description: 'Signature North Goa shoreline ideal for morning walks and shoreline cafes.',
        crowd_level: 'High',
      },
      {
        title: 'Anjuna Water Sports & Parasailing',
        category: 'Adventure',
        is_indoor: false,
        lat: 15.5736,
        lng: 73.7407,
        opening_hours: '09:00 - 17:30',
        duration_minutes: 150,
        estimated_cost_inr: 1500,
        description: 'Jet-skiing, banana boat rides, and parasailing along Anjuna cove.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Chapora Fort Sunset Overlook',
        category: 'Sightseeing',
        is_indoor: false,
        lat: 15.6064,
        lng: 73.7365,
        opening_hours: '07:00 - 19:00',
        duration_minutes: 90,
        estimated_cost_inr: 0,
        description: 'Panoramic red-laterite hilltop fort overlooking Vagator Beach and the Arabian Sea.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Fontainhas Latin Quarter Walk',
        category: 'Culture',
        is_indoor: false,
        lat: 15.4959,
        lng: 73.8304,
        opening_hours: '08:00 - 20:00',
        duration_minutes: 120,
        estimated_cost_inr: 300,
        description: 'Ochre-walled heritage lanes, bakeries, and quiet Indo-Portuguese architecture in Panjim.',
        crowd_level: 'Low',
      },
      {
        title: 'Basilica of Bom Jesus & Old Goa Museums',
        category: 'Culture',
        is_indoor: true,
        lat: 15.5009,
        lng: 73.9116,
        opening_hours: '09:00 - 18:30',
        duration_minutes: 120,
        estimated_cost_inr: 150,
        description: 'UNESCO heritage sanctuary and sheltered archaeological gallery ideal during midday heat or rain.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Houses of Goa Architectural Museum',
        category: 'Culture',
        is_indoor: true,
        lat: 15.5245,
        lng: 73.8295,
        opening_hours: '10:00 - 19:30',
        duration_minutes: 90,
        estimated_cost_inr: 250,
        description: 'Ship-shaped indoor architectural museum showcasing Goan coastal craft and heritage.',
        crowd_level: 'Low',
      },
      {
        title: 'Goa State Museum & Art Gallery',
        category: 'Museum',
        is_indoor: true,
        lat: 15.4922,
        lng: 73.8355,
        opening_hours: '09:30 - 17:30',
        duration_minutes: 110,
        estimated_cost_inr: 100,
        description: 'Sheltered cultural galleries covering maritime history, sculptures, and folk art.',
        crowd_level: 'Low',
      },
      {
        title: 'Tito’s Lane & Coastal Nightlife Trail',
        category: 'Nightlife',
        is_indoor: true,
        lat: 15.5567,
        lng: 73.7536,
        opening_hours: '19:00 - 01:30',
        duration_minutes: 150,
        estimated_cost_inr: 1200,
        description: 'Live acoustic shacks, coastal tapas, and evening music lounges in North Goa.',
        crowd_level: 'High',
      },
      {
        title: 'Kakolem Secret Cove & Kayaking',
        category: 'Beaches',
        is_indoor: false,
        lat: 15.0882,
        lng: 73.9631,
        opening_hours: '07:00 - 17:30',
        duration_minutes: 160,
        estimated_cost_inr: 700,
        description: 'Secluded southern cove surrounded by cliffs for uncrowded swimming and kayaking.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Palm Cove Hostel & Suites',
        tier: 'budget',
        area: 'Calangute-Baga Link Road',
        lat: 15.548,
        lng: 73.761,
        price_per_night: 1500,
        distance_km: 1.1,
        rating: 4.2,
        breakfast_included: false,
        amenities: ['Wi-Fi', 'AC Rooms', '24h Desk', 'Scooter Rental Help'],
        cancellation_terms: 'Free cancellation up to 48 hours before check-in; ₹500 fee thereafter.',
      },
      {
        name: 'Sea Breeze Courtyard Stay',
        tier: 'budget',
        area: 'Anjuna Coastline',
        lat: 15.575,
        lng: 73.748,
        price_per_night: 2000,
        distance_km: 0.5,
        rating: 4.5,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Wi-Fi', 'Courtyard Lounge', 'AC'],
        cancellation_terms: 'Free cancellation up to 24 hours prior; 25% fee within 24 hours.',
      },
      {
        name: 'Casa Mandovi Heritage Inn',
        tier: 'midrange',
        area: 'Fontainhas, Panjim',
        lat: 15.496,
        lng: 73.831,
        price_per_night: 3400,
        distance_km: 0.4,
        rating: 4.6,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Courtyard Pool', 'Airport Shuttle', 'Wi-Fi'],
        cancellation_terms: 'Free cancellation up to 72 hours before check-in.',
      },
    ],
  },
  {
    id: 'munnar',
    name: 'Munnar',
    region: 'Western Ghats, Kerala',
    country: 'India',
    lat: 10.0889,
    lng: 77.0595,
    airport_code: 'COK',
    image_key: 'munnar',
    summary: 'High-altitude tea estates, shola cloud forests, misty mountain viewpoints, and spice plantations.',
    tags: ['mountains', 'nature', 'photography', 'adventure', 'trekking', 'tea', 'relaxation', 'kerala'],
    ideal_days: [3, 5],
    daily_base_cost_inr: 2800,
    avg_temp_c: 20,
    rain_risk_pct: 18,
    weather_summary: 'Crisp mountain mornings, cool mist (14–22°C)',
    pois: [
      {
        title: 'Kolukkumalai Sunrise Ridge',
        category: 'Mountains',
        is_indoor: false,
        lat: 10.0793,
        lng: 77.2215,
        opening_hours: '05:30 - 16:00',
        duration_minutes: 180,
        estimated_cost_inr: 900,
        description: 'World’s highest organic tea plantation ridge with sweeping sunrise vistas.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Eravikulam National Park',
        category: 'Nature',
        is_indoor: false,
        lat: 10.1995,
        lng: 77.0558,
        opening_hours: '07:30 - 16:00',
        duration_minutes: 150,
        estimated_cost_inr: 250,
        description: 'Rolling alpine grasslands and Nilgiri Tahr habitat beneath Anamudi Peak.',
        crowd_level: 'High',
      },
      {
        title: 'Tata Tea Museum & Tasting Pavilion',
        category: 'Culture',
        is_indoor: true,
        lat: 10.0897,
        lng: 77.0517,
        opening_hours: '09:00 - 16:30',
        duration_minutes: 90,
        estimated_cost_inr: 150,
        description: 'Indoor heritage tea processing gallery with guided single-estate tea tasting.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Kundala Dam & Shola Valley',
        category: 'Photography',
        is_indoor: false,
        lat: 10.1436,
        lng: 77.1972,
        opening_hours: '09:00 - 17:00',
        duration_minutes: 100,
        estimated_cost_inr: 200,
        description: 'Mirror-still reservoir framed by eucalyptus ridges and quiet pedal boating.',
        crowd_level: 'Low',
      },
      {
        title: 'Kalari Kshethra Traditional Arts Hall',
        category: 'Culture',
        is_indoor: true,
        lat: 10.0258,
        lng: 77.0642,
        opening_hours: '17:00 - 20:00',
        duration_minutes: 90,
        estimated_cost_inr: 350,
        description: 'Indoor Kathakali classical performance and Kalaripayattu martial arts showcase.',
        crowd_level: 'Low',
      },
      {
        title: 'Ripple Tea Spice & Ayurveda Conservatory',
        category: 'Wellness',
        is_indoor: true,
        lat: 10.068,
        lng: 77.057,
        opening_hours: '09:30 - 18:30',
        duration_minutes: 90,
        estimated_cost_inr: 450,
        description: 'Sheltered spice aroma workshop and warm herbal tasting studio.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Mist Ridge Homestay',
        tier: 'budget',
        area: 'Chithirapuram Hills',
        lat: 10.056,
        lng: 77.058,
        price_per_night: 1600,
        distance_km: 3.4,
        rating: 4.3,
        breakfast_included: true,
        amenities: ['Tea View Balcony', 'Breakfast Included', 'Wi-Fi', 'Bonfire'],
        cancellation_terms: 'Free cancellation up to 48 hours prior.',
      },
      {
        name: 'Tea Valley Courtyard Lodge',
        tier: 'midrange',
        area: 'Old Munnar',
        lat: 10.089,
        lng: 77.062,
        price_per_night: 2900,
        distance_km: 0.7,
        rating: 4.6,
        breakfast_included: true,
        amenities: ['Mountain Terrace', 'Breakfast Included', 'Heater', 'Travel Desk'],
        cancellation_terms: 'Free cancellation up to 24 hours prior; ₹500 change fee.',
      },
    ],
  },
  {
    id: 'coorg',
    name: 'Coorg',
    region: 'Kodagu, Karnataka',
    country: 'India',
    lat: 12.3375,
    lng: 75.8069,
    airport_code: 'CNN',
    image_key: 'coorg',
    summary: 'Misty coffee estates, cascading forest waterfalls, elephant camps, and dramatic valley viewpoints.',
    tags: ['mountains', 'nature', 'photography', 'waterfall', 'coffee', 'adventure', 'trekking'],
    ideal_days: [3, 5],
    daily_base_cost_inr: 2900,
    avg_temp_c: 22,
    rain_risk_pct: 20,
    weather_summary: 'Cool misty slopes and lush shade (17–24°C)',
    pois: [
      {
        title: 'Abbey Falls Rainforest Walk',
        category: 'Nature',
        is_indoor: false,
        lat: 12.4566,
        lng: 75.7165,
        opening_hours: '09:00 - 17:00',
        duration_minutes: 90,
        estimated_cost_inr: 100,
        description: 'Suspension bridge viewpoint over cascading waterfalls framed by coffee and spice groves.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Raja’s Seat Sunset Panorama',
        category: 'Photography',
        is_indoor: false,
        lat: 12.4152,
        lng: 75.7367,
        opening_hours: '06:00 - 20:00',
        duration_minutes: 90,
        estimated_cost_inr: 50,
        description: 'Cliffside garden pavilion looking out across layers of Western Ghats mist.',
        crowd_level: 'High',
      },
      {
        title: 'Madikeri Fort & Museum',
        category: 'Culture',
        is_indoor: true,
        lat: 12.4209,
        lng: 75.7385,
        opening_hours: '10:00 - 17:30',
        duration_minutes: 90,
        estimated_cost_inr: 100,
        description: '17th-century stone fort and sheltered Kodava heritage gallery.',
        crowd_level: 'Low',
      },
      {
        title: 'Single-Estate Coffee Roastery Tasting',
        category: 'Food',
        is_indoor: true,
        lat: 12.362,
        lng: 75.785,
        opening_hours: '09:30 - 18:00',
        duration_minutes: 105,
        estimated_cost_inr: 400,
        description: 'Covered estate roasting tour and pour-over arabica tasting session.',
        crowd_level: 'Low',
      },
      {
        title: 'Mandalpatti Jeep Ridge Trek',
        category: 'Adventure',
        is_indoor: false,
        lat: 12.5367,
        lng: 75.7024,
        opening_hours: '06:00 - 17:30',
        duration_minutes: 180,
        estimated_cost_inr: 1200,
        description: 'High-elevation grassland ridge offering dramatic cloud-sea views.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Kodagu Planter’s Bunk & Stay',
        tier: 'budget',
        area: 'Madikeri Town',
        lat: 12.424,
        lng: 75.739,
        price_per_night: 1700,
        distance_km: 0.9,
        rating: 4.3,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Estate Coffee', 'Wi-Fi', 'Parking'],
        cancellation_terms: 'Free cancellation up to 48 hours prior.',
      },
      {
        name: 'Misty Arabica Estate Cottages',
        tier: 'midrange',
        area: 'Suntikoppa Valley',
        lat: 12.463,
        lng: 75.818,
        price_per_night: 3100,
        distance_km: 4.2,
        rating: 4.6,
        breakfast_included: true,
        amenities: ['Estate Trail', 'Breakfast Included', 'Fireplace', 'Wi-Fi'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
    ],
  },
  {
    id: 'ooty',
    name: 'Ooty',
    region: 'Nilgiris, Tamil Nadu',
    country: 'India',
    lat: 11.4102,
    lng: 76.695,
    airport_code: 'CJB',
    image_key: 'ooty',
    summary: 'Nilgiri mountain railway heritage, botanical terraces, pine valleys, and calm high-altitude lakes.',
    tags: ['mountains', 'nature', 'photography', 'sightseeing', 'relaxation', 'heritage'],
    ideal_days: [3, 4],
    daily_base_cost_inr: 2600,
    avg_temp_c: 19,
    rain_risk_pct: 14,
    weather_summary: 'Crisp blue skies and brisk mountain air (13–21°C)',
    pois: [
      {
        title: 'Doddabetta Peak Observatory',
        category: 'Mountains',
        is_indoor: false,
        lat: 11.4008,
        lng: 76.7358,
        opening_hours: '07:00 - 18:00',
        duration_minutes: 100,
        estimated_cost_inr: 100,
        description: 'Highest point in the Nilgiris with panoramic ridge telescopes.',
        crowd_level: 'High',
      },
      {
        title: 'Nilgiri Mountain Toy Train Ride',
        category: 'Heritage',
        is_indoor: true,
        lat: 11.4057,
        lng: 76.6968,
        opening_hours: '09:00 - 17:30',
        duration_minutes: 120,
        estimated_cost_inr: 300,
        description: 'Covered heritage coach journey winding through Coonoor and Ooty pine tunnels.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Government Botanical Gardens',
        category: 'Nature',
        is_indoor: false,
        lat: 11.4184,
        lng: 76.7114,
        opening_hours: '07:00 - 18:30',
        duration_minutes: 120,
        estimated_cost_inr: 150,
        description: '55-acre tiered Victorian botanical conservatory with glasshouse.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Tea Factory & Chocolate Museum',
        category: 'Food',
        is_indoor: true,
        lat: 11.4055,
        lng: 76.7219,
        opening_hours: '09:00 - 19:00',
        duration_minutes: 90,
        estimated_cost_inr: 250,
        description: 'Indoor Nilgiri tea processing demonstration and handmade cocoa workshop.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Nilgiri Pine Lodge',
        tier: 'budget',
        area: 'Charring Cross, Ooty',
        lat: 11.412,
        lng: 76.701,
        price_per_night: 1550,
        distance_km: 0.8,
        rating: 4.1,
        breakfast_included: false,
        amenities: ['Heater on Request', 'Wi-Fi', '24h Hot Water'],
        cancellation_terms: 'Free cancellation up to 48 hours prior.',
      },
      {
        name: 'Fern Hill Verandah Inn',
        tier: 'midrange',
        area: 'Fern Hill',
        lat: 11.403,
        lng: 76.689,
        price_per_night: 2700,
        distance_km: 1.5,
        rating: 4.5,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Garden Lawn', 'Wi-Fi'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
    ],
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    region: 'Rajasthan',
    country: 'India',
    lat: 26.9124,
    lng: 75.7873,
    airport_code: 'JAI',
    image_key: 'goa',
    summary: 'Pink sandstone palaces, hilltop forts, astronomical heritage, and vibrant craft bazaars.',
    tags: ['culture', 'heritage', 'photography', 'food', 'sightseeing'],
    ideal_days: [3, 5],
    daily_base_cost_inr: 3000,
    avg_temp_c: 26,
    rain_risk_pct: 5,
    weather_summary: 'Dry sunny afternoons and cool desert evenings (16–27°C)',
    pois: [
      {
        title: 'Amber Fort & Sheesh Mahal',
        category: 'Heritage',
        is_indoor: false,
        lat: 26.9855,
        lng: 75.8513,
        opening_hours: '08:00 - 17:30',
        duration_minutes: 150,
        estimated_cost_inr: 500,
        description: 'Hilltop Rajput fortress overlooking Maota Lake.',
        crowd_level: 'High',
      },
      {
        title: 'City Palace & Textile Museum',
        category: 'Culture',
        is_indoor: true,
        lat: 26.9258,
        lng: 75.8237,
        opening_hours: '09:30 - 17:00',
        duration_minutes: 120,
        estimated_cost_inr: 400,
        description: 'Courtyard royal complex with sheltered textile and armory galleries.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Albert Hall Museum',
        category: 'Museum',
        is_indoor: true,
        lat: 26.9116,
        lng: 75.8194,
        opening_hours: '09:00 - 17:00',
        duration_minutes: 100,
        estimated_cost_inr: 200,
        description: 'Indo-Saracenic central museum housing miniature paintings and sculptures.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Hawa Haveli Guesthouse',
        tier: 'budget',
        area: 'Bani Park',
        lat: 26.926,
        lng: 75.792,
        price_per_night: 1650,
        distance_km: 1.8,
        rating: 4.3,
        breakfast_included: true,
        amenities: ['Rooftop Chai', 'Breakfast Included', 'Wi-Fi', 'AC'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
    ],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    region: 'Maharashtra Coast',
    country: 'India',
    lat: 19.076,
    lng: 72.8777,
    airport_code: 'BOM',
    image_key: 'hotel',
    summary: 'Victorian Gothic waterfronts, Marine Drive sunsets, Colaba art museums, island caves, and coastal street food.',
    tags: ['beaches', 'culture', 'nightlife', 'food', 'heritage', 'photography', 'city', 'shopping'],
    ideal_days: [2, 5],
    daily_base_cost_inr: 3600,
    avg_temp_c: 29,
    rain_risk_pct: 10,
    weather_summary: 'Warm sea breeze along Arabian Sea (24–31°C)',
    pois: [
      {
        title: 'Gateway of India & Apollo Bunder Waterfront',
        category: 'Heritage',
        is_indoor: false,
        lat: 18.922,
        lng: 72.8347,
        opening_hours: '06:00 - 22:00',
        duration_minutes: 90,
        estimated_cost_inr: 0,
        description: 'Iconic basalt harbour arch overlooking Mumbai Harbour and Colaba promenade.',
        crowd_level: 'High',
      },
      {
        title: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
        category: 'Museum',
        is_indoor: true,
        lat: 18.9269,
        lng: 72.8325,
        opening_hours: '10:15 - 18:00',
        duration_minutes: 120,
        estimated_cost_inr: 150,
        description: 'Indo-Saracenic flagship museum featuring ancient sculptures, miniature art, and natural history galleries.',
        crowd_level: 'Low',
      },
      {
        title: 'Kala Ghoda Art Precinct & Jehangir Gallery',
        category: 'Culture',
        is_indoor: true,
        lat: 18.9278,
        lng: 72.832,
        opening_hours: '11:00 - 19:00',
        duration_minutes: 105,
        estimated_cost_inr: 250,
        description: 'Walkable heritage arts district with sheltered contemporary galleries and historic Irani cafes.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Marine Drive & Chowpatty Evening Promenade',
        category: 'Beaches',
        is_indoor: false,
        lat: 18.9438,
        lng: 72.823,
        opening_hours: '05:30 - 23:30',
        duration_minutes: 120,
        estimated_cost_inr: 300,
        description: 'Queen’s Necklace seafront curve ideal for sunset walks and Girgaum coastal snacks.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Elephanta Caves Island Ferry',
        category: 'Heritage',
        is_indoor: true,
        lat: 18.9633,
        lng: 72.9315,
        opening_hours: '09:00 - 17:30',
        duration_minutes: 210,
        estimated_cost_inr: 450,
        description: 'UNESCO rock-cut basalt temple caves on Gharapuri Island reached by harbour ferry.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Bandra Bandstand & Carter Road Waterfront',
        category: 'Nightlife',
        is_indoor: false,
        lat: 19.0442,
        lng: 72.8203,
        opening_hours: '06:00 - 00:30',
        duration_minutes: 120,
        estimated_cost_inr: 800,
        description: 'Sea-breeze promenade facing Bandra-Worli Sea Link with independent cafes and evening lounges.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Dr. Bhau Daji Lad City Museum',
        category: 'Museum',
        is_indoor: true,
        lat: 18.9791,
        lng: 72.8348,
        opening_hours: '10:00 - 17:30',
        duration_minutes: 90,
        estimated_cost_inr: 100,
        description: 'Mumbai’s oldest Victorian decorative arts museum inside Byculla botanical grounds.',
        crowd_level: 'Low',
      },
      {
        title: 'Sanjay Gandhi National Park & Kanheri Caves',
        category: 'Nature',
        is_indoor: false,
        lat: 19.2084,
        lng: 72.9056,
        opening_hours: '08:00 - 17:30',
        duration_minutes: 165,
        estimated_cost_inr: 250,
        description: 'Forested urban sanctuary with ancient Buddhist rock-cut monasteries and cycling trails.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Colaba Causeway Backpacker Pod',
        tier: 'budget',
        area: 'Colaba, South Mumbai',
        lat: 18.9185,
        lng: 72.8307,
        price_per_night: 1900,
        distance_km: 0.6,
        rating: 4.3,
        breakfast_included: false,
        amenities: ['Wi-Fi', 'AC Rooms', '24h Reception', 'Walkable to Harbour'],
        cancellation_terms: 'Free cancellation up to 48 hours prior; ₹500 simulated fee thereafter.',
      },
      {
        name: 'Marine Bay Heritage Suites',
        tier: 'midrange',
        area: 'Churchgate / Marine Drive',
        lat: 18.9346,
        lng: 72.8266,
        price_per_night: 3600,
        distance_km: 0.4,
        rating: 4.6,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Sea View Lounge', 'Wi-Fi', 'Airport Cab'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
      {
        name: 'Bandra Courtyard Boutique',
        tier: 'boutique',
        area: 'Pali Hill, Bandra West',
        lat: 19.0604,
        lng: 72.8277,
        price_per_night: 4800,
        distance_km: 1.2,
        rating: 4.7,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Cafe Terrace', 'Wi-Fi', 'AC'],
        cancellation_terms: 'Free cancellation up to 72 hours prior.',
      },
    ],
  },
  {
    id: 'udaipur',
    name: 'Udaipur',
    region: 'Mewar, Rajasthan',
    country: 'India',
    lat: 24.5854,
    lng: 73.7125,
    airport_code: 'UDR',
    image_key: 'jaipur',
    summary: 'Marble lake palaces, Aravalli sunset cable cars, courtyard museums, and tranquil boat rides on Lake Pichola.',
    tags: ['heritage', 'culture', 'photography', 'relaxation', 'food', 'romantic'],
    ideal_days: [3, 5],
    daily_base_cost_inr: 3100,
    avg_temp_c: 25,
    rain_risk_pct: 6,
    weather_summary: 'Clear golden sunshine and cool lakeside evenings (15–26°C)',
    pois: [
      {
        title: 'City Palace Museum & Crystal Gallery',
        category: 'Heritage',
        is_indoor: true,
        lat: 24.5764,
        lng: 73.6835,
        opening_hours: '09:30 - 17:30',
        duration_minutes: 150,
        estimated_cost_inr: 400,
        description: 'Sprawling lakeside Mewar palace courtyards and sheltered royal galleries.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Lake Pichola Sunset Boat & Jagmandir',
        category: 'Sightseeing',
        is_indoor: false,
        lat: 24.572,
        lng: 73.6795,
        opening_hours: '10:00 - 18:30',
        duration_minutes: 90,
        estimated_cost_inr: 500,
        description: 'Calm scenic boat circuit past ghats and marble island pavilions.',
        crowd_level: 'Moderate',
      },
      {
        title: 'Bagore Ki Haveli Folk Museum',
        category: 'Culture',
        is_indoor: true,
        lat: 24.5798,
        lng: 73.6811,
        opening_hours: '09:30 - 20:00',
        duration_minutes: 100,
        estimated_cost_inr: 200,
        description: '18th-century waterfront haveli hosting museum rooms and evening puppetry.',
        crowd_level: 'Low',
      },
      {
        title: 'Sajjangarh Monsoon Palace Ridge',
        category: 'Photography',
        is_indoor: false,
        lat: 24.5934,
        lng: 73.6386,
        opening_hours: '09:00 - 18:00',
        duration_minutes: 110,
        estimated_cost_inr: 350,
        description: 'Hilltop Aravalli palace overlooking Fateh Sagar Lake and Udaipur valley.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Lal Ghat Lakeside Inn',
        tier: 'budget',
        area: 'Old City, Lake Pichola',
        lat: 24.5795,
        lng: 73.6815,
        price_per_night: 1750,
        distance_km: 0.4,
        rating: 4.4,
        breakfast_included: true,
        amenities: ['Rooftop Lake View', 'Breakfast Included', 'Wi-Fi', 'AC'],
        cancellation_terms: 'Free cancellation up to 48 hours prior.',
      },
    ],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    region: 'National Capital Region',
    country: 'India',
    lat: 28.6139,
    lng: 77.209,
    airport_code: 'DEL',
    image_key: 'jaipur',
    summary: 'Mughal monuments, Humayun’s Tomb gardens, National Museum galleries, and Chandni Chowk culinary trails.',
    tags: ['heritage', 'culture', 'food', 'photography', 'sightseeing', 'museum'],
    ideal_days: [2, 5],
    daily_base_cost_inr: 3200,
    avg_temp_c: 23,
    rain_risk_pct: 8,
    weather_summary: 'Pleasant daytime sun and crisp evenings (14–24°C)',
    pois: [
      {
        title: 'Humayun’s Tomb & Sunder Nursery',
        category: 'Heritage',
        is_indoor: false,
        lat: 28.5933,
        lng: 77.2507,
        opening_hours: '06:00 - 18:00',
        duration_minutes: 150,
        estimated_cost_inr: 150,
        description: 'UNESCO Mughal garden tomb paired with botanical heritage pavilions.',
        crowd_level: 'Moderate',
      },
      {
        title: 'National Museum of India',
        category: 'Museum',
        is_indoor: true,
        lat: 28.6119,
        lng: 77.2193,
        opening_hours: '10:00 - 18:00',
        duration_minutes: 130,
        estimated_cost_inr: 100,
        description: 'Indoor flagship galleries spanning 5,000 years of South Asian art and sculpture.',
        crowd_level: 'Low',
      },
      {
        title: 'Lodhi Art District & Gardens',
        category: 'Photography',
        is_indoor: false,
        lat: 28.5931,
        lng: 77.2197,
        opening_hours: '06:00 - 20:00',
        duration_minutes: 105,
        estimated_cost_inr: 0,
        description: 'Open-air mural precinct adjacent to 15th-century landscaped stone tombs.',
        crowd_level: 'Low',
      },
      {
        title: 'Crafts Museum & Bhairon Marg Pavilion',
        category: 'Culture',
        is_indoor: true,
        lat: 28.6131,
        lng: 77.2416,
        opening_hours: '10:00 - 17:30',
        duration_minutes: 100,
        estimated_cost_inr: 100,
        description: 'Sheltered textile, woodwork, and regional craft exhibition halls with courtyard cafe.',
        crowd_level: 'Low',
      },
    ],
    hotels: [
      {
        name: 'Connaught Heritage Lodge',
        tier: 'budget',
        area: 'Connaught Place',
        lat: 28.6315,
        lng: 77.2167,
        price_per_night: 1950,
        distance_km: 1.1,
        rating: 4.3,
        breakfast_included: true,
        amenities: ['Metro Access', 'Breakfast Included', 'Wi-Fi', 'AC'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
    ],
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    lat: 12.9716,
    lng: 77.5946,
    airport_code: 'BLR',
    image_key: 'coorg',
    summary: 'Botanical parks, Art Deco cafes, craft breweries, science museums, and shaded boulevards.',
    tags: ['food', 'nightlife', 'culture', 'nature', 'city', 'relaxation'],
    ideal_days: [2, 4],
    daily_base_cost_inr: 3100,
    avg_temp_c: 24,
    rain_risk_pct: 12,
    weather_summary: 'Breezy highland plateau climate (18–26°C)',
    pois: [
      {
        title: 'Lalbagh Botanical Garden & Glass House',
        category: 'Nature',
        is_indoor: false,
        lat: 12.9507,
        lng: 77.5848,
        opening_hours: '06:00 - 19:00',
        duration_minutes: 120,
        estimated_cost_inr: 50,
        description: 'Historic 240-acre botanical reserve with century-old rain trees.',
        crowd_level: 'Moderate',
      },
      {
        title: 'National Gallery of Modern Art',
        category: 'Museum',
        is_indoor: true,
        lat: 12.9896,
        lng: 77.5882,
        opening_hours: '11:00 - 18:30',
        duration_minutes: 110,
        estimated_cost_inr: 100,
        description: 'Heritage mansion museum hosting modern Indian sculpture and painting collections.',
        crowd_level: 'Low',
      },
      {
        title: 'Indiranagar 100ft Road Cafe & Music Trail',
        category: 'Nightlife',
        is_indoor: true,
        lat: 12.9784,
        lng: 77.6408,
        opening_hours: '12:00 - 00:30',
        duration_minutes: 140,
        estimated_cost_inr: 1100,
        description: 'Specialty coffee roasteries, microbreweries, and acoustic venues.',
        crowd_level: 'Moderate',
      },
    ],
    hotels: [
      {
        name: 'Cubbon Park Terrace Stay',
        tier: 'budget',
        area: 'MG Road / Church Street',
        lat: 12.9756,
        lng: 77.6047,
        price_per_night: 1850,
        distance_km: 0.7,
        rating: 4.4,
        breakfast_included: true,
        amenities: ['Metro Walkable', 'Breakfast Included', 'Wi-Fi', 'AC'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
    ],
  },
];

// Merge expanded POIs into base catalog destinations and append all 20+ curated Indian cities
for (const baseDest of DESTINATION_CATALOG) {
  const extras = EXTRA_POIS_BY_CITY_ID[baseDest.id];
  if (extras?.length) {
    for (const p of extras) {
      if (!baseDest.pois.some((existing) => existing.title.toLowerCase() === p.title.toLowerCase())) {
        baseDest.pois.push(p);
      }
    }
  }
}
for (const extraDest of EXTRA_CATALOG_DESTINATIONS) {
  if (!DESTINATION_CATALOG.some((d) => d.id === extraDest.id)) {
    DESTINATION_CATALOG.push(extraDest);
  }
}

// Simple Nominatim throttle + cache (max 1 req/sec per OSM usage policy)
let lastNominatimCall = 0;
const geocodeCache = new Map<string, GeoPoint>();

const KNOWN_CITY_COORDS: Record<string, { name: string; lat: number; lng: number; region: string; country: string }> = {
  hyderabad: { name: 'Hyderabad', lat: 17.385, lng: 78.4867, region: 'Telangana', country: 'India' },
  shimla: { name: 'Shimla', lat: 31.1048, lng: 77.1734, region: 'Himachal Pradesh', country: 'India' },
  manali: { name: 'Manali', lat: 32.2432, lng: 77.1892, region: 'Himachal Pradesh', country: 'India' },
  varanasi: { name: 'Varanasi', lat: 25.3176, lng: 82.9739, region: 'Uttar Pradesh', country: 'India' },
  pune: { name: 'Pune', lat: 18.5204, lng: 73.8567, region: 'Maharashtra', country: 'India' },
  kolkata: { name: 'Kolkata', lat: 22.5726, lng: 88.3639, region: 'West Bengal', country: 'India' },
  chennai: { name: 'Chennai', lat: 13.0827, lng: 80.2707, region: 'Tamil Nadu', country: 'India' },
  kochi: { name: 'Kochi', lat: 9.9312, lng: 76.2673, region: 'Kerala', country: 'India' },
  rishikesh: { name: 'Rishikesh', lat: 30.0869, lng: 78.2676, region: 'Uttarakhand', country: 'India' },
  darjeeling: { name: 'Darjeeling', lat: 27.041, lng: 88.2663, region: 'West Bengal', country: 'India' },
  leh: { name: 'Leh', lat: 34.1526, lng: 77.5771, region: 'Ladakh', country: 'India' },
  amritsar: { name: 'Amritsar', lat: 31.634, lng: 74.8723, region: 'Punjab', country: 'India' },
  agra: { name: 'Agra', lat: 27.1767, lng: 78.0081, region: 'Uttar Pradesh', country: 'India' },
  mysuru: { name: 'Mysuru', lat: 12.2958, lng: 76.6394, region: 'Karnataka', country: 'India' },
  mysore: { name: 'Mysuru', lat: 12.2958, lng: 76.6394, region: 'Karnataka', country: 'India' },
  ahmedabad: { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, region: 'Gujarat', country: 'India' },
  srinagar: { name: 'Srinagar', lat: 34.0837, lng: 74.7973, region: 'Jammu & Kashmir', country: 'India' },
  pondicherry: { name: 'Pondicherry', lat: 11.9416, lng: 79.8083, region: 'Puducherry', country: 'India' },
  puducherry: { name: 'Pondicherry', lat: 11.9416, lng: 79.8083, region: 'Puducherry', country: 'India' },
  hampi: { name: 'Hampi', lat: 15.335, lng: 76.46, region: 'Karnataka', country: 'India' },
  lonavala: { name: 'Lonavala', lat: 18.7557, lng: 73.4091, region: 'Maharashtra', country: 'India' },
  nainital: { name: 'Nainital', lat: 29.3919, lng: 79.4542, region: 'Uttarakhand', country: 'India' },
  gangtok: { name: 'Gangtok', lat: 27.3314, lng: 88.6138, region: 'Sikkim', country: 'India' },
  jodhpur: { name: 'Jodhpur', lat: 26.2389, lng: 73.0243, region: 'Rajasthan', country: 'India' },
  vizag: { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, region: 'Andhra Pradesh', country: 'India' },
  visakhapatnam: { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, region: 'Andhra Pradesh', country: 'India' },
};

export async function geocodeLocation(query: string): Promise<GeoPoint> {
  const key = query.trim().toLowerCase();
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  const catalogMatch = DESTINATION_CATALOG.find(
    (d) => key.includes(d.name.toLowerCase()) || key.includes(d.region.toLowerCase())
  );

  try {
    const now = Date.now();
    const waitMs = Math.max(0, 1050 - (now - lastNominatimCall));
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs));
    }
    lastNominatimCall = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TravelGenie-AIStudio-Prototype/1.0 (contact@travelgenie.local)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      if (data && data.length > 0) {
        const parts = data[0].display_name.split(',').map((s) => s.trim());
        const point: GeoPoint = {
          name: parts[0] || query,
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
          region: parts[1] || catalogMatch?.region || 'India',
          country: parts[parts.length - 1] || 'India',
          source_status: 'Live',
        };
        geocodeCache.set(key, point);
        return point;
      }
    }
  } catch {
    // Graceful fallback below
  }

  if (catalogMatch) {
    const fallback: GeoPoint = {
      name: catalogMatch.name,
      lat: catalogMatch.lat,
      lng: catalogMatch.lng,
      region: catalogMatch.region,
      country: catalogMatch.country,
      source_status: 'Estimated',
    };
    geocodeCache.set(key, fallback);
    return fallback;
  }

  const knownMatch = Object.entries(KNOWN_CITY_COORDS).find(([cityKey]) => key.includes(cityKey));
  if (knownMatch) {
    const fallback: GeoPoint = {
      ...knownMatch[1],
      source_status: 'Estimated',
    };
    geocodeCache.set(key, fallback);
    return fallback;
  }

  const defaultPoint: GeoPoint = {
    name: query,
    lat: 21.1458,
    lng: 79.0882,
    region: 'India',
    country: 'India',
    source_status: 'Estimated',
  };
  geocodeCache.set(key, defaultPoint);
  return defaultPoint;
}

const weatherCache = new Map<string, WeatherDay[]>();

export async function fetchOpenMeteoForecast(
  lat: number,
  lng: number,
  daysCount: number
): Promise<WeatherDay[]> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${daysCount}`;
  if (weatherCache.has(cacheKey)) {
    return weatherCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${Math.min(
      Math.max(daysCount, 4),
      7
    )}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const json = (await res.json()) as {
        daily?: {
          time: string[];
          weathercode: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: number[];
        };
      };
      if (json.daily && json.daily.time?.length) {
        const result: WeatherDay[] = json.daily.time.slice(0, daysCount).map((date, idx) => ({
          date,
          condition: weatherCodeToLabel(json.daily!.weathercode[idx] ?? 1),
          temp_max_c: Math.round(json.daily!.temperature_2m_max[idx] ?? 28),
          temp_min_c: Math.round(json.daily!.temperature_2m_min[idx] ?? 21),
          rain_probability_pct: Math.round(json.daily!.precipitation_probability_max[idx] ?? 10),
          source_status: 'Live',
        }));
        weatherCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Fallback below
  }

  const fallback: WeatherDay[] = Array.from({ length: daysCount }, (_, i) => ({
    date: `Day ${i + 1}`,
    condition: i === 1 ? 'Partly Cloudy' : 'Clear Sky',
    temp_max_c: 29,
    temp_min_c: 22,
    rain_probability_pct: i === 1 ? 25 : 10,
    source_status: 'Estimated',
  }));
  weatherCache.set(cacheKey, fallback);
  return fallback;
}

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Morning Mist';
  if (code <= 67) return 'Light Rain';
  if (code <= 82) return 'Rain Showers';
  return 'Thunderstorm Risk';
}

export async function fetchOverpassPOIs(
  lat: number,
  lng: number,
  limit = 10
): Promise<Array<{ name: string; category: string; lat: number; lng: number; source_status: SourceStatus }>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const query = `[out:json][timeout:4];(node["tourism"~"attraction|museum|gallery|viewpoint|zoo"](around:15000,${lat},${lng});node["historic"~"fort|palace|monument|castle|ruins"](around:15000,${lat},${lng});node["natural"~"beach|waterfall|peak"](around:15000,${lat},${lng}););out body ${limit * 2};`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = (await res.json()) as {
        elements?: Array<{
          lat: number;
          lon: number;
          tags?: { name?: string; tourism?: string; historic?: string; natural?: string };
        }>;
      };
      const junkRe = /\b(bus stop|atm|parking|toilet|office|junction|chowk circle|statue of)\b/i;
      const seen = new Set<string>();
      const items: Array<{ name: string; category: string; lat: number; lng: number; source_status: SourceStatus }> = [];
      for (const el of json.elements || []) {
        const name = el.tags?.name?.trim();
        if (!name || name.length < 4 || junkRe.test(name)) continue;
        const norm = name.toLowerCase();
        if (seen.has(norm)) continue;
        seen.add(norm);
        const rawCat = el.tags?.tourism || el.tags?.historic || el.tags?.natural || 'Attraction';
        items.push({
          name,
          category: rawCat.charAt(0).toUpperCase() + rawCat.slice(1),
          lat: el.lat,
          lng: el.lon,
          source_status: 'Live',
        });
        if (items.length >= limit) break;
      }
      if (items.length > 0) return items;
    }
  } catch {
    // Graceful fallback
  }
  return [];
}

export async function fetchWikipediaGeoPlaces(
  lat: number,
  lng: number,
  limit = 22,
  cityName?: string
): Promise<Array<{ name: string; lat: number; lng: number; dist_m: number }>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=10000&gslimit=${Math.min(50, limit + 15)}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelGenie-AIStudio-Prototype/1.0 (https://travelgenie.local)' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = (await res.json()) as {
        query?: {
          geosearch?: Array<{ title: string; lat: number; lon: number; dist: number }>;
        };
      };
      const noiseRe =
        /\b(railway|junction|metro|station|school|college|university|institute|hospital|ward|taluka|tehsil|district|municipal|constituency|election|assembly|parliament|airport|expressway|bypass|police|barracks|prison|cemetery|headquarters|corporation|neighbourhood|suburb)\b/i;
      const landmarkBoostRe =
        /\b(temple|palace|mahal|fort|museum|gallery|garden|park|lake|beach|waterfall|falls|hill|peak|church|cathedral|mosque|stupa|monument|memorial|sanctuary|dam|caves|cave|observatory|ghat|zoo|pavilion)\b/i;
      const cleanCity = cityName?.trim().toLowerCase();

      const filtered = (json.query?.geosearch || [])
        .filter((item) => {
          const t = item.title?.trim();
          if (!t || noiseRe.test(t)) return false;
          const tl = t.toLowerCase();
          if (cleanCity && (tl === cleanCity || tl.endsWith(`, ${cleanCity}`))) return false;
          return true;
        })
        .sort((a, b) => {
          const aScore = landmarkBoostRe.test(a.title) ? 1 : 0;
          const bScore = landmarkBoostRe.test(b.title) ? 1 : 0;
          return bScore - aScore || a.dist - b.dist;
        })
        .slice(0, limit);

      return filtered.map((item) => ({
        name: item.title,
        lat: item.lat,
        lng: item.lon,
        dist_m: item.dist,
      }));
    }
  } catch {
    // Ignore external Wikipedia timeout
  }
  return [];
}

async function fetchGeminiCityLandmarks(
  cityName: string,
  lat: number,
  lng: number,
  interests: string[]
): Promise<CatalogDestination['pois']> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return [];

  try {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const promptPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `List 10 real, famous, verified tourist attractions in ${cityName} (near coordinates ${lat.toFixed(
        4
      )}, ${lng.toFixed(4)}). Traveller interests: ${
        interests.length ? interests.join(', ') : 'sightseeing, heritage, nature, food, museums'
      }.
CRITICAL:
- Return ONLY real landmarks that actually exist in or within 25km of ${cityName}. Never invent generic placeholders.
- Provide accurate WGS84 lat/lng coordinates for each landmark.
- Include at least 3 indoor museums/palaces/galleries (is_indoor: true) and 6-7 outdoor landmarks.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              is_indoor: { type: Type.BOOLEAN },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              opening_hours: { type: Type.STRING },
              duration_minutes: { type: Type.INTEGER },
              estimated_cost_inr: { type: Type.INTEGER },
              description: { type: Type.STRING },
              crowd_level: { type: Type.STRING },
            },
            required: ['title', 'category', 'is_indoor', 'lat', 'lng', 'description'],
          },
        },
      },
    });
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Gemini POI timeout')), 6000));
    const response = await Promise.race([promptPromise, timeout]);
    const list = JSON.parse((response.text ?? '[]').trim()) as Array<Record<string, unknown>>;

    return list
      .filter((p) => {
        const pLat = Number(p.lat);
        const pLng = Number(p.lng);
        return (
          typeof p.title === 'string' &&
          p.title.trim().length > 2 &&
          Number.isFinite(pLat) &&
          Number.isFinite(pLng) &&
          haversineKm(lat, lng, pLat, pLng) <= 35
        );
      })
      .slice(0, 10)
      .map((p) => ({
        title: String(p.title).trim(),
        category: String(p.category || 'Sightseeing'),
        is_indoor: Boolean(p.is_indoor),
        lat: Number(p.lat),
        lng: Number(p.lng),
        opening_hours: String(p.opening_hours || '09:00 - 18:00'),
        duration_minutes: Math.max(45, Math.min(240, Number(p.duration_minutes) || 95)),
        estimated_cost_inr: Math.max(0, Number(p.estimated_cost_inr) || 100),
        description: String(p.description || `Landmark attraction in ${cityName}.`),
        crowd_level:
          p.crowd_level === 'High' || p.crowd_level === 'Low' ? p.crowd_level : ('Moderate' as const),
      }));
  } catch {
    return [];
  }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function estimateTransitMinutes(distanceKm: number): number {
  if (distanceKm <= 0.5) return 5;
  return Math.max(8, Math.round((distanceKm / 26) * 60 + 5));
}

export function getAirportCode(city: string | null): string {
  if (!city || !city.trim()) return 'ORG';
  const c = city.toLowerCase();
  if (c.includes('hyderabad')) return 'HYD';
  if (c.includes('bengaluru') || c.includes('bangalore')) return 'BLR';
  if (c.includes('mumbai') || c.includes('bombay')) return 'BOM';
  if (c.includes('delhi')) return 'DEL';
  if (c.includes('chennai')) return 'MAA';
  if (c.includes('kolkata')) return 'CCU';
  if (c.includes('pune')) return 'PNQ';
  if (c.includes('goa')) return 'GOI';
  if (c.includes('kerala') || c.includes('kochi') || c.includes('munnar')) return 'COK';
  if (c.includes('coorg')) return 'CNN';
  if (c.includes('ooty')) return 'CJB';
  if (c.includes('jaipur')) return 'JAI';
  if (c.includes('udaipur')) return 'UDR';
  if (c.includes('varanasi')) return 'VNS';
  if (c.includes('shimla')) return 'SLV';
  if (c.includes('manali') || c.includes('kullu')) return 'KUU';
  if (c.includes('leh') || c.includes('ladakh')) return 'IXL';
  if (c.includes('darjeeling')) return 'IXB';
  if (c.includes('rishikesh') || c.includes('dehradun')) return 'DED';
  if (c.includes('amritsar')) return 'ATQ';
  if (c.includes('agra')) return 'AGR';
  if (c.includes('chandigarh')) return 'IXC';
  if (c.includes('srinagar')) return 'SXR';
  if (c.includes('ahmedabad')) return 'AMD';
  if (c.includes('mysur') || c.includes('mysore')) return 'MYQ';
  if (c.includes('visakhapatnam') || c.includes('vizag')) return 'VTZ';
  if (c.includes('jodhpur')) return 'JDH';
  if (c.includes('gangtok')) return 'PYG';
  return city.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'DST';
}

export function getDemoFlights(
  origin: string,
  dest: CatalogDestination,
  originGeo?: { lat: number; lng: number } | null
): FlightOption[] {
  const originCode = getAirportCode(origin);
  const destCode = dest.airport_code;
  const route = `${originCode}-${destCode}`;
  const nowStr = new Date().toISOString();

  const distKm = originGeo ? haversineKm(originGeo.lat, originGeo.lng, dest.lat, dest.lng) : 780;
  const baseFare =
    distKm < 120
      ? 1400
      : Math.round(Math.max(2600, Math.min(8900, distKm * 4.1 + 1450)) / 50) * 50;
  const durationMin = distKm < 120 ? 120 : Math.max(55, Math.round((distKm / 650) * 60 + 35));

  return [
    {
      id: `flt-${route}-1`,
      provider: 'demo_inventory',
      source_status: 'Simulated',
      route,
      origin_code: originCode,
      destination_code: destCode,
      airline: 'Demo Airways',
      flight_number: 'DA-412',
      departure_time: '07:45',
      arrival_time: addMinutesToTime('07:45', durationMin),
      duration_minutes: durationMin,
      price_per_person: baseFare,
      currency: 'INR',
      availability: 'Demo inventory only (not a live airline seat)',
      cancellation_terms: '₹750 simulated rescheduling fee; refundable up to 48h prior.',
      last_checked: nowStr,
    },
    {
      id: `flt-${route}-2`,
      provider: 'demo_inventory',
      source_status: 'Simulated',
      route,
      origin_code: originCode,
      destination_code: destCode,
      airline: 'Regional Express Air/Rail',
      flight_number: 'RE-208',
      departure_time: '12:30',
      arrival_time: addMinutesToTime('12:30', durationMin + 15),
      duration_minutes: durationMin + 15,
      price_per_person: Math.round((baseFare * 0.85) / 50) * 50,
      currency: 'INR',
      availability: 'Demo inventory only (not a live airline seat)',
      cancellation_terms: '₹500 simulated modification fee; 80% refund before 24h.',
      last_checked: nowStr,
    },
    {
      id: `flt-${route}-3`,
      provider: 'demo_inventory',
      source_status: 'Simulated',
      route,
      origin_code: originCode,
      destination_code: destCode,
      airline: 'Deccan Regional Shuttle',
      flight_number: 'DR-819',
      departure_time: '17:50',
      arrival_time: addMinutesToTime('17:50', durationMin),
      duration_minutes: durationMin,
      price_per_person: Math.round((baseFare * 1.15) / 50) * 50,
      currency: 'INR',
      availability: 'Demo inventory only (not a live airline seat)',
      cancellation_terms: 'Zero simulated change fee up to 12 hours before departure.',
      last_checked: nowStr,
    },
  ];
}

function addMinutesToTime(hhmm: string, add: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + add) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function getDemoHotels(dest: CatalogDestination, preference: string | null): HotelOption[] {
  const nowStr = new Date().toISOString();
  const list = dest.hotels.map((h, idx) => ({
    id: `htl-${dest.id}-${idx + 1}`,
    provider: 'demo_inventory',
    source_status: 'Simulated' as SourceStatus,
    name: h.name,
    tier: h.tier,
    area: h.area,
    lat: h.lat,
    lng: h.lng,
    price_per_night: h.price_per_night,
    currency: 'INR',
    distance_km: h.distance_km,
    rating: h.rating,
    breakfast_included: h.breakfast_included,
    amenities: h.amenities,
    availability: 'Demo inventory only',
    cancellation_terms: h.cancellation_terms,
    last_checked: nowStr,
  }));

  if (preference?.toLowerCase().includes('budget')) {
    return [...list].sort((a, b) => a.price_per_night - b.price_per_night);
  }
  return list;
}

export async function resolveCatalogDestination(
  preferredDest: string | null,
  interests: string[]
): Promise<CatalogDestination | null> {
  if (!preferredDest || !preferredDest.trim()) return null;
  const q = preferredDest.trim().toLowerCase();

  const direct = DESTINATION_CATALOG.find(
    (d) =>
      d.id === q ||
      d.name.toLowerCase() === q ||
      d.name.toLowerCase().includes(q) ||
      q.includes(d.name.toLowerCase()) ||
      (d.id === 'munnar' && q.includes('kerala')) ||
      (d.id === 'mumbai' && q.includes('bombay'))
  );
  if (direct) return direct;

  // Dynamic multi-source discovery for ANY city worldwide: Nominatim + Wikipedia Geosearch + Overpass + Gemini 4 Hydrogen
  const geo = await geocodeLocation(preferredDest.trim());
  const cleanName = geo.name || preferredDest.trim();

  const [geminiPois, wikiPlaces, overpass] = await Promise.all([
    fetchGeminiCityLandmarks(cleanName, geo.lat, geo.lng, interests),
    fetchWikipediaGeoPlaces(geo.lat, geo.lng, 22, cleanName),
    fetchOverpassPOIs(geo.lat, geo.lng, 10),
  ]);

  const mergedPois: CatalogDestination['pois'] = [];
  const pushUnique = (poi: CatalogDestination['pois'][number]) => {
    const normTitle = poi.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const duplicate = mergedPois.some(
      (existing) =>
        existing.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normTitle ||
        haversineKm(existing.lat, existing.lng, poi.lat, poi.lng) < 0.15
    );
    if (!duplicate) {
      mergedPois.push(poi);
    }
  };

  for (const gp of geminiPois) pushUnique(gp);

  for (const wp of wikiPlaces) {
    const lowerTitle = wp.name.toLowerCase();
    const isIndoor = /museum|gallery|palace|church|cathedral|temple|mosque|library|planetarium/.test(
      lowerTitle
    );
    const cat = /museum|gallery/.test(lowerTitle)
      ? 'Museum'
      : /fort|palace|memorial|tomb|stupa|gate/.test(lowerTitle)
      ? 'Heritage'
      : /lake|garden|park|falls|waterfall|peak|hill|reserve/.test(lowerTitle)
      ? 'Nature'
      : /beach|coast|bay/.test(lowerTitle)
      ? 'Beaches'
      : 'Sightseeing';
    pushUnique({
      title: wp.name,
      category: cat,
      is_indoor: isIndoor,
      lat: wp.lat,
      lng: wp.lng,
      opening_hours: '08:00 - 18:30',
      duration_minutes: 95,
      estimated_cost_inr: cat === 'Museum' || cat === 'Heritage' ? 100 : 0,
      description: `Notable landmark in ${cleanName} verified via Wikipedia Geosearch (${Math.round(
        wp.dist_m / 100
      ) / 10} km from center).`,
      crowd_level: 'Moderate',
    });
  }

  for (const op of overpass) {
    pushUnique({
      title: op.name,
      category: op.category || 'Attraction',
      is_indoor: /museum|gallery|palace|temple|church/.test(op.category.toLowerCase() + ' ' + op.name.toLowerCase()),
      lat: op.lat,
      lng: op.lng,
      opening_hours: '09:00 - 18:00',
      duration_minutes: 95,
      estimated_cost_inr: 150,
      description: `Verified OpenStreetMap landmark near ${cleanName} (${op.category}).`,
      crowd_level: 'Moderate',
    });
  }

  // Only if all external sources were offline and Gemini key was unavailable, add contextual landmarks
  if (mergedPois.length < 6) {
    const offlineFallbacks: CatalogDestination['pois'] = [
      {
        title: `${cleanName} Old City Heritage Quarter`,
        category: 'Heritage',
        is_indoor: false,
        lat: geo.lat + 0.008,
        lng: geo.lng - 0.006,
        opening_hours: '07:00 - 20:00',
        duration_minutes: 110,
        estimated_cost_inr: 100,
        description: `Historic central quarter and heritage market lanes of ${cleanName}.`,
        crowd_level: 'Moderate',
      },
      {
        title: `${cleanName} Regional Heritage Museum`,
        category: 'Museum',
        is_indoor: true,
        lat: geo.lat - 0.006,
        lng: geo.lng + 0.009,
        opening_hours: '10:00 - 17:30',
        duration_minutes: 100,
        estimated_cost_inr: 100,
        description: `Indoor museum showcasing regional history, architecture, and craft of ${cleanName}.`,
        crowd_level: 'Low',
      },
      {
        title: `${cleanName} Central Botanical Park & Walkway`,
        category: 'Nature',
        is_indoor: false,
        lat: geo.lat + 0.013,
        lng: geo.lng + 0.008,
        opening_hours: '06:00 - 19:30',
        duration_minutes: 90,
        estimated_cost_inr: 50,
        description: `Shaded landscaped park and scenic walking loop in ${cleanName}.`,
        crowd_level: 'Moderate',
      },
      {
        title: `${cleanName} Arts & Crafts Emporium`,
        category: 'Culture',
        is_indoor: true,
        lat: geo.lat - 0.009,
        lng: geo.lng - 0.007,
        opening_hours: '10:30 - 20:30',
        duration_minutes: 90,
        estimated_cost_inr: 250,
        description: `Covered regional artisan exhibition hall featuring local handlooms and culinary stalls.`,
        crowd_level: 'Low',
      },
      {
        title: `${cleanName} Panoramic Ridge Overlook`,
        category: 'Photography',
        is_indoor: false,
        lat: geo.lat + 0.017,
        lng: geo.lng - 0.011,
        opening_hours: '06:00 - 20:00',
        duration_minutes: 85,
        estimated_cost_inr: 0,
        description: `Elevated sunset viewpoint overlooking ${cleanName}.`,
        crowd_level: 'Low',
      },
      {
        title: `${cleanName} Civic Cultural & Architecture Hall`,
        category: 'Culture',
        is_indoor: true,
        lat: geo.lat - 0.004,
        lng: geo.lng - 0.012,
        opening_hours: '10:00 - 18:30',
        duration_minutes: 85,
        estimated_cost_inr: 150,
        description: `Sheltered exhibition hall highlighting ${cleanName}'s civic architecture and photography.`,
        crowd_level: 'Low',
      },
    ];
    for (const fb of offlineFallbacks) {
      if (mergedPois.length >= 8) break;
      pushUnique(fb);
    }
  }

  const finalPois = mergedPois.slice(0, 12);

  const lowerCity = cleanName.toLowerCase();
  const isHillOrNorth =
    lowerCity.includes('shimla') ||
    lowerCity.includes('manali') ||
    lowerCity.includes('leh') ||
    lowerCity.includes('darjeeling') ||
    lowerCity.includes('nainital') ||
    lowerCity.includes('gangtok') ||
    lowerCity.includes('srinagar') ||
    lowerCity.includes('rishikesh') ||
    interests.some((i) => /mountain|trek|hill/i.test(i));
  const isCoast =
    lowerCity.includes('pondicherry') ||
    lowerCity.includes('vizag') ||
    lowerCity.includes('kochi') ||
    lowerCity.includes('andaman') ||
    interests.some((i) => /beach|coast/i.test(i));

  const contextualImageKey = isHillOrNorth ? 'munnar' : isCoast ? 'goa' : 'hotel';

  return {
    id: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: cleanName,
    region: geo.region,
    country: geo.country,
    lat: geo.lat,
    lng: geo.lng,
    airport_code: getAirportCode(cleanName),
    image_key: contextualImageKey,
    summary: `Curated ${cleanName} itinerary with ${finalPois.length} real landmarks, indoor cultural backups, and stays.`,
    tags: interests.length ? interests : ['culture', 'sightseeing', 'food'],
    ideal_days: [2, 6],
    daily_base_cost_inr: 3300,
    avg_temp_c: 26,
    rain_risk_pct: 12,
    weather_summary: `Local forecast fetched dynamically for ${cleanName}`,
    pois: finalPois,
    hotels: [
      {
        name: `${cleanName} Central Budget Inn`,
        tier: 'budget',
        area: `Central ${cleanName}`,
        lat: geo.lat + 0.002,
        lng: geo.lng + 0.002,
        price_per_night: 1850,
        distance_km: 0.6,
        rating: 4.3,
        breakfast_included: false,
        amenities: ['Wi-Fi', 'AC Rooms', '24h Front Desk'],
        cancellation_terms: 'Free cancellation up to 48 hours prior; ₹500 simulated fee thereafter.',
      },
      {
        name: `${cleanName} Heritage Courtyard Stay`,
        tier: 'midrange',
        area: `${cleanName} Precinct`,
        lat: geo.lat - 0.003,
        lng: geo.lng + 0.004,
        price_per_night: 3200,
        distance_km: 0.9,
        rating: 4.6,
        breakfast_included: true,
        amenities: ['Breakfast Included', 'Wi-Fi', 'Airport Shuttle'],
        cancellation_terms: 'Free cancellation up to 24 hours prior.',
      },
    ],
  };
}

export function scoreDestinations(
  interests: string[],
  budgetPerPerson: number,
  durationDays: number,
  preferredDest: string | null,
  extraCatalogEntry?: CatalogDestination | null
): DestinationOption[] {
  const normInterests = interests.map((s) => s.toLowerCase());
  const pool = extraCatalogEntry && !DESTINATION_CATALOG.some((d) => d.id === extraCatalogEntry.id)
    ? [extraCatalogEntry, ...DESTINATION_CATALOG]
    : DESTINATION_CATALOG;

  const scored = pool.map((d) => {
    // B = Budget compatibility (0..100)
    const estimatedTripCost = d.daily_base_cost_inr * durationDays + 4500;
    const budgetRatio = budgetPerPerson / Math.max(estimatedTripCost, 1);
    const B = Math.min(100, Math.max(35, Math.round(budgetRatio >= 1 ? 95 : budgetRatio * 90)));

    // I = Interest match (0..100)
    const matches = normInterests.filter((tag) =>
      d.tags.some((t) => t.includes(tag) || tag.includes(t))
    ).length;
    const I = normInterests.length
      ? Math.min(100, Math.round(52 + (matches / normInterests.length) * 48))
      : 82;

    // D = Duration compatibility (0..100)
    const [minD, maxD] = d.ideal_days;
    const D = durationDays >= minD && durationDays <= maxD ? 96 : 74;

    // W = Weather suitability (0..100)
    const W = Math.max(55, 100 - d.rain_risk_pct);

    // T = Travel convenience (0..100)
    const T = d.id === 'goa' || d.id === 'mumbai' || d.id === 'delhi' || d.id === 'bengaluru' ? 94 : 86;

    // Formula: S = 0.30B + 0.25I + 0.20D + 0.15W + 0.10T
    let total = Math.round((0.3 * B + 0.25 * I + 0.2 * D + 0.15 * W + 0.1 * T) * 10) / 10;

    const isExplicitMatch = Boolean(
      preferredDest &&
        (d.name.toLowerCase().includes(preferredDest.toLowerCase()) ||
          preferredDest.toLowerCase().includes(d.name.toLowerCase()) ||
          d.region.toLowerCase().includes(preferredDest.toLowerCase()) ||
          (d.id === 'munnar' && preferredDest.toLowerCase().includes('kerala')) ||
          (d.id === 'mumbai' && preferredDest.toLowerCase().includes('bombay')))
    );

    if (isExplicitMatch) {
      total = 99.0;
    }

    const matchedTags = d.tags.filter((t) => normInterests.some((n) => t.includes(n) || n.includes(t)));
    const why = isExplicitMatch
      ? `Requested destination (${d.name}) · ₹${estimatedTripCost.toLocaleString('en-IN')}/person estimate.`
      : matchedTags.length > 0
      ? `Strong alignment with ${matchedTags.slice(0, 3).join(', ')} and ₹${estimatedTripCost.toLocaleString(
          'en-IN'
        )}/person estimate.`
      : d.summary;

    return {
      id: d.id,
      name: d.name,
      region: d.region,
      country: d.country,
      lat: d.lat,
      lng: d.lng,
      summary: d.summary,
      why_it_matches: why,
      image_key: d.image_key,
      source_status: 'Estimated' as SourceStatus,
      weather_summary: d.weather_summary,
      avg_temp_c: d.avg_temp_c,
      rain_risk_pct: d.rain_risk_pct,
      estimated_per_person_inr: estimatedTripCost,
      scores: {
        budget: B,
        interest: I,
        duration: D,
        weather: W,
        convenience: T,
        total,
      },
      _explicit: isExplicitMatch,
    };
  });

  return scored
    .sort((a, b) => {
      if (a._explicit !== b._explicit) return a._explicit ? -1 : 1;
      return b.scores.total - a.scores.total;
    })
    .map(({ _explicit, ...rest }) => rest);
}

export function buildDiscoveredPlacesList(
  dest: CatalogDestination,
  overpassExtras?: Array<{ name: string; category: string; lat: number; lng: number; source_status: SourceStatus }>
): DiscoveredPlace[] {
  const seen = new Set<string>();
  const combined: DiscoveredPlace[] = [];

  for (let i = 0; i < dest.pois.length; i++) {
    const p = dest.pois[i];
    const norm = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(norm)) continue;
    seen.add(norm);
    combined.push({
      id: `plc-${dest.id}-${i + 1}`,
      title: p.title,
      category: p.category,
      is_indoor: p.is_indoor,
      lat: p.lat,
      lng: p.lng,
      opening_hours: p.opening_hours,
      duration_minutes: p.duration_minutes,
      estimated_cost_inr: p.estimated_cost_inr,
      description: p.description,
      crowd_level: p.crowd_level,
      source_status: 'Estimated',
    });
  }

  for (let i = 0; i < (overpassExtras || []).length; i++) {
    const p = overpassExtras![i];
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nearExisting = combined.some((c) => haversineKm(c.lat, c.lng, p.lat, p.lng) < 0.25);
    if (seen.has(norm) || nearExisting) continue;
    seen.add(norm);
    combined.push({
      id: `plc-${dest.id}-osm-${i + 1}`,
      title: p.name,
      category: p.category,
      is_indoor: /museum|gallery|palace|temple|church/i.test(p.category + ' ' + p.name),
      lat: p.lat,
      lng: p.lng,
      opening_hours: '09:00 - 18:00',
      duration_minutes: 95,
      estimated_cost_inr: 150,
      description: `Live OpenStreetMap attraction discovered near ${dest.name} (${p.category}).`,
      crowd_level: 'Moderate',
      source_status: 'Live',
    });
  }

  return combined;
}

export function buildGeoAwareItinerary(params: {
  dest: CatalogDestination;
  durationDays: number;
  weatherDays: WeatherDay[];
  interests: string[];
  avoidCrowds?: boolean;
  rainyDayNumber?: number;
  overpassExtras?: Array<{ name: string; category: string; lat: number; lng: number; source_status: SourceStatus }>;
}) {
  const { dest, durationDays, weatherDays, interests, avoidCrowds, rainyDayNumber, overpassExtras } = params;

  let pool = buildDiscoveredPlacesList(dest, overpassExtras);
  if (avoidCrowds) {
    const rank = { Low: 0, Moderate: 1, High: 2 };
    pool = [...pool].sort((a, b) => rank[a.crowd_level] - rank[b.crowd_level]);
  }

  const days = [];
  const usedGlobalIndices = new Set<number>();

  for (let d = 1; d <= durationDays; d++) {
    const w = weatherDays[d - 1] ?? {
      date: `Day ${d}`,
      condition: 'Clear Sky',
      temp_max_c: dest.avg_temp_c,
      temp_min_c: dest.avg_temp_c - 6,
      rain_probability_pct: dest.rain_risk_pct,
      source_status: 'Estimated' as SourceStatus,
    };

    const isRainy = rainyDayNumber === d || w.rain_probability_pct >= 55;
    const dayWeather = isRainy
      ? {
          ...w,
          condition: 'Heavy Rain Forecast',
          rain_probability_pct: Math.max(w.rain_probability_pct, 80),
        }
      : w;

    // 4 rich slots on full middle days; 3 slots on arrival/departure days (4 slots on 1-day trips)
    const daySlots: Array<'Morning' | 'Midday' | 'Afternoon' | 'Evening'> =
      durationDays === 1
        ? ['Morning', 'Midday', 'Afternoon', 'Evening']
        : d === 1
        ? ['Morning', 'Midday', 'Afternoon', 'Evening']
        : d === durationDays
        ? ['Morning', 'Midday', 'Evening']
        : ['Morning', 'Midday', 'Afternoon', 'Evening'];

    const activities: ItineraryActivity[] = [];
    let prevLat = dest.hotels[0]?.lat ?? dest.lat;
    let prevLng = dest.hotels[0]?.lng ?? dest.lng;

    const chosenIndicesToday = new Set<number>();
    for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
      const slot = daySlots[sIdx];

      if (d === 1 && slot === 'Morning') {
        activities.push({
          id: `act-${d}-1`,
          day_number: d,
          slot,
          title: `Arrival & Hotel Check-in (${dest.hotels[0]?.name ?? dest.name})`,
          category: 'Logistics',
          is_indoor: true,
          lat: prevLat,
          lng: prevLng,
          opening_hours: '09:00 - 11:30',
          duration_minutes: 90,
          travel_time_from_prev_min: 25,
          distance_from_prev_km: 12.4,
          estimated_cost_inr: 0,
          description: 'Arrival transfer, check-in, and quick refreshment before starting local sightseeing.',
          source_status: 'Estimated',
          crowd_level: 'Low',
        });
        continue;
      }

      if (d === durationDays && durationDays > 1 && slot === 'Evening') {
        activities.push({
          id: `act-${d}-${sIdx + 1}`,
          day_number: d,
          slot,
          title: `Checkout & Return Transfer to ${dest.airport_code}`,
          category: 'Logistics',
          is_indoor: true,
          lat: dest.lat,
          lng: dest.lng,
          opening_hours: '16:30 - 20:00',
          duration_minutes: 110,
          travel_time_from_prev_min: 30,
          distance_from_prev_km: 14.0,
          estimated_cost_inr: 0,
          description: 'Hotel checkout, local souvenir pick-up, and scheduled departure transfer.',
          source_status: 'Estimated',
          crowd_level: 'Low',
        });
        continue;
      }

      // Prefer attractions not yet visited anywhere in this trip
      const allUsed = usedGlobalIndices.size >= pool.length;
      let bestIdx = -1;
      let bestScore = Infinity;

      for (let idx = 0; idx < pool.length; idx++) {
        if (chosenIndicesToday.has(idx)) continue;
        if (!allUsed && usedGlobalIndices.has(idx)) continue;

        const candidate = pool[idx];
        const dist = haversineKm(prevLat, prevLng, candidate.lat, candidate.lng);
        let penalty = dist;
        if (isRainy && !candidate.is_indoor) penalty += 140;
        if (!isRainy && interests.some((i) => candidate.category.toLowerCase().includes(i.toLowerCase()))) {
          penalty -= 8;
        }
        if (slot === 'Evening' && /nightlife|food|promenade|ghat|sunset|aarti/i.test(candidate.category + ' ' + candidate.title)) {
          penalty -= 12;
        }
        if (penalty < bestScore) {
          bestScore = penalty;
          bestIdx = idx;
        }
      }

      if (bestIdx < 0) bestIdx = sIdx % pool.length;
      const pick = pool[bestIdx];
      chosenIndicesToday.add(bestIdx);
      usedGlobalIndices.add(bestIdx);

      const distKm = haversineKm(prevLat, prevLng, pick.lat, pick.lng);
      const transitMin = estimateTransitMinutes(distKm);
      prevLat = pick.lat;
      prevLng = pick.lng;

      activities.push({
        id: `act-${d}-${sIdx + 1}`,
        day_number: d,
        slot,
        title: pick.title,
        category: pick.category,
        is_indoor: pick.is_indoor,
        lat: pick.lat,
        lng: pick.lng,
        opening_hours: pick.opening_hours,
        duration_minutes: pick.duration_minutes,
        travel_time_from_prev_min: transitMin,
        distance_from_prev_km: distKm,
        estimated_cost_inr: pick.estimated_cost_inr,
        description: pick.description,
        source_status: pick.source_status,
        crowd_level: pick.crowd_level,
      });
    }

    const dayTheme = isRainy
      ? 'Weather-Adapted Indoor Culture & Craft'
      : d === 1
      ? `Arrival & ${dest.name} Highlights`
      : d === durationDays
      ? 'Morning Discovery & Departure'
      : `${activities[1]?.category || 'Sightseeing'} & Heritage Circuit`;

    days.push({
      day_number: d,
      title: `Day ${d} — ${dayTheme}`,
      date_label: dayWeather.date,
      weather: dayWeather,
      activities,
    });
  }

  return days;
}
