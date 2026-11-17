import { useEffect, useRef, useState } from 'react';
import {
  CloudRain,
  Plus,
  Trash2,
  Compass,
  ShieldAlert,
  TrendingDown,
  Clock,
  Navigation,
  RefreshCw,
  MapPin,
  Check,
} from 'lucide-react';
import type { DiscoveredPlace, TripRecord } from '../types/travel';
import { formatINR } from '../lib/assets';
import { SourceBadge } from './SourceBadge';
import { LeafletMap } from './LeafletMap';

interface ItineraryViewProps {
  trip: TripRecord | null;
  isReplanning: boolean;
  onReplan: (payload: {
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
  }) => void;
  onGoPlanner: () => void;
}

export function ItineraryView({ trip, isReplanning, onReplan, onGoPlanner }: ItineraryViewProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [mapViewMode, setMapViewMode] = useState<'day' | 'full'>('day');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [showExtraPins, setShowExtraPins] = useState(true);
  const [placesFilter, setPlacesFilter] = useState<'all' | 'available' | 'indoor'>('all');
  const [customOriginInput, setCustomOriginInput] = useState('');
  const [customDestInput, setCustomDestInput] = useState('');
  const mapSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSelectedDay(1);
    setSelectedActivityId(null);
    setFocusedPlaceId(null);
    setPlacesFilter('all');
  }, [trip?.id]);

  if (!trip) {
    return (
      <div className="classic-card rounded-lg p-12 text-center space-y-4">
        <h2 className="text-2xl font-semibold text-[#14211E] font-display">
          No Active Itinerary Selected
        </h2>
        <p className="text-sm text-[#52605C] max-w-md mx-auto">
          Start a brief in the AI Travel Planner or Dashboard to assemble a geo-aware day-by-day
          schedule and Leaflet corridor map.
        </p>
        <button
          type="button"
          onClick={onGoPlanner}
          className="classic-btn-primary px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer"
        >
          Open AI Travel Planner
        </button>
      </div>
    );
  }

  const activeDay = trip.days.find((d) => d.day_number === selectedDay) || trip.days[0];
  const discoveredPlaces: DiscoveredPlace[] = trip.discovered_places || [];

  const scheduledDaysByTitle = new Map<string, number[]>();
  const scheduledActIdByTitle = new Map<string, { id: string; day: number }>();
  trip.days.forEach((d) => {
    d.activities.forEach((act) => {
      const key = act.title.toLowerCase();
      const existingDays = scheduledDaysByTitle.get(key) || [];
      if (!existingDays.includes(d.day_number)) {
        scheduledDaysByTitle.set(key, [...existingDays, d.day_number]);
      }
      if (!scheduledActIdByTitle.has(key)) {
        scheduledActIdByTitle.set(key, { id: act.id, day: d.day_number });
      }
    });
  });

  const availableCount = discoveredPlaces.filter(
    (p) => !scheduledDaysByTitle.has(p.title.toLowerCase())
  ).length;
  const indoorCount = discoveredPlaces.filter((p) => p.is_indoor).length;

  const filteredPlaces = discoveredPlaces.filter((p) => {
    if (placesFilter === 'available') return !scheduledDaysByTitle.has(p.title.toLowerCase());
    if (placesFilter === 'indoor') return p.is_indoor;
    return true;
  });

  const handleCustomDestinationSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextDest = customDestInput.trim() || trip.selected_destination.name;
    const nextOrigin = customOriginInput.trim() || trip.profile.origin || '';
    if ((!customDestInput.trim() && !customOriginInput.trim()) || !nextOrigin || isReplanning) return;
    onReplan({ action: 'change_destination', destination_id: nextDest, origin: nextOrigin });
    setCustomOriginInput('');
    setCustomDestInput('');
  };

  const handleFocusDiscoveredPlace = (place: DiscoveredPlace) => {
    const scheduledMatch = scheduledActIdByTitle.get(place.title.toLowerCase());
    if (scheduledMatch) {
      setFocusedPlaceId(null);
      setSelectedDay(scheduledMatch.day);
      setSelectedActivityId(scheduledMatch.id);
    } else {
      setShowExtraPins(true);
      setSelectedActivityId(null);
      setFocusedPlaceId(place.id);
    }
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="space-y-6">
      {/* Header & Dynamic Modification Controls */}
      <section className="classic-card rounded-lg p-5 lg:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-semibold text-[#14211E] font-display leading-tight">
                {trip.title}
              </h1>
              <SourceBadge status={trip.selected_destination.source_status} />
            </div>
            <p className="text-xs text-[#52605C] mt-1">
              {trip.profile.origin} → {trip.selected_destination.name} ({trip.selected_destination.region}) ·{' '}
              {trip.days.length} days · {trip.profile.travellers} travellers ·{' '}
              <span className="font-mono-tabular font-semibold text-[#14211E]">
                {formatINR(trip.budget.per_person_estimated)}/person
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleCustomDestinationSwitch} className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={customOriginInput}
                onChange={(e) => setCustomOriginInput(e.target.value)}
                placeholder={`Source (${trip.profile.origin})`}
                className="text-xs bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-2.5 py-1.5 text-[#14211E] w-36 focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
              />
              <input
                type="text"
                value={customDestInput}
                onChange={(e) => setCustomDestInput(e.target.value)}
                placeholder={`Dest (${trip.selected_destination.name})`}
                className="text-xs bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-2.5 py-1.5 text-[#14211E] w-36 focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
              />
              <button
                type="submit"
                disabled={isReplanning || (!customDestInput.trim() && !customOriginInput.trim())}
                className="px-3 py-1.5 text-xs font-medium bg-[#14211E] hover:bg-[#233530] disabled:opacity-50 text-white rounded-md cursor-pointer whitespace-nowrap"
              >
                Update Route
              </button>
            </form>

            <div className="flex items-center gap-2">
              <label htmlFor="hotel-switch" className="text-xs text-[#52605C] whitespace-nowrap">
                Stay:
              </label>
              <select
                id="hotel-switch"
                disabled={isReplanning}
                value={trip.selected_hotel.id}
                onChange={(e) => onReplan({ action: 'change_hotel', hotel_id: e.target.value })}
                className="text-xs bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-2.5 py-1.5 text-[#14211E] focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
              >
                {trip.hotel_options.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({formatINR(h.price_per_night)}/nt)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Replanning Action Bar */}
        <div className="pt-3 border-t border-[#EFECE3] flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#52605C] mr-1">
            Dynamic Controls:
          </span>
          <button
            type="button"
            disabled={isReplanning}
            onClick={() => onReplan({ action: 'weather_rain', day_number: selectedDay })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FDF8EC] hover:bg-[#FAF0D7] text-[#854D0E] border border-[#E8D5A7] rounded-md cursor-pointer whitespace-nowrap"
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Rain on Day {selectedDay}</span>
          </button>

          <button
            type="button"
            disabled={isReplanning}
            onClick={() => onReplan({ action: 'reduce_budget' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF8F4] hover:bg-[#EFECE3] text-[#14211E] border border-[#E4DFD4] rounded-md cursor-pointer whitespace-nowrap"
          >
            <TrendingDown className="w-3.5 h-3.5 text-[#0F4C45]" />
            <span>Reduce Budget 20%</span>
          </button>

          <button
            type="button"
            disabled={isReplanning}
            onClick={() => onReplan({ action: 'add_day' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF8F4] hover:bg-[#EFECE3] text-[#14211E] border border-[#E4DFD4] rounded-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#0F4C45]" />
            <span>Add 1 Day</span>
          </button>

          <button
            type="button"
            disabled={isReplanning}
            onClick={() => onReplan({ action: 'avoid_crowds' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF8F4] hover:bg-[#EFECE3] text-[#14211E] border border-[#E4DFD4] rounded-md cursor-pointer whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#8C7A5B]" />
            <span>Avoid Crowded Places</span>
          </button>

          <button
            type="button"
            disabled={isReplanning}
            onClick={() => onReplan({ action: 'more_adventurous' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF8F4] hover:bg-[#EFECE3] text-[#14211E] border border-[#E4DFD4] rounded-md cursor-pointer whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-[#0F4C45]" />
            <span>More Adventurous</span>
          </button>

          {isReplanning && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#0F4C45] ml-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Re-orchestrating schedule...</span>
            </span>
          )}
        </div>
      </section>

      {/* Day Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E4DFD4] pb-3">
        {trip.days.map((day) => {
          const active = day.day_number === activeDay?.day_number;
          return (
            <button
              key={day.day_number}
              type="button"
              onClick={() => {
                setSelectedDay(day.day_number);
                setSelectedActivityId(null);
                setFocusedPlaceId(null);
              }}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#0F4C45] text-white border border-[#0F4C45]'
                  : 'bg-white text-[#42504C] border border-[#E4DFD4] hover:bg-[#FAF8F4]'
              }`}
            >
              Day {day.day_number} · {day.weather.temp_max_c}°C ({day.weather.condition})
            </button>
          );
        })}
      </div>

      {/* Main Split: Daily Schedule + Interactive Leaflet Map & Change Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Day Schedule */}
        <div className="lg:col-span-7 space-y-4">
          {activeDay && (
            <div className="classic-card rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#14211E] font-display leading-tight">
                    {activeDay.title}
                  </h2>
                  <p className="text-xs text-[#52605C] mt-0.5 font-mono-tabular">
                    {activeDay.date_label} · {activeDay.weather.condition} ·{' '}
                    {activeDay.weather.temp_min_c}°C–{activeDay.weather.temp_max_c}°C · Rain risk{' '}
                    {activeDay.weather.rain_probability_pct}%
                  </p>
                </div>
                <SourceBadge status={activeDay.weather.source_status} />
              </div>

              <div className="divide-y divide-[#EFECE3]">
                {activeDay.activities.map((act, idx) => {
                  const isFocused = act.id === selectedActivityId;
                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        setFocusedPlaceId(null);
                        setSelectedActivityId(act.id);
                      }}
                      className={`p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                        isFocused ? 'bg-[#0F4C45]/5' : 'hover:bg-[#FAF8F4]/80'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#52605C]">
                          <span className="font-mono-tabular font-semibold text-[#14211E]">
                            Stop {idx + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#0F4C45]">{act.slot}</span>
                          <span aria-hidden="true">·</span>
                          <span>{act.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{act.is_indoor ? 'Indoor / Sheltered' : 'Outdoor'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Crowd: {act.crowd_level}</span>
                          <SourceBadge status={act.source_status} />
                        </div>
                        <h3 className="text-base font-semibold text-[#14211E]">{act.title}</h3>
                        <p className="text-sm text-[#42504C] leading-relaxed">{act.description}</p>
                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#52605C] font-mono-tabular">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {act.opening_hours} ({act.duration_minutes} min)
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" />
                            {act.distance_from_prev_km} km ({act.travel_time_from_prev_min} min transit)
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {act.lat.toFixed(4)}, {act.lng.toFixed(4)}
                          </span>
                          <span className="font-medium text-[#14211E]">
                            {act.estimated_cost_inr > 0
                              ? `${formatINR(act.estimated_cost_inr)}/person`
                              : 'Free entry'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isReplanning}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplan({ action: 'remove_activity', activity_id: act.id });
                        }}
                        title="Remove activity and recalculate budget"
                        className="p-2 text-[#7A847F] hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: OpenStreetMap Route + Dynamic Change Log */}
        <div className="lg:col-span-5 space-y-6">
          <section ref={mapSectionRef} className="classic-card rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#14211E]">
                  Interactive Leaflet Map · {trip.selected_destination.name}
                </h3>
                <p className="text-xs text-[#52605C]">
                  Numbered pins mark scheduled stops; + pins mark city attractions.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {discoveredPlaces.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowExtraPins((prev) => !prev)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer whitespace-nowrap ${
                      showExtraPins
                        ? 'bg-[#0F4C45]/10 text-[#0F4C45] border-[#0F4C45]/30'
                        : 'bg-[#FAF8F4] text-[#52605C] border-[#DCD5C7] hover:text-[#14211E]'
                    }`}
                  >
                    + Nearby Pins
                  </button>
                )}
                <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] border border-[#E4DFD4] rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedPlaceId(null);
                      setMapViewMode('day');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer whitespace-nowrap ${
                      mapViewMode === 'day'
                        ? 'bg-white text-[#14211E] shadow-xs'
                        : 'text-[#52605C] hover:text-[#14211E]'
                    }`}
                  >
                    Day {activeDay?.day_number}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedPlaceId(null);
                      setMapViewMode('full');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer whitespace-nowrap ${
                      mapViewMode === 'full'
                        ? 'bg-white text-[#14211E] shadow-xs'
                        : 'text-[#52605C] hover:text-[#14211E]'
                    }`}
                  >
                    Full Trip Path
                  </button>
                </div>
              </div>
            </div>

            {activeDay && (
              <LeafletMap
                centerLat={trip.selected_destination.lat}
                centerLng={trip.selected_destination.lng}
                days={trip.days}
                hotel={trip.selected_hotel}
                selectedDay={activeDay.day_number}
                viewMode={mapViewMode}
                selectedActivityId={selectedActivityId}
                onSelectActivity={(actId, dayNum) => {
                  setFocusedPlaceId(null);
                  setSelectedDay(dayNum);
                  setSelectedActivityId(actId);
                }}
                extraPlaces={discoveredPlaces}
                showExtraPlaces={showExtraPins}
                focusedPlaceId={focusedPlaceId}
                onSelectExtraPlace={(place) => {
                  setSelectedActivityId(null);
                  setFocusedPlaceId(place.id);
                }}
              />
            )}

            <div className="flex items-center justify-between text-[11px] text-[#52605C] pt-1 font-mono-tabular">
              <span>
                Center: {trip.selected_destination.lat.toFixed(4)},{' '}
                {trip.selected_destination.lng.toFixed(4)}
              </span>
              <span>
                {mapViewMode === 'full'
                  ? `${trip.days.reduce((sum, d) => sum + d.activities.length, 0)} scheduled pins`
                  : `${activeDay?.activities.length || 0} day stops`}
                {showExtraPins && discoveredPlaces.length > 0
                  ? ` · ${discoveredPlaces.length} city attractions`
                  : ''}
              </span>
            </div>
          </section>

          {/* Before / After Change Log */}
          <section className="classic-card rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4DFD4] bg-[#FAF8F4]">
              <h3 className="text-sm font-semibold text-[#14211E]">Dynamic Modification Log</h3>
              <p className="text-xs text-[#52605C]">
                Tracks every automated adjustment and resulting cost impact.
              </p>
            </div>
            {trip.change_log && trip.change_log.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4DFD4] bg-[#FAF8F4]/70 text-[11px] uppercase tracking-[0.06em] text-[#52605C]">
                      <th className="py-2 px-3">Before</th>
                      <th className="py-2 px-3">After</th>
                      <th className="py-2 px-3">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE3]">
                    {trip.change_log.map((entry, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-[#52605C]">{entry.before}</td>
                        <td className="py-2.5 px-3 text-[#14211E] font-medium">{entry.after}</td>
                        <td className="py-2.5 px-3 text-[#0F4C45] font-mono-tabular font-medium">
                          {entry.impact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-xs text-[#52605C]">
                No modifications applied yet. Use “Rain on Day {selectedDay}” or “Reduce Budget 20%”
                above to adapt the plan dynamically.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Discovered Tourist Attractions Directory */}
      {discoveredPlaces.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[#E4DFD4]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-[#14211E] font-display">
                Tourist Attractions Discovered in {trip.selected_destination.name} (
                {discoveredPlaces.length})
              </h2>
              <p className="text-xs text-[#52605C] mt-0.5">
                Inspect landmarks on the Leaflet map or add any site directly to Day{' '}
                {activeDay?.day_number}.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] border border-[#E4DFD4] rounded-lg self-start">
              <button
                type="button"
                onClick={() => setPlacesFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  placesFilter === 'all'
                    ? 'bg-white text-[#14211E] shadow-xs'
                    : 'text-[#52605C] hover:text-[#14211E]'
                }`}
              >
                All Attractions ({discoveredPlaces.length})
              </button>
              <button
                type="button"
                onClick={() => setPlacesFilter('available')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  placesFilter === 'available'
                    ? 'bg-white text-[#14211E] shadow-xs'
                    : 'text-[#52605C] hover:text-[#14211E]'
                }`}
              >
                Not Scheduled ({availableCount})
              </button>
              <button
                type="button"
                onClick={() => setPlacesFilter('indoor')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  placesFilter === 'indoor'
                    ? 'bg-white text-[#14211E] shadow-xs'
                    : 'text-[#52605C] hover:text-[#14211E]'
                }`}
              >
                Indoor / Rain-Safe ({indoorCount})
              </button>
            </div>
          </div>

          {filteredPlaces.length === 0 ? (
            <div className="classic-card rounded-lg p-6 text-xs text-[#52605C] text-center">
              All discovered landmarks for this filter are already included in your itinerary.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaces.map((place) => {
                const daysWithPlace = scheduledDaysByTitle.get(place.title.toLowerCase()) || [];
                const isOnActiveDay = activeDay ? daysWithPlace.includes(activeDay.day_number) : false;
                const isFocused = focusedPlaceId === place.id;

                return (
                  <div
                    key={place.id}
                    className={`classic-card rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors ${
                      isFocused ? 'ring-1 ring-[#A16207] border-[#A16207]' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#52605C]">
                        <span className="font-semibold text-[#14211E]">{place.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{place.is_indoor ? 'Indoor' : 'Outdoor'}</span>
                        <span aria-hidden="true">·</span>
                        <span>Crowd: {place.crowd_level}</span>
                        <SourceBadge status={place.source_status} />
                      </div>
                      <h3 className="text-base font-semibold text-[#14211E]">{place.title}</h3>
                      <p className="text-xs text-[#42504C] leading-relaxed">{place.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-[#52605C] font-mono-tabular">
                        <span>{place.opening_hours}</span>
                        <span aria-hidden="true">·</span>
                        <span>{place.duration_minutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#14211E]">
                          {place.estimated_cost_inr > 0 ? formatINR(place.estimated_cost_inr) : 'Free'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A847F] font-mono-tabular">
                        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EFECE3] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleFocusDiscoveredPlace(place)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#42504C] bg-[#FAF8F4] border border-[#E4DFD4] hover:bg-[#EFECE3] rounded-md cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#0F4C45]" />
                        <span>Focus on Map</span>
                      </button>

                      {isOnActiveDay ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F4C45] whitespace-nowrap shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>On Day {activeDay?.day_number}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isReplanning}
                          onClick={() =>
                            onReplan({
                              action: 'add_activity',
                              day_number: activeDay?.day_number || 1,
                              place_id: place.id,
                            })
                          }
                          className="classic-btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Day {activeDay?.day_number}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
