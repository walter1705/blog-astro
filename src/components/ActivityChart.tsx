import { useState, useEffect, useRef, useCallback } from 'react';

type Range = '30d' | '6m' | '1y' | 'all';

interface Bar {
  key: string;
  label: string;
  count: number;
}

interface Tooltip {
  bar: Bar;
  x: number;
  y: number;
}

interface Props {
  initialData: Bar[];
  githubUser: string;
}

const RANGES: { value: Range; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '6m',  label: '6m'  },
  { value: '1y',  label: '1y'  },
  { value: 'all', label: 'All' },
];

// ── GitHub fetch helpers ─────────────────────────────────────────────────────

async function fetchEvents(user: string, maxPages: number): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const res = await fetch(
        `https://api.github.com/users/${user}/events?per_page=30&page=${page}`,
        { headers: { Accept: 'application/vnd.github.v3+json' } },
      );
      if (!res.ok) break;
      const data = await res.json() as unknown[];
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
    } catch {
      break;
    }
  }
  return all;
}

function eventCount(e: unknown): number {
  const ev = e as { type: string; payload?: { commits?: unknown[] } };
  return ev.type === 'PushEvent' ? (ev.payload?.commits?.length ?? 1) : 1;
}

// ── Grouping strategies ──────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

function buildWeekBars(events: unknown[], weeks: number): Bar[] {
  const now = new Date();
  const bars: Bar[] = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    const ws = getMonday(d);
    const key = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`;
    return { key, label: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: 0 };
  });

  for (const e of events) {
    const ed = new Date((e as { created_at?: string }).created_at ?? '');
    if (isNaN(ed.getTime())) continue;
    const wsKey = (() => {
      const ws = getMonday(ed);
      return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`;
    })();
    const bar = bars.find((b) => b.key === wsKey);
    if (bar) bar.count += eventCount(e);
  }
  return bars;
}

function buildMonthBars(events: unknown[]): Bar[] {
  if (events.length === 0) return [];
  const map = new Map<string, Bar>();
  for (const e of events) {
    const d = new Date((e as { created_at?: string }).created_at ?? '');
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: 0,
      });
    }
    map.get(key)!.count += eventCount(e);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, bar]) => bar);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ActivityChart({ initialData, githubUser }: Props) {
  const [range, setRange]     = useState<Range>('30d');
  const [bars, setBars]       = useState<Bar[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  const maxCount    = Math.max(...bars.map((b) => b.count), 1);
  const totalEvents = bars.reduce((s, b) => s + b.count, 0);

  const loadRange = useCallback(
    async (r: Range) => {
      if (r === '30d') { setBars(initialData); return; }
      setLoading(true);
      try {
        const pages  = r === '6m' ? 5 : 10;
        const events = await fetchEvents(githubUser, pages);
        if (r === '6m')      setBars(buildWeekBars(events, 26));
        else if (r === '1y') setBars(buildWeekBars(events, 52));
        else                 setBars(buildMonthBars(events));
      } finally {
        setLoading(false);
      }
    },
    [githubUser, initialData],
  );

  useEffect(() => { loadRange(range); }, [range, loadRange]);

  function handleBarEnter(e: React.MouseEvent<HTMLDivElement>, bar: Bar) {
    const cRect = containerRef.current?.getBoundingClientRect();
    const bRect = e.currentTarget.getBoundingClientRect();
    if (!cRect) return;
    setTooltip({
      bar,
      x: bRect.left - cRect.left + bRect.width / 2,
      y: bRect.top - cRect.top,
    });
  }

  return (
    <div className="flex flex-col h-full min-h-52">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-mono text-gray-400 uppercase tracking-wider">
          GitHub Activity
        </h2>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              disabled={loading}
              className={`text-xs font-mono px-2.5 py-1 rounded transition-colors disabled:opacity-50 cursor-pointer ${
                range === r.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600'
              }`}
            >
              {r.label}
            </button>
          ))}
          {loading && (
            <span className="text-xs text-indigo-400 font-mono ml-1 animate-pulse">···</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative flex-1 flex flex-col">
        <div className="flex-1 flex items-end gap-0.5">
          {bars.map((bar, i) => {
            const h = bar.count > 0 ? Math.max((bar.count / maxCount) * 90, 4) : 2;
            return (
              <div
                key={`${bar.key}-${i}`}
                className={`flex-1 rounded-sm transition-all cursor-default ${
                  bar.count > 0
                    ? 'bg-indigo-500/60 hover:bg-indigo-400/90'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                style={{ height: `${h}%` }}
                onMouseEnter={(e) => handleBarEnter(e, bar)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltip !== null && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-2xl text-xs font-mono whitespace-nowrap">
              <p className="text-gray-400">{tooltip.bar.label}</p>
              <p className="text-white font-bold mt-0.5">
                {tooltip.bar.count === 0
                  ? 'No activity'
                  : `${tooltip.bar.count} event${tooltip.bar.count !== 1 ? 's' : ''}`}
              </p>
            </div>
            {/* Arrow */}
            <div
              className="mx-auto"
              style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #374151',
              }}
            />
          </div>
        )}

        {/* Bottom labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600 font-mono">
          <span>{bars.at(0)?.label ?? ''}</span>
          <span>{totalEvents} events</span>
          <span>{bars.at(-1)?.label ?? ''}</span>
        </div>

        {range !== '30d' && (
          <p className="mt-1 text-center text-xs text-gray-700 font-mono">
            Limited to last ~300 GitHub events
          </p>
        )}
      </div>
    </div>
  );
}
