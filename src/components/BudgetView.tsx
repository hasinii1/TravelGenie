import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { TripRecord } from '../types/travel';
import { formatINR } from '../lib/assets';
import { SourceBadge } from './SourceBadge';

interface BudgetViewProps {
  trip: TripRecord | null;
  isReplanning: boolean;
  onOptimizeBudget: (newBudgetPerPerson: number) => void;
  onGoPlanner: () => void;
}

export function BudgetView({ trip, isReplanning, onOptimizeBudget, onGoPlanner }: BudgetViewProps) {
  const [targetInput, setTargetInput] = useState<string>(
    String(trip?.budget.per_person_budget_target || 15000)
  );

  useEffect(() => {
    if (trip?.budget.per_person_budget_target) {
      setTargetInput(String(trip.budget.per_person_budget_target));
    }
  }, [trip?.id, trip?.budget.per_person_budget_target]);

  if (!trip) {
    return (
      <div className="classic-card rounded-lg p-12 text-center space-y-4">
        <h2 className="text-2xl font-semibold text-[#14211E] font-display">
          No Active Budget Ledger
        </h2>
        <p className="text-sm text-[#52605C]">
          Plan a trip first to inspect itemized transport, stay, dining, and emergency reserve
          calculations.
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

  const { budget } = trip;
  const rows = [
    { label: 'Transport (Round-trip air/rail est.)', amount: budget.categories.transport },
    { label: 'Accommodation', amount: budget.categories.accommodation },
    { label: 'Food & Local Dining', amount: budget.categories.food },
    { label: 'Activities & Entry Fees', amount: budget.categories.activities },
    { label: 'Local Transfers', amount: budget.categories.local_transfers },
    { label: 'Emergency Buffer (8%)', amount: budget.categories.emergency_buffer },
  ];

  const handleApplyTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(targetInput);
    if (val >= 5000) {
      onOptimizeBudget(val);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 classic-card rounded-lg p-6 lg:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#EFECE3] pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#52605C]">
                Estimated Total · {budget.travellers} travellers · {budget.duration_days} days
              </p>
              <h1 className="text-4xl font-semibold text-[#14211E] mt-1 font-display tabular-nums">
                {formatINR(budget.total_estimated)}
              </h1>
              <p className="text-sm text-[#42504C] mt-1 font-mono-tabular">
                {formatINR(budget.per_person_estimated)}/person · Target:{' '}
                {formatINR(budget.per_person_budget_target)}/person
              </p>
            </div>
            <SourceBadge status={budget.source_status} />
          </div>

          <div
            className={`px-4 py-3 rounded-md border text-xs flex items-center gap-2.5 ${
              budget.within_budget
                ? 'bg-[#ECF6F3] border-[#C1DFD7] text-[#0F4C45]'
                : 'bg-[#FDF8EC] border-[#E8D5A7] text-[#854D0E]'
            }`}
          >
            {budget.within_budget ? (
              <CheckCircle2 className="w-4 h-4 text-[#0F4C45] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#854D0E] shrink-0" />
            )}
            <span>
              {budget.within_budget
                ? `Within target ceiling with ${formatINR(Math.abs(budget.variance_per_person))}/person headroom.`
                : `Exceeds target by ${formatINR(budget.variance_per_person)}/person. Run the Budget Optimizer to rebalance stays and activities.`}
            </span>
          </div>

          {/* Itemized Breakdown */}
          <div className="space-y-3.5 pt-1">
            {rows.map((row) => {
              const pct = Math.round((row.amount / Math.max(1, budget.total_estimated)) * 100);
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#42504C]">{row.label}</span>
                    <span className="font-mono-tabular font-semibold text-[#14211E]">
                      {formatINR(row.amount)}{' '}
                      <span className="text-xs font-normal text-[#7A847F]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-[#EFECE3] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#0F4C45] rounded"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agentic Budget Optimizer */}
        <div className="lg:col-span-5 classic-card rounded-lg p-6 lg:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#14211E] font-display">
                Agentic Budget Optimizer
              </h2>
              <p className="text-xs text-[#52605C] mt-1 leading-relaxed">
                Adjust your per-person ceiling and let the Budget + Validation agents swap stays,
                carriers, and transfers automatically.
              </p>
            </div>

            <form onSubmit={handleApplyTarget} className="space-y-3">
              <label htmlFor="budget-target" className="block text-xs font-medium text-[#42504C]">
                New per-person budget ceiling (INR)
              </label>
              <div className="flex gap-2">
                <input
                  id="budget-target"
                  type="number"
                  min={5000}
                  step={500}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="flex-1 text-sm font-mono-tabular text-[#14211E] bg-[#FAF8F4] border border-[#DCD5C7] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C45]"
                />
                <button
                  type="submit"
                  disabled={isReplanning}
                  className="classic-btn-primary px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isReplanning ? 'Recalculating...' : 'Optimize Plan'}
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2 pt-1">
              {[12000, 15000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isReplanning}
                  onClick={() => {
                    setTargetInput(String(preset));
                    onOptimizeBudget(preset);
                  }}
                  className="px-3 py-1.5 text-xs font-mono-tabular bg-[#FAF8F4] border border-[#E4DFD4] hover:bg-[#EFECE3] text-[#14211E] rounded-md cursor-pointer"
                >
                  Target {formatINR(preset)}/person
                </button>
              ))}
            </div>

            {isReplanning && (
              <div className="flex items-center gap-2 text-xs text-[#0F4C45]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validation loopback adjusting transport & stay...</span>
              </div>
            )}
          </div>

          {/* Optimization Explanation */}
          <div className="border-t border-[#E4DFD4] pt-4 space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#52605C]">
              Applied Optimizations
            </h3>
            {budget.optimization_notes && budget.optimization_notes.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-[#42504C] list-disc pl-4">
                {budget.optimization_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#52605C] leading-relaxed">
                Current selections fit within your target ceiling. Set a tighter target above to
                watch the Validation Agent rebalance your trip.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
