import { useRef, useState } from 'react';
import {
  ArrowRight,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Send,
  Compass,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { BookingRecord, TripRecord } from '../types/travel';
import { formatINR, getDestinationImage } from '../lib/assets';
import { SourceBadge } from './SourceBadge';

interface DashboardViewProps {
  trips: TripRecord[];
  activeTrip: TripRecord | null;
  bookings: BookingRecord[];
  isPlanning: boolean;
  onSelectTrip: (tripId: number) => void;
  onDeleteTrip: (tripId: number) => void;
  onNavigate: (tab: 'dashboard' | 'planner' | 'itinerary' | 'budget' | 'bookings') => void;
  onQuickPrompt: (prompt: string) => void;
  onCreateTripPlan: (params: {
    destination: string;
    origin: string;
    duration_days: number;
    budget: number;
    travellers: number;
    interests: string[];
    hotel_preference: string;
  }) => Promise<void>;
}

const INTEREST_OPTIONS = [
  'Sightseeing',
  'Heritage',
  'Nature',
  'Adventure',
  'Food',
  'Beaches',
  'Photography',
  'Nightlife',
];

const EXAMPLE_DESTINATIONS = [
  {
    id: 'mumbai',
    name: 'Mumbai',
    region: 'Maharashtra Coast',
    highlight: 'Waterfronts · Museums · Harbour Ferry · Street Food',
    imageKey: 'hotel',
  },
  {
    id: 'munnar',
    name: 'Munnar',
    region: 'Western Ghats, Kerala',
    highlight: 'Tea Estates · Mist Ridges · Cloud Valleys',
    imageKey: 'munnar',
  },
  {
    id: 'coorg',
    name: 'Coorg',
    region: 'Kodagu, Karnataka',
    highlight: 'Coffee Plantations · Waterfalls · Ridge Treks',
    imageKey: 'coorg',
  },
  {
    id: 'ooty',
    name: 'Ooty',
    region: 'Nilgiris, Tamil Nadu',
    highlight: 'Mountain Railway · Botanical Terraces · Pine Peaks',
    imageKey: 'ooty',
  },
];

export function DashboardView({
  trips,
  activeTrip,
  bookings,
  isPlanning,
  onSelectTrip,
  onDeleteTrip,
  onNavigate,
  onQuickPrompt,
  onCreateTripPlan,
}: DashboardViewProps) {
  const [inputMode, setInputMode] = useState<'form' | 'chat'>('form');

  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [durationDays, setDurationDays] = useState(4);
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState(20000);
  const [hotelPreference, setHotelPreference] = useState('budget');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [intentInput, setIntentInput] = useState('');

  const originInputRef = useRef<HTMLInputElement>(null);

  const toggleInterest = (tag: string) => {
    const lower = tag.toLowerCase();
    setSelectedInterests((prev) =>
      prev.includes(lower) ? prev.filter((item) => item !== lower) : [...prev, lower]
    );
  };

  const handleStructuredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setFormError('Please enter your destination city.');
      return;
    }
    if (!origin.trim()) {
      setFormError('Please enter your departure city.');
      return;
    }
    setFormError(null);
    await onCreateTripPlan({
      destination: destination.trim(),
      origin: origin.trim(),
      duration_days: Math.max(1, Number(durationDays) || 4),
      travellers: Math.max(1, Number(travellers) || 2),
      budget: Math.max(5000, Number(budget) || 20000),
      interests: selectedInterests,
      hotel_preference: hotelPreference,
    });
  };

  const handleChatLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentInput.trim()) return;
    onQuickPrompt(intentInput.trim());
  };

  const handlePrefillExample = (cityName: string) => {
    setInputMode('form');
    setDestination(cityName);
    setFormError(null);
    originInputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmedCount = bookings.filter((b) => b.booking_status !== 'Cancelled').length;

  return (
    <div className="space-y-8">
      {/* Classic Editorial Two-Column Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 classic-card rounded-lg p-7 lg:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFECE3] pb-3">
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#0F4C45]">
                Bespoke Multi-Agent Atelier
              </p>
              <div className="inline-flex bg-[#F3EFE6] p-1 rounded-md text-xs font-medium border border-[#E4DFD4]">
                <button
                  type="button"
                  onClick={() => setInputMode('form')}
                  className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                    inputMode === 'form'
                      ? 'bg-white text-[#14211E] shadow-xs'
                      : 'text-[#52605C] hover:text-[#14211E]'
                  }`}
                >
                  Structured Brief
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('chat')}
                  className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                    inputMode === 'chat'
                      ? 'bg-white text-[#14211E] shadow-xs'
                      : 'text-[#52605C] hover:text-[#14211E]'
                  }`}
                >
                  Conversational Brief
                </button>
              </div>
            </div>

            <h1 className="text-3xl lg:text-4xl font-semibold text-[#14211E] font-display leading-[1.12]">
              Craft a personalized journey from your own coordinates.
            </h1>
            <p className="text-sm text-[#52605C] leading-relaxed">
              Every flight corridor, stay shortlist, tourist attraction pin, live forecast, and
              itemized ledger is orchestrated specifically for the departure and destination cities
              you specify.
            </p>
          </div>

          {inputMode === 'form' ? (
            <form onSubmit={handleStructuredSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="trip-dest" className="block text-xs font-medium text-[#42504C] mb-1">
                    Destination City <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="trip-dest"
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Mumbai, Shimla, Jaipur, Udaipur"
                    className="w-full text-sm text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45] placeholder:text-[#84908C]"
                  />
                </div>

                <div>
                  <label htmlFor="trip-origin" className="block text-xs font-medium text-[#42504C] mb-1">
                    Departure City <span className="text-red-700">*</span>
                  </label>
                  <input
                    ref={originInputRef}
                    id="trip-origin"
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Hyderabad, Bengaluru, Delhi"
                    className="w-full text-sm text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45] placeholder:text-[#84908C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="trip-days" className="block text-xs font-medium text-[#42504C] mb-1">
                    Days
                  </label>
                  <input
                    id="trip-days"
                    type="number"
                    min={1}
                    max={14}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full text-sm font-mono-tabular text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45]"
                  />
                </div>

                <div>
                  <label htmlFor="trip-guests" className="block text-xs font-medium text-[#42504C] mb-1">
                    Travellers
                  </label>
                  <input
                    id="trip-guests"
                    type="number"
                    min={1}
                    max={12}
                    value={travellers}
                    onChange={(e) => setTravellers(Number(e.target.value))}
                    className="w-full text-sm font-mono-tabular text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45]"
                  />
                </div>

                <div>
                  <label htmlFor="trip-budget" className="block text-xs font-medium text-[#42504C] mb-1">
                    Budget / Person (₹)
                  </label>
                  <input
                    id="trip-budget"
                    type="number"
                    min={5000}
                    step={500}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full text-sm font-mono-tabular text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45]"
                  />
                </div>

                <div>
                  <label htmlFor="trip-hotel-tier" className="block text-xs font-medium text-[#42504C] mb-1">
                    Stay Tier
                  </label>
                  <select
                    id="trip-hotel-tier"
                    value={hotelPreference}
                    onChange={(e) => setHotelPreference(e.target.value)}
                    className="w-full text-sm text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45]"
                  >
                    <option value="budget">Budget</option>
                    <option value="midrange">Mid-range</option>
                    <option value="boutique">Boutique</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#42504C] mb-1.5">
                  Interests <span className="text-[#7A847F] font-normal">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_OPTIONS.map((tag) => {
                    const active = selectedInterests.includes(tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0F4C45] border-[#0F4C45] text-white font-medium'
                            : 'bg-[#FAF8F4] border-[#DCD5C7] text-[#42504C] hover:bg-[#EFECE3]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EFECE3]">
                <p className="text-xs text-[#52605C]">
                  OpenStreetMap · Wikipedia · Open-Meteo · Simulated inventory
                </p>
                <button
                  type="submit"
                  disabled={isPlanning}
                  className="classic-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 disabled:opacity-60 text-sm font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isPlanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Orchestrating Agents...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      <span>Compose Itinerary</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChatLaunch} className="space-y-3 pt-2">
              <label htmlFor="hero-intent" className="block text-xs font-medium text-[#42504C]">
                Describe your destination, departure city, days, travellers & budget
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  id="hero-intent"
                  rows={3}
                  value={intentInput}
                  onChange={(e) => setIntentInput(e.target.value)}
                  className="flex-1 text-sm text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45] resize-none placeholder:text-[#84908C]"
                  placeholder="Example: I want to travel from Pune to Jaipur for 4 days with 2 friends under ₹18,000 per person..."
                />
                <button
                  type="submit"
                  disabled={!intentInput.trim() || isPlanning}
                  className="classic-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 disabled:opacity-50 text-sm font-medium rounded-md whitespace-nowrap shrink-0 self-start sm:self-stretch cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send to Consultant</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Editorial Feature Plate */}
        <div className="lg:col-span-5 classic-card rounded-lg overflow-hidden relative min-h-[320px] group">
          <img
            src={getDestinationImage(activeTrip?.selected_destination.image_key || 'hotel')}
            alt={
              activeTrip
                ? `${activeTrip.selected_destination.name}, ${activeTrip.selected_destination.region}`
                : 'Editorial concierge destination preview'
            }
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover min-h-[320px] classic-media-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1A17]/95 via-[#0D1A17]/50 to-[#0D1A17]/15 flex flex-col justify-end p-6 lg:p-7">
            {activeTrip ? (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#D7CEBC]">
                    Active Route · {activeTrip.profile.origin} → {activeTrip.selected_destination.name}
                  </p>
                  <h2 className="text-2xl lg:text-[28px] font-semibold text-white font-display mt-1 leading-tight">
                    {activeTrip.title}
                  </h2>
                  <p className="text-xs text-[#E4DFD4] mt-1.5 font-mono-tabular">
                    {activeTrip.days.length} days · {activeTrip.profile.travellers} travellers ·{' '}
                    {formatINR(activeTrip.budget.per_person_estimated)}/person
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('itinerary')}
                  className="px-3.5 py-2 bg-[#FAF8F4] text-[#14211E] hover:bg-white text-xs font-semibold rounded-md whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Open Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A7D8CE]">
                    Awaiting Departure Brief
                  </p>
                  <h2 className="text-2xl lg:text-[28px] font-semibold text-white font-display mt-1 leading-tight">
                    Begin Your Custom Dossier
                  </h2>
                  <p className="text-xs text-[#E4DFD4] mt-1.5 leading-relaxed">
                    Enter your destination and departure city on the left, or open the conversational
                    consultant to assemble flights, stays, attractions, and interactive map paths.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="px-3.5 py-2 bg-[#FAF8F4] text-[#14211E] hover:bg-white text-xs font-semibold rounded-md whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Open AI Travel Planner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column Ledger Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="classic-card rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-[#52605C]">
            <span className="uppercase tracking-[0.08em] text-[11px] font-medium">Saved Dossiers</span>
            <MapPin className="w-4 h-4 text-[#8C7A5B]" />
          </div>
          <p className="text-3xl font-semibold text-[#14211E] mt-2 font-display tabular-nums">
            {trips.length}
          </p>
          <p className="text-xs text-[#52605C] mt-1">Persisted in local SQLite</p>
        </div>

        <div className="classic-card rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-[#52605C]">
            <span className="uppercase tracking-[0.08em] text-[11px] font-medium">Active Estimate</span>
            <Wallet className="w-4 h-4 text-[#8C7A5B]" />
          </div>
          <p className="text-3xl font-semibold text-[#14211E] mt-2 font-display tabular-nums">
            {activeTrip ? formatINR(activeTrip.budget.per_person_estimated) : '—'}
          </p>
          <p className="text-xs text-[#52605C] mt-1">
            {activeTrip ? 'Per person · itemized math' : 'Enter destination above'}
          </p>
        </div>

        <div className="classic-card rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-[#52605C]">
            <span className="uppercase tracking-[0.08em] text-[11px] font-medium">Active Bookings</span>
            <Calendar className="w-4 h-4 text-[#8C7A5B]" />
          </div>
          <p className="text-3xl font-semibold text-[#14211E] mt-2 font-display tabular-nums">
            {confirmedCount}
          </p>
          <p className="text-xs text-[#52605C] mt-1">Approval-gated vouchers</p>
        </div>

        <div className="classic-card rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-[#52605C]">
            <span className="uppercase tracking-[0.08em] text-[11px] font-medium">Traveller Party</span>
            <Users className="w-4 h-4 text-[#8C7A5B]" />
          </div>
          <p className="text-3xl font-semibold text-[#14211E] mt-2 font-display tabular-nums">
            {activeTrip ? `${activeTrip.profile.travellers} Guests` : '—'}
          </p>
          <p className="text-xs text-[#52605C] mt-1">
            {activeTrip
              ? `${activeTrip.profile.origin} → ${activeTrip.selected_destination.name}`
              : 'No active corridor'}
          </p>
        </div>
      </section>

      {/* Curated Example Destinations */}
      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-[#E4DFD4] pb-3">
          <div>
            <h2 className="text-2xl font-semibold text-[#14211E] font-display">
              Inspiring Destinations
            </h2>
            <p className="text-xs text-[#52605C] mt-0.5">
              Select a card to pre-fill the Destination field, or type any city worldwide above.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="text-xs font-semibold text-[#0F4C45] hover:underline underline-offset-4 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open AI Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {EXAMPLE_DESTINATIONS.map((dest) => (
            <div
              key={dest.id}
              className="classic-card rounded-lg overflow-hidden flex flex-col justify-between group hover:border-[#C8BFB0] transition-colors"
            >
              <div>
                <div className="h-40 bg-[#EFECE3] overflow-hidden">
                  <img
                    src={getDestinationImage(dest.imageKey)}
                    alt={`${dest.name}, ${dest.region}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover classic-media-zoom"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="text-xl font-semibold text-[#14211E] font-display leading-tight">
                    {dest.name}
                  </h3>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[#8C7A5B] font-medium">
                    {dest.region}
                  </p>
                  <p className="text-xs text-[#52605C] pt-1 leading-relaxed">{dest.highlight}</p>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[#EFECE3] bg-[#FAF8F4]/70 flex items-center justify-between">
                <span className="text-[11px] text-[#7A847F]">Custom brief</span>
                <button
                  type="button"
                  onClick={() => handlePrefillExample(dest.name)}
                  className="text-xs font-semibold text-[#0F4C45] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Use Destination
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Saved Trips Table */}
      <section className="classic-card rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#14211E] font-display">Saved Trips</h2>
            <p className="text-xs text-[#52605C]">
              Generated itineraries, budget models, and agent checkpoints archived locally.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className="px-3.5 py-2 text-xs font-medium text-[#14211E] bg-white border border-[#DCD5C7] hover:bg-[#F3EFE6] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Bookings & Vouchers
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4DFD4] bg-[#FAF8F4]/70 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#52605C]">
                <th className="py-3 px-6">Trip Title</th>
                <th className="py-3 px-4">Corridor</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Per Person</th>
                <th className="py-3 px-4">Data Source</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE3] text-sm">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-sm text-[#52605C]">
                    No saved trips yet. Enter a destination and departure city above to compose
                    your first end-to-end itinerary.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-[#FAF8F4]/70 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-[#14211E]">
                      {trip.title}
                      <div className="text-xs text-[#52605C] font-normal">
                        {trip.profile.travellers} travellers · {trip.status}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#42504C]">
                      {trip.profile.origin} → {trip.selected_destination.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#42504C] font-mono-tabular">
                      {trip.days.length} days
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#14211E] font-mono-tabular">
                      {formatINR(trip.budget.per_person_estimated)}
                    </td>
                    <td className="py-3.5 px-4">
                      <SourceBadge status={trip.selected_destination.source_status} />
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTrip(trip.id);
                          onNavigate('itinerary');
                        }}
                        className="text-xs font-semibold text-[#0F4C45] hover:underline underline-offset-4 cursor-pointer"
                      >
                        Itinerary
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTrip(trip.id);
                          onNavigate('budget');
                        }}
                        className="text-xs font-medium text-[#42504C] hover:underline underline-offset-4 cursor-pointer"
                      >
                        Budget
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTrip(trip.id)}
                        title="Delete saved trip"
                        className="inline-flex items-center text-[#7A847F] hover:text-red-700 align-middle cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
