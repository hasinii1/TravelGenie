import { CheckCircle2, Clock, Database, AlertTriangle } from 'lucide-react';
import type { SourceStatus } from '../types/travel';
import { formatSourceMeaning } from '../lib/assets';

export function SourceBadge({ status }: { status: SourceStatus }) {
  const styles: Record<SourceStatus, string> = {
    Live: 'text-emerald-800',
    Estimated: 'text-[#52605C]',
    Simulated: 'text-amber-800',
    Unavailable: 'text-red-700',
  };

  const Icon =
    status === 'Live'
      ? CheckCircle2
      : status === 'Estimated'
      ? Clock
      : status === 'Simulated'
      ? Database
      : AlertTriangle;

  return (
    <span
      title={formatSourceMeaning(status)}
      className={`inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap shrink-0 ${styles[status]}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

