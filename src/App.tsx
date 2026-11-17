import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Map,
  Wallet,
  Briefcase,
  Plus,
  Compass,
} from 'lucide-react';
import type {
  ApprovalRecord,
  BookingRecord,
  ChatMessageRecord,
  FlightOption,
  HotelOption,
  TravellerProfile,
  TripRecord,
} from './types/travel';
import { DashboardView } from './components/DashboardView';
import { PlannerView } from './components/PlannerView';
import { ItineraryView } from './components/ItineraryView';
import { BudgetView } from './components/BudgetView';
import { BookingsView } from './components/BookingsView';

type NavTab = 'dashboard' | 'planner' | 'itinerary' | 'budget' | 'bookings';

const SESSION_ID = 'travelgenie-primary-session';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [profile, setProfile] = useState<TravellerProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [pendingPreview, setPendingPreview] = useState<{
    trip_id: number | null;
    booking_type: 'flight' | 'hotel' | 'activity' | 'package';
    title: string;
    provider: string;
    price: number;
    check_in_or_date: string;
    check_out_or_return: string;
    guests: number;
    cancellation_terms: string;
    passengers: string[];
    idempotency_key: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshAll = useCallback(async () => {
    const [tripsRes, chatRes, bookingsRes] = await Promise.all([
      fetch('/api/trips'),
      fetch(`/api/chat/${SESSION_ID}`),
      fetch('/api/bookings'),
    ]);

    if (tripsRes.ok) {
      const data = await tripsRes.json();
      const loadedTrips: TripRecord[] = data.trips || [];
      setTrips(loadedTrips);
      if (loadedTrips.length > 0) {
        setActiveTripId((prev) => prev ?? loadedTrips[0].id);
      }
    }
    if (chatRes.ok) {
      const data = await chatRes.json();
      setMessages(data.messages || []);
      setProfile(data.profile || null);
    }
    if (bookingsRes.ok) {
      const data = await bookingsRes.json();
      setBookings(data.bookings || []);
      setApprovals(data.approvals || []);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || null;

  const upsertTripInState = (trip: TripRecord) => {
    setTrips((prev) => {
      const exists = prev.some((t) => t.id === trip.id);
      if (exists) {
        return prev.map((t) => (t.id === trip.id ? trip : t));
      }
      return [trip, ...prev];
    });
    setActiveTripId(trip.id);
  };

  const handleSendMessage = async (msg: string) => {
    setIsSendingChat(true);
    try {
      const optimistic: ChatMessageRecord = {
        id: Date.now(),
        session_id: SESSION_ID,
        role: 'user',
        content: msg,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: SESSION_ID,
          message: msg,
          active_trip_id: activeTrip?.id ?? null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        if (data.trip) {
          upsertTripInState(data.trip);
          showToast(`Planned ${data.trip.title}`);
        }
        const chatRes = await fetch(`/api/chat/${SESSION_ID}`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setMessages(chatData.messages || []);
        }
      }
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    setActiveTab('planner');
    await handleSendMessage(prompt);
  };

  const handleCreateTripPlan = async (params: {
    destination: string;
    origin: string;
    duration_days: number;
    budget: number;
    travellers: number;
    interests: string[];
    hotel_preference: string;
  }) => {
    setIsReplanning(true);
    try {
      const res = await fetch('/api/trips/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: SESSION_ID,
          ...params,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        upsertTripInState(data.trip);
        if (data.profile) setProfile(data.profile);
        setActiveTab('itinerary');
        showToast(`Created ${data.trip.title}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Could not plan trip for this destination');
      }
    } finally {
      setIsReplanning(false);
    }
  };

  const handleDeleteTrip = async (tripId: number) => {
    const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
    if (res.ok) {
      setTrips((prev) => {
        const next = prev.filter((t) => t.id !== tripId);
        if (activeTripId === tripId) {
          setActiveTripId(next[0]?.id ?? null);
        }
        return next;
      });
      showToast('Removed saved trip');
    }
  };

  const handleResetChat = async () => {
    await fetch(`/api/chat/${SESSION_ID}/reset`, { method: 'POST' });
    setMessages([]);
    setProfile({
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
    });
    showToast('Started fresh traveller profile');
  };

  const handleReplan = async (payload: {
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
  }) => {
    if (!activeTrip) return;
    setIsReplanning(true);
    try {
      const res = await fetch(`/api/trips/${activeTrip.id}/replan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        upsertTripInState(data.trip);
        showToast(data.explanation || 'Itinerary updated');
      }
    } finally {
      setIsReplanning(false);
    }
  };

  const handlePreviewBooking = (type: 'flight' | 'hotel', item: FlightOption | HotelOption) => {
    if (!activeTrip) return;
    const guests = activeTrip.profile.travellers || 2;
    const nights = Math.max(1, activeTrip.days.length - 1);
    const start = new Date();
    start.setDate(start.getDate() + 14);
    const end = new Date(start);
    end.setDate(end.getDate() + nights);
    const checkIn = start.toISOString().slice(0, 10);
    const checkOut = end.toISOString().slice(0, 10);

    if (type === 'flight') {
      const f = item as FlightOption;
      setPendingPreview({
        trip_id: activeTrip.id,
        booking_type: 'flight',
        title: `${f.airline} ${f.flight_number} (${f.route})`,
        provider: f.provider,
        price: f.price_per_person * guests,
        check_in_or_date: checkIn,
        check_out_or_return: checkOut,
        guests,
        cancellation_terms: f.cancellation_terms,
        passengers: Array.from({ length: guests }, (_, i) => `Traveller ${i + 1}`),
        idempotency_key: `flight-${activeTrip.id}-${f.id}-${Date.now()}`,
      });
    } else {
      const h = item as HotelOption;
      setPendingPreview({
        trip_id: activeTrip.id,
        booking_type: 'hotel',
        title: `${h.name} (${activeTrip.selected_destination.name})`,
        provider: h.provider,
        price: h.price_per_night * nights,
        check_in_or_date: checkIn,
        check_out_or_return: checkOut,
        guests,
        cancellation_terms: h.cancellation_terms,
        passengers: Array.from({ length: guests }, (_, i) => `Traveller ${i + 1}`),
        idempotency_key: `hotel-${activeTrip.id}-${h.id}-${Date.now()}`,
      });
    }
    setActiveTab('bookings');
  };

  const handleStartQuickPreview = (type: 'flight' | 'hotel') => {
    if (!activeTrip) return;
    if (type === 'flight') {
      handlePreviewBooking('flight', activeTrip.selected_flight);
    } else {
      handlePreviewBooking('hotel', activeTrip.selected_hotel);
    }
  };

  const handleConfirmPreview = async () => {
    if (!pendingPreview) return;
    const res = await fetch('/api/bookings/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingPreview),
    });
    if (res.ok) {
      const data = await res.json();
      setPendingPreview(null);
      await refreshAll();
      showToast(`Confirmed ${data.booking.booking_reference}`);
    }
  };

  const navItems: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'AI Travel Planner', icon: MessageSquare },
    { id: 'itinerary', label: 'My Itinerary', icon: Map },
    { id: 'budget', label: 'Budget Planner', icon: Wallet },
    { id: 'bookings', label: 'Bookings & Trips', icon: Briefcase },
  ];

  const activeLabel = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#14211E] flex flex-col lg:flex-row">
      {/* Classic Editorial Concierge Sidebar */}
      <aside className="lg:w-64 bg-[#FAF8F4] border-b lg:border-b-0 lg:border-r border-[#E4DFD4] flex flex-col justify-between shrink-0">
        <div>
          <div className="px-6 py-4 border-b border-[#E4DFD4] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#0F4C45] shrink-0" />
                <span className="text-2xl font-semibold tracking-tight text-[#14211E] font-display leading-none">
                  TravelGenie
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#52605C] mt-1 pl-7">
                Private Concierge
              </p>
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#0F4C45]/10 text-[#0F4C45] font-semibold'
                      : 'text-[#52605C] font-medium hover:text-[#14211E] hover:bg-[#EFECE3]/70'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#0F4C45]' : 'text-[#7A847F]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active Trip Switcher */}
          {trips.length > 0 && (
            <div className="px-4 py-4 border-t border-[#E4DFD4] space-y-2">
              <label
                htmlFor="active-trip-select"
                className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#52605C]"
              >
                Active Dossier
              </label>
              <select
                id="active-trip-select"
                value={activeTrip?.id || ''}
                onChange={(e) => setActiveTripId(Number(e.target.value))}
                className="w-full text-xs bg-white border border-[#DCD5C7] rounded-md px-2.5 py-2 text-[#14211E] focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.days.length}d)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="hidden lg:block px-6 py-4 border-t border-[#E4DFD4] text-[11px] text-[#7A847F]">
          <p className="font-display italic text-sm text-[#52605C]">
            Curated routes & transparent math.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean 3-Zone Editorial Top Bar */}
        <header className="h-16 bg-[#FAF8F4]/90 backdrop-blur-xs border-b border-[#E4DFD4] px-6 flex items-center justify-between gap-8 shrink-0">
          <div className="text-sm text-[#52605C] truncate flex items-center gap-2">
            <span className="font-semibold text-[#14211E]">{activeLabel}</span>
            {activeTrip && (
              <>
                <span aria-hidden="true" className="text-[#B7AFA0]">·</span>
                <span className="font-display text-base font-medium text-[#14211E] truncate">
                  {activeTrip.title}
                </span>
              </>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#52605C]">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className="hover:text-[#0F4C45] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Chat Agent
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('itinerary')}
              className="hover:text-[#0F4C45] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Route Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('budget')}
              className="hover:text-[#0F4C45] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Budget Math
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className="hover:text-[#0F4C45] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Disruptions
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className="classic-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan New Trip</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {toastMessage && (
            <div className="mb-5 px-4 py-2.5 bg-[#14211E] text-[#FAF8F4] border border-[#2C3E39] text-xs font-medium rounded-md flex items-center justify-between shadow-sm">
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-[#B7AFA0] hover:text-white ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              trips={trips}
              activeTrip={activeTrip}
              bookings={bookings}
              isPlanning={isReplanning}
              onSelectTrip={(id) => setActiveTripId(id)}
              onDeleteTrip={handleDeleteTrip}
              onNavigate={setActiveTab}
              onQuickPrompt={handleQuickPrompt}
              onCreateTripPlan={handleCreateTripPlan}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerView
              messages={messages}
              profile={profile}
              activeTrip={activeTrip}
              isSending={isSendingChat || isReplanning}
              onSendMessage={handleSendMessage}
              onResetChat={handleResetChat}
              onPreviewBooking={handlePreviewBooking}
              onSelectDestination={(destId, originCity) => {
                const resolvedOrigin = originCity?.trim() || profile?.origin || activeTrip?.profile.origin || '';
                if (!resolvedOrigin) {
                  showToast('Please enter your source (departure) city first.');
                  return;
                }
                if (activeTrip) {
                  handleReplan({
                    action: 'change_destination',
                    destination_id: destId,
                    origin: resolvedOrigin,
                  });
                } else {
                  handleCreateTripPlan({
                    destination: destId,
                    origin: resolvedOrigin,
                    duration_days: profile?.duration_days || 4,
                    budget: profile?.budget || 20000,
                    travellers: profile?.travellers || 2,
                    interests: profile?.interests || [],
                    hotel_preference: profile?.hotel_preference || 'budget',
                  });
                }
              }}
              onOpenItinerary={() => setActiveTab('itinerary')}
            />
          )}

          {activeTab === 'itinerary' && (
            <ItineraryView
              trip={activeTrip}
              isReplanning={isReplanning}
              onReplan={handleReplan}
              onGoPlanner={() => setActiveTab('planner')}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetView
              trip={activeTrip}
              isReplanning={isReplanning}
              onOptimizeBudget={(val) =>
                handleReplan({ action: 'reduce_budget', new_budget: val })
              }
              onGoPlanner={() => setActiveTab('planner')}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsView
              activeTrip={activeTrip}
              bookings={bookings}
              approvals={approvals}
              pendingPreview={pendingPreview}
              onStartQuickPreview={handleStartQuickPreview}
              onConfirmPreview={handleConfirmPreview}
              onDismissPreview={() => setPendingPreview(null)}
              onRefreshBookings={refreshAll}
              onTripUpdated={(updated) => upsertTripInState(updated)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
