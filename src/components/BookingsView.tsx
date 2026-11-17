import { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  X,
} from 'lucide-react';
import type { ApprovalRecord, BookingRecord, TripRecord } from '../types/travel';
import { formatINR } from '../lib/assets';
import { SourceBadge } from './SourceBadge';

interface BookingsViewProps {
  activeTrip: TripRecord | null;
  bookings: BookingRecord[];
  approvals: ApprovalRecord[];
  pendingPreview: {
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
  } | null;
  onStartQuickPreview: (type: 'flight' | 'hotel') => void;
  onConfirmPreview: () => Promise<void>;
  onDismissPreview: () => void;
  onRefreshBookings: () => Promise<void>;
  onTripUpdated: (trip: TripRecord) => void;
}

export function BookingsView({
  activeTrip,
  bookings,
  approvals,
  pendingPreview,
  onStartQuickPreview,
  onConfirmPreview,
  onDismissPreview,
  onRefreshBookings,
  onTripUpdated,
}: BookingsViewProps) {
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<Record<string, unknown> | null>(null);
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    kind: 'cancel' | 'modify';
    bookingId: number;
    warning: string;
    newCheckIn?: string;
    newCheckOut?: string;
  } | null>(null);
  const [disruptionType, setDisruptionType] = useState<
    'flight_delayed' | 'hotel_unavailable' | 'bad_weather' | 'attraction_closed' | 'early_return'
  >('bad_weather');
  const [disruptionProposal, setDisruptionProposal] = useState<{
    disruption_type: string;
    title: string;
    affected: string;
    alternative: string;
    additional_cost_inr: number;
    fee_implication: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCopy = (b: BookingRecord) => {
    const text = `Booking confirmation (${b.booking_status})\nRef: ${b.booking_reference}\n${b.title}\nDates: ${b.check_in_or_date} to ${b.check_out_or_return}\nGuests: ${b.guests}\nTotal: ${formatINR(b.price)}`;
    navigator.clipboard.writeText(text);
    setCopiedRef(b.booking_reference);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleViewVoucher = async (bookingId: number) => {
    const res = await fetch(`/api/bookings/${bookingId}/voucher`);
    if (res.ok) {
      const data = await res.json();
      setActiveVoucher(data.voucher);
    }
  };

  const handleCancelPreview = async (bookingId: number) => {
    const res = await fetch(`/api/bookings/${bookingId}/cancel/preview`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setActionConfirmModal({
        kind: 'cancel',
        bookingId,
        warning: data.warning,
      });
    }
  };

  const handleModifyPreview = async (b: BookingRecord) => {
    const baseIn = new Date(b.check_in_or_date || Date.now());
    const baseOut = new Date(b.check_out_or_return || Date.now() + 3 * 86400000);
    if (!Number.isNaN(baseIn.getTime())) baseIn.setDate(baseIn.getDate() + 1);
    if (!Number.isNaN(baseOut.getTime())) baseOut.setDate(baseOut.getDate() + 1);
    const newCheckIn = Number.isNaN(baseIn.getTime()) ? '2026-12-19' : baseIn.toISOString().slice(0, 10);
    const newCheckOut = Number.isNaN(baseOut.getTime()) ? '2026-12-22' : baseOut.toISOString().slice(0, 10);
    const res = await fetch(`/api/bookings/${b.id}/modify/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_check_in: newCheckIn, new_check_out: newCheckOut }),
    });
    if (res.ok) {
      const data = await res.json();
      setActionConfirmModal({
        kind: 'modify',
        bookingId: b.id,
        warning: data.warning,
        newCheckIn,
        newCheckOut,
      });
    }
  };

  const executeConfirmedAction = async () => {
    if (!actionConfirmModal) return;
    setBusy(true);
    try {
      const url =
        actionConfirmModal.kind === 'cancel'
          ? `/api/bookings/${actionConfirmModal.bookingId}/cancel/confirm`
          : `/api/bookings/${actionConfirmModal.bookingId}/modify/confirm`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_check_in: actionConfirmModal.newCheckIn,
          new_check_out: actionConfirmModal.newCheckOut,
        }),
      });
      await onRefreshBookings();
      setActionConfirmModal(null);
    } finally {
      setBusy(false);
    }
  };

  const handleAnalyzeDisruption = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/disruptions/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeTrip?.id,
          disruption_type: disruptionType,
          apply: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDisruptionProposal(data.proposal);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApproveDisruption = async () => {
    if (!disruptionProposal) return;
    setBusy(true);
    try {
      const activeBooking = bookings.find((b) => b.booking_status !== 'Cancelled');
      const res = await fetch('/api/disruptions/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeTrip?.id,
          booking_id: activeBooking?.id,
          disruption_type: disruptionProposal.disruption_type,
          apply: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trip) onTripUpdated(data.trip);
        await onRefreshBookings();
        setDisruptionProposal(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Approval Booking Preview Card */}
      {pendingPreview && (
        <section className="classic-card border-[#0F4C45] rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#0F4C45]">
                Step 2 & 3 · Review & Explicit Approval
              </p>
              <h2 className="text-2xl font-semibold text-[#14211E] font-display mt-0.5">
                Confirm Simulated Booking: {pendingPreview.title}
              </h2>
              <p className="text-xs text-[#52605C] mt-1">
                {pendingPreview.check_in_or_date} to {pendingPreview.check_out_or_return} ·{' '}
                {pendingPreview.guests} guests · {pendingPreview.passengers.join(', ')}
              </p>
            </div>
            <SourceBadge status="Simulated" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-y border-[#EFECE3] text-xs">
            <div>
              <span className="text-[#52605C] block">Total Simulated Fare</span>
              <span className="text-base font-semibold text-[#14211E] font-mono-tabular">
                {formatINR(pendingPreview.price)}
              </span>
            </div>
            <div>
              <span className="text-[#52605C] block">Provider Adapter</span>
              <span className="font-medium text-[#14211E]">{pendingPreview.provider}</span>
            </div>
            <div>
              <span className="text-[#52605C] block">Cancellation Terms</span>
              <span className="text-[#42504C]">{pendingPreview.cancellation_terms}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#854D0E]">
              Prototype safeguard: Confirming creates an idempotent SQLite voucher (no real card
              charge).
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onDismissPreview}
                className="px-3.5 py-2 text-xs font-medium text-[#42504C] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md hover:bg-[#EFECE3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmPreview}
                className="classic-btn-primary px-4 py-2 text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approve & Generate Confirmation</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Quick Booking Launcher from Active Trip */}
      {activeTrip && !pendingPreview && (
        <section className="classic-card rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#14211E] font-display">
              Ready to reserve selections for {activeTrip.title}?
            </h2>
            <p className="text-xs text-[#52605C] mt-0.5">
              Start an approval-gated demo booking for your selected stay ({activeTrip.selected_hotel.name}) or transport ({activeTrip.selected_flight.flight_number}).
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onStartQuickPreview('hotel')}
              className="classic-btn-primary px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
            >
              Book Selected Stay
            </button>
            <button
              type="button"
              onClick={() => onStartQuickPreview('flight')}
              className="px-3.5 py-2 text-xs font-medium bg-[#FAF8F4] border border-[#DCD5C7] hover:bg-[#EFECE3] text-[#14211E] rounded-md cursor-pointer whitespace-nowrap"
            >
              Book Selected Flight
            </button>
          </div>
        </section>
      )}

      {/* Bookings & Confirmations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="classic-card rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4DFD4] bg-[#FAF8F4] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#14211E] font-display leading-tight">
                  Bookings & Confirmations
                </h2>
                <p className="text-xs text-[#52605C]">
                  Idempotent references, archival vouchers, and fee-previewed cancellations.
                </p>
              </div>
              <span className="text-xs text-[#52605C] font-mono-tabular">
                {bookings.length} records
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#52605C]">
                No bookings confirmed yet. Use the buttons above or the Planner comparison tables to
                preview and confirm a reservation.
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE3]">
                {bookings.map((b) => (
                  <div key={b.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono-tabular font-semibold text-[#0F4C45]">
                            {b.booking_reference}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-medium ${
                              b.booking_status === 'Cancelled'
                                ? 'text-red-700'
                                : b.booking_status === 'Modified'
                                ? 'text-amber-800'
                                : 'text-emerald-800'
                            }`}
                          >
                            {b.booking_status}
                          </span>
                          <SourceBadge status={b.source_status} />
                        </div>
                        <h3 className="text-base font-semibold text-[#14211E] mt-1">{b.title}</h3>
                        <p className="text-xs text-[#52605C] mt-0.5 font-mono-tabular">
                          {b.check_in_or_date} → {b.check_out_or_return} · {b.guests} guests ·{' '}
                          {b.passengers.join(', ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-semibold text-[#14211E] font-mono-tabular">
                          {formatINR(b.price)}
                        </p>
                        <p className="text-[11px] text-[#52605C]">{b.provider}</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#42504C]">{b.cancellation_terms}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(b)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#FAF8F4] border border-[#E4DFD4] hover:bg-[#EFECE3] text-[#14211E] rounded cursor-pointer"
                      >
                        {copiedRef === b.booking_reference ? (
                          <Check className="w-3.5 h-3.5 text-[#0F4C45]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {copiedRef === b.booking_reference ? 'Copied' : 'Copy confirmation'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewVoucher(b.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#FAF8F4] border border-[#E4DFD4] hover:bg-[#EFECE3] text-[#14211E] rounded cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Voucher</span>
                      </button>

                      {b.booking_status !== 'Cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleModifyPreview(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DCD5C7] hover:bg-[#FAF8F4] text-[#42504C] rounded cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Modify Dates</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelPreview(b.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-red-200 hover:bg-red-50 text-red-700 rounded cursor-pointer"
                          >
                            <span>Request Cancellation</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Travel Disruption Support Agent + Approval Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          <section className="classic-card rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#14211E] font-display leading-tight">
                Travel Disruption Support Agent
              </h2>
              <p className="text-xs text-[#52605C] mt-0.5">
                Simulate disruptions, review fee implications, and approve recovery workflows.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="disruption-select" className="block text-xs font-medium text-[#42504C]">
                Disruption Scenario
              </label>
              <div className="flex gap-2">
                <select
                  id="disruption-select"
                  value={disruptionType}
                  onChange={(e) =>
                    setDisruptionType(e.target.value as typeof disruptionType)
                  }
                  className="flex-1 text-xs bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 text-[#14211E] focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
                >
                  <option value="bad_weather">Bad weather / heavy rain on Day 2</option>
                  <option value="flight_delayed">Inbound flight delayed 4 hours</option>
                  <option value="hotel_unavailable">Hotel room unavailable at check-in</option>
                  <option value="attraction_closed">Key heritage site closed</option>
                  <option value="early_return">Traveller needs to return 1 day early</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAnalyzeDisruption}
                  className="px-3.5 py-2 text-xs font-medium bg-[#14211E] hover:bg-[#233530] text-white rounded-md whitespace-nowrap cursor-pointer"
                >
                  Assess Impact
                </button>
              </div>
            </div>

            {disruptionProposal && (
              <div className="bg-[#FDF8EC] border border-[#E8D5A7] rounded-md p-4 space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[#14211E]">{disruptionProposal.title}</p>
                    <p className="text-[#42504C]">
                      <strong>Affected:</strong> {disruptionProposal.affected}
                    </p>
                    <p className="text-[#42504C]">
                      <strong>Proposed Recovery:</strong> {disruptionProposal.alternative}
                    </p>
                    <p className="text-[#854D0E] font-medium">
                      <strong>Cost / Fee Implication:</strong> {disruptionProposal.fee_implication}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDisruptionProposal(null)}
                    className="px-3 py-1.5 bg-white border border-[#DCD5C7] text-[#42504C] rounded cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleApproveDisruption}
                    className="classic-btn-primary px-3 py-1.5 font-medium rounded cursor-pointer"
                  >
                    Approve & Execute Recovery
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Approval Audit Trail */}
          <section className="classic-card rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E4DFD4] bg-[#FAF8F4]">
              <h3 className="text-sm font-semibold text-[#14211E]">Approval Audit Trail</h3>
              <p className="text-xs text-[#52605C]">Logged in SQLite approval_requests table.</p>
            </div>
            <div className="divide-y divide-[#EFECE3] max-h-64 overflow-y-auto text-xs">
              {approvals.length === 0 ? (
                <p className="p-4 text-[#52605C]">No approval events logged yet.</p>
              ) : (
                approvals.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#14211E]">{a.summary}</p>
                      <p className="text-[#52605C] mt-0.5">
                        Approved by {a.approved_by} · {a.action_type}
                      </p>
                    </div>
                    <span className="font-mono-tabular text-[#42504C] whitespace-nowrap shrink-0">
                      {a.fee_impact_inr > 0 ? `+${formatINR(a.fee_impact_inr)}` : '₹0 fee'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Cancel / Modify Confirmation Modal */}
      {actionConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#14211E]/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="classic-card rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-[#14211E] font-display">
                {actionConfirmModal.kind === 'cancel'
                  ? 'Confirm Booking Cancellation'
                  : 'Confirm Booking Modification'}
              </h3>
              <button
                type="button"
                onClick={() => setActionConfirmModal(null)}
                className="text-[#7A847F] hover:text-[#14211E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#42504C] leading-relaxed">{actionConfirmModal.warning}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium text-[#42504C] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md cursor-pointer"
              >
                Keep Existing Booking
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={executeConfirmedAction}
                className={`px-4 py-2 text-xs font-medium text-white rounded-md cursor-pointer ${
                  actionConfirmModal.kind === 'cancel'
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'classic-btn-primary'
                }`}
              >
                {busy ? 'Processing...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archival Voucher Modal */}
      {activeVoucher && (
        <div className="fixed inset-0 z-50 bg-[#14211E]/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="classic-card rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4DFD4] pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[#0F4C45] font-semibold">
                  TravelGenie Archival Voucher
                </p>
                <h3 className="text-xl font-semibold text-[#14211E] font-mono-tabular mt-0.5">
                  {String(activeVoucher.voucher_code)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVoucher(null)}
                className="text-[#7A847F] hover:text-[#14211E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-[#52605C]">Booking Reference</dt>
                <dd className="font-mono-tabular font-semibold text-[#14211E]">
                  {String(activeVoucher.booking_reference)}
                </dd>
              </div>
              <div>
                <dt className="text-[#52605C]">Source Status</dt>
                <dd className="font-medium text-[#854D0E]">{String(activeVoucher.source_status)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[#52605C]">Reservation</dt>
                <dd className="font-semibold text-[#14211E]">{String(activeVoucher.title)}</dd>
              </div>
              <div>
                <dt className="text-[#52605C]">Dates</dt>
                <dd className="font-mono-tabular text-[#42504C]">{String(activeVoucher.dates)}</dd>
              </div>
              <div>
                <dt className="text-[#52605C]">Total</dt>
                <dd className="font-mono-tabular font-semibold text-[#14211E]">
                  {String(activeVoucher.total_price)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[#52605C]">Passengers</dt>
                <dd className="text-[#42504C]">
                  {Array.isArray(activeVoucher.passengers)
                    ? activeVoucher.passengers.join(', ')
                    : ''}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-[#52605C] bg-[#FAF8F4] border border-[#E4DFD4] rounded p-2.5">
              {String(activeVoucher.note)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
