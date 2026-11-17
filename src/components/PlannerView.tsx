import { useState } from 'react';
import { Send, RotateCcw, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import type {
  AgentStepLog,
  ChatMessageRecord,
  FlightOption,
  HotelOption,
  TravellerProfile,
  TripRecord,
} from '../types/travel';
import { formatINR } from '../lib/assets';
import { SourceBadge } from './SourceBadge';

interface PlannerViewProps {
  messages: ChatMessageRecord[];
  profile: TravellerProfile | null;
  activeTrip: TripRecord | null;
  isSending: boolean;
  onSendMessage: (msg: string) => void;
  onResetChat: () => void;
  onPreviewBooking: (type: 'flight' | 'hotel', item: FlightOption | HotelOption) => void;
  onSelectDestination: (destId: string, originCity?: string) => void;
  onOpenItinerary: () => void;
}

const SAMPLE_PROMPTS = [
  'I want to travel from Pune to Jaipur for 4 days with 3 friends. Our budget is ₹20,000 per person and we prefer heritage, photography, and budget stays.',
  'Plan a 3-day trip from Hyderabad to Mumbai for 2 people with ₹18,000 budget per person.',
  'Actually, make the budget ₹15,000 per person.',
  'It is going to rain on Day 2. Change the itinerary.',
];

export function PlannerView({
  messages,
  profile,
  activeTrip,
  isSending,
  onSendMessage,
  onResetChat,
  onPreviewBooking,
  onSelectDestination,
  onOpenItinerary,
}: PlannerViewProps) {
  const [input, setInput] = useState('');
  const [directOrigin, setDirectOrigin] = useState('');
  const [directDest, setDirectDest] = useState('');

  const effectiveOrigin = directOrigin.trim() || profile?.origin || activeTrip?.profile.origin || '';

  const handleDirectDestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directDest.trim() || !effectiveOrigin || isSending) return;
    onSelectDestination(directDest.trim(), effectiveOrigin);
    setDirectDest('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const agentLogs: AgentStepLog[] = activeTrip?.agent_logs || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Column: Conversational Engine & Live Extracted Profile */}
      <div className="xl:col-span-5 classic-card rounded-lg flex flex-col h-[760px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#14211E] font-display leading-tight">
              AI Travel Consultant
            </h2>
            <p className="text-xs text-[#52605C]">
              Extracts intent, retains context, and prompts only for missing specifics.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetChat}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#42504C] hover:text-[#14211E] bg-white border border-[#DCD5C7] rounded-md cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Live Structured Traveller Profile Strip */}
        <div className="px-5 py-3 bg-[#F6F4EF] border-b border-[#E4DFD4] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[#52605C]">
            <span className="font-semibold text-[#14211E] uppercase tracking-[0.08em] text-[10px]">
              Retained Traveller Brief
            </span>
            <span className="font-mono-tabular font-medium text-[#0F4C45]">
              {profile?.budget
                ? `${formatINR(profile.budget)}/${profile.budget_scope === 'total' ? 'total' : 'person'}`
                : 'Budget pending'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[#52605C]">
            <span>
              Origin: <strong className="text-[#14211E] font-medium">{profile?.origin || '—'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Dest:{' '}
              <strong className="text-[#14211E] font-medium">
                {profile?.destination || 'Not entered'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Days: <strong className="text-[#14211E] font-medium">{profile?.duration_days ?? '—'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Guests: <strong className="text-[#14211E] font-medium">{profile?.travellers ?? '—'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Interests:{' '}
              <strong className="text-[#14211E] font-medium">
                {profile?.interests?.length ? profile.interests.join(', ') : '—'}
              </strong>
            </span>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-[#FAF8F4] border border-[#E4DFD4] rounded-lg p-4 text-sm text-[#42504C] leading-relaxed">
                Share your departure city, destination, dates or duration, party size, and budget.
                You may adjust constraints at any point—such as lowering your ceiling or reporting
                rain on Day 2—without repeating prior instructions.
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#52605C]">
                  Sample Prompts
                </p>
                {SAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    className="w-full text-left text-xs text-[#42504C] bg-[#FAF8F4] hover:bg-[#EFECE3] border border-[#E4DFD4] rounded-md px-3.5 py-2.5 transition-colors cursor-pointer leading-relaxed"
                  >
                    “{prompt}”
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#0F4C45] text-white'
                      : 'bg-[#FAF8F4] text-[#14211E] border border-[#E4DFD4]'
                  }`}
                >
                  {m.content}
                </div>
                {m.missing_fields && m.missing_fields.length > 0 && (
                  <p className="text-[11px] text-amber-800 mt-1">
                    Needed to finalize: {m.missing_fields.join(', ')}
                  </p>
                )}
              </div>
            ))
          )}
          {isSending && (
            <div className="text-xs text-[#52605C] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0F4C45]" />
              <span>Supervisor & specialized agents orchestrating...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[#E4DFD4] bg-[#FAF8F4]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or refine preferences (e.g. 'Actually make budget ₹15,000')..."
              className="flex-1 text-sm text-[#14211E] bg-white border border-[#DCD5C7] rounded-md px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#0F4C45] focus:border-[#0F4C45] placeholder:text-[#84908C]"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="classic-btn-primary px-4 py-2.5 disabled:opacity-50 text-sm font-medium rounded-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Agent Pipeline, Destination Scoring & Transparent Comparisons */}
      <div className="xl:col-span-7 space-y-6">
        {/* Multi-Agent Execution Trace */}
        <section className="classic-card rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#14211E] font-display leading-tight">
                Multi-Agent Supervisor Execution
              </h2>
              <p className="text-xs text-[#52605C]">
                Shared-state delegation across Destination, Transport, Stay, Experience, Budget,
                Itinerary & Validation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <form onSubmit={handleDirectDestSubmit} className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={directOrigin}
                  onChange={(e) => setDirectOrigin(e.target.value)}
                  placeholder={profile?.origin || activeTrip?.profile.origin || 'Source city...'}
                  className="text-xs text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-2.5 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
                />
                <input
                  type="text"
                  value={directDest}
                  onChange={(e) => setDirectDest(e.target.value)}
                  placeholder="Destination city..."
                  className="text-xs text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-2.5 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
                />
                <button
                  type="submit"
                  disabled={isSending || !directDest.trim() || !effectiveOrigin}
                  title={!effectiveOrigin ? 'Enter both source and destination cities' : 'Apply route'}
                  className="px-3 py-1.5 bg-[#14211E] hover:bg-[#233530] disabled:opacity-50 text-white text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
                >
                  Apply Route
                </button>
              </form>
              {activeTrip && (
                <button
                  type="button"
                  onClick={onOpenItinerary}
                  className="classic-btn-primary px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>View Itinerary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {agentLogs.length === 0 ? (
            <p className="text-sm text-[#52605C]">
              Send a brief on the left to observe the Supervisor orchestrate specialized agents.
            </p>
          ) : (
            <div className="divide-y divide-[#EFECE3] border border-[#E4DFD4] rounded-md bg-[#FAF8F4]/50">
              {agentLogs.map((log, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          log.status === 'loopback' ? 'text-amber-700' : 'text-[#0F4C45]'
                        }`}
                      />
                      <span className="font-semibold text-[#14211E]">{log.agent_name}</span>
                      <span className="text-[#B7AFA0]">·</span>
                      <span
                        className={
                          log.status === 'loopback'
                            ? 'text-amber-800 font-medium'
                            : 'text-[#52605C]'
                        }
                      >
                        {log.status === 'loopback' ? 'Validation Loopback' : 'Completed'}
                      </span>
                    </div>
                    <p className="text-[#42504C] pl-5">{log.summary}</p>
                  </div>
                  <span className="font-mono-tabular text-[#52605C] whitespace-nowrap shrink-0">
                    {log.duration_ms} ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ranked Destination Scoring Matrix */}
        {activeTrip && (
          <section className="classic-card rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#14211E]">
                  Destination Discovery Scoring
                </h3>
                <p className="text-xs text-[#52605C] font-mono-tabular">
                  Formula: S = 0.30B + 0.25I + 0.20D + 0.15W + 0.10T
                </p>
              </div>
              <SourceBadge status={activeTrip.selected_destination.source_status} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4DFD4] bg-[#FAF8F4]/70 text-[11px] uppercase tracking-[0.06em] text-[#52605C]">
                    <th className="py-2.5 px-4">Destination</th>
                    <th className="py-2.5 px-3 text-right">Budget</th>
                    <th className="py-2.5 px-3 text-right">Interest</th>
                    <th className="py-2.5 px-3 text-right">Duration</th>
                    <th className="py-2.5 px-3 text-right">Weather</th>
                    <th className="py-2.5 px-3 text-right">Transit</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                    <th className="py-2.5 px-4 text-right">Select</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE3]">
                  {activeTrip.destination_candidates.map((d) => {
                    const isSelected = d.id === activeTrip.selected_destination.id;
                    return (
                      <tr
                        key={d.id}
                        className={isSelected ? 'bg-[#0F4C45]/5' : 'hover:bg-[#FAF8F4]'}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#14211E]">{d.name}</div>
                          <div className="text-[#52605C] truncate max-w-[200px]">
                            {d.why_it_matches}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular">{d.scores.budget}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular">{d.scores.interest}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular">{d.scores.duration}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular">{d.scores.weather}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular">
                          {d.scores.convenience}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#0F4C45] font-mono-tabular">
                          {d.scores.total}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isSelected ? (
                            <span className="text-[#0F4C45] font-semibold">Selected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectDestination(d.id)}
                              className="text-[#42504C] hover:text-[#0F4C45] font-semibold underline underline-offset-4 cursor-pointer"
                            >
                              Switch
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Flight & Hotel Transparent Comparison */}
        {activeTrip && (
          <div className="grid grid-cols-1 gap-6">
            {/* Flights */}
            <section className="classic-card rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#14211E]">
                    Transport Options ({activeTrip.selected_flight.route})
                  </h3>
                  <p className="text-xs text-[#52605C]">
                    Simulated carrier schedules — never claims live airline seat confirmation.
                  </p>
                </div>
                <SourceBadge status={activeTrip.selected_flight.source_status} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4DFD4] bg-[#FAF8F4]/70 text-[11px] uppercase tracking-[0.06em] text-[#52605C]">
                      <th className="py-2.5 px-4">Carrier</th>
                      <th className="py-2.5 px-3">Schedule</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Fare / Guest</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE3]">
                    {activeTrip.flight_options.map((f) => (
                      <tr key={f.id} className="hover:bg-[#FAF8F4]">
                        <td className="py-3 px-4 font-medium text-[#14211E]">
                          {f.airline}
                          <div className="text-[#52605C] font-mono-tabular font-normal">
                            {f.flight_number}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-[#42504C]">
                          {f.departure_time} → {f.arrival_time}
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-[#52605C]">
                          {f.duration_minutes}m
                        </td>
                        <td className="py-3 px-3">
                          <SourceBadge status={f.source_status} />
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#14211E] font-mono-tabular">
                          {formatINR(f.price_per_person)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onPreviewBooking('flight', f)}
                            className="px-2.5 py-1 text-xs font-medium text-[#0F4C45] bg-[#FAF8F4] border border-[#C9D7D2] hover:bg-[#0F4C45] hover:text-white rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Book Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Hotels Comparison Matrix */}
            <section className="classic-card rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#14211E]">
                    Accommodation Side-by-Side Comparison
                  </h3>
                  <p className="text-xs text-[#52605C]">
                    Nightly tariff, central hub distance, breakfast, cancellation terms & provenance.
                  </p>
                </div>
                <SourceBadge status={activeTrip.selected_hotel.source_status} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4DFD4] bg-[#FAF8F4]/70 text-[11px] uppercase tracking-[0.06em] text-[#52605C]">
                      <th className="py-2.5 px-4">Property</th>
                      <th className="py-2.5 px-3 text-right">Price/Night</th>
                      <th className="py-2.5 px-3 text-right">Distance</th>
                      <th className="py-2.5 px-3 text-right">Rating</th>
                      <th className="py-2.5 px-3">Breakfast</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE3]">
                    {activeTrip.hotel_options.map((h) => (
                      <tr key={h.id} className="hover:bg-[#FAF8F4]">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#14211E]">{h.name}</div>
                          <div className="text-[#52605C]">
                            {h.area} · {h.cancellation_terms}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold font-mono-tabular text-[#14211E]">
                          {formatINR(h.price_per_night)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-[#52605C]">
                          {h.distance_km} km
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-[#42504C]">
                          {h.rating.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-[#42504C]">
                          {h.breakfast_included ? 'Included' : 'No'}
                        </td>
                        <td className="py-3 px-3">
                          <SourceBadge status={h.source_status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onPreviewBooking('hotel', h)}
                            className="px-2.5 py-1 text-xs font-medium text-[#0F4C45] bg-[#FAF8F4] border border-[#C9D7D2] hover:bg-[#0F4C45] hover:text-white rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Book Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
