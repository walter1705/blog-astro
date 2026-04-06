import { useState, useEffect, useRef, useCallback } from 'react';

type Range = '30d' | '6m' | '1y' | 'all';

interface Bar      { key: string; label: string; count: number }
interface Tooltip  { bar: Bar; x: number; y: number }
interface Commit   { date: string }                        // YYYY-MM-DD
interface RepoInfo { name: string; createdYear: number }

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

const GH = { Accept: 'application/vnd.github.v3+json' };

// ── API helpers ───────────────────────────────────────────────────────────────

async function getOwnRepos(user: string): Promise<RepoInfo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${user}/repos?type=public&per_page=100`,
      { headers: GH },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { name: string; fork: boolean; created_at: string }[];
    return data
      .filter((r) => !r.fork)
      .map((r) => ({ name: r.name, createdYear: new Date(r.created_at).getFullYear() }));
  } catch { return []; }
}

/** Fetches all commits by `user` across `repos` since `since` (ISO string).
 *  Returns lightweight objects with just the commit date. */
async function getAllCommits(
  user: string,
  repos: RepoInfo[],
  since: string,
): Promise<Commit[]> {
  const all: Commit[] = [];
  await Promise.all(
    repos.map(async ({ name }) => {
      try {
        let page = 1;
        while (true) {
          const res = await fetch(
            `https://api.github.com/repos/${user}/${name}/commits` +
            `?author=${user}&since=${since}&per_page=100&page=${page}`,
            { headers: GH },
          );
          if (!res.ok) break;
          const commits = (await res.json()) as { commit: { author: { date: string } } }[];
          for (const c of commits) {
            const date = c.commit?.author?.date?.slice(0, 10);
            if (date) all.push({ date });
          }
          if (commits.length < 100) break;
          page++;
        }
      } catch { /* skip repo */ }
    }),
  );
  return all;
}

// ── Bar builders ──────────────────────────────────────────────────────────────

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

function buildWeekBars(commits: Commit[], weeks: number): Bar[] {
  const now = new Date();
  const bars: Bar[] = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    const ws = monday(d);
    return {
      key:   toKey(ws),
      label: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: 0,
    };
  });
  const idx = new Map(bars.map((b, i) => [b.key, i]));

  for (const c of commits) {
    const d = new Date(c.date);
    if (isNaN(d.getTime())) continue;
    const key = toKey(monday(d));
    const i   = idx.get(key);
    if (i !== undefined) bars[i].count++;
  }
  return bars;
}

function buildYearBars(commits: Commit[]): Bar[] {
  const map = new Map<number, number>();
  for (const c of commits) {
    const y = parseInt(c.date.slice(0, 4), 10);
    if (!isNaN(y)) map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ key: String(year), label: String(year), count }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityChart({ initialData, githubUser }: Props) {
  const [range, setRange]     = useState<Range>('30d');
  const [bars, setBars]       = useState<Bar[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  // Cache commits for the session — fetch once, derive all ranges from it
  const commitsCache = useRef<Commit[] | null>(null);

  const maxCount = Math.max(...bars.map((b) => b.count), 1);
  const total    = bars.reduce((s, b) => s + b.count, 0);
  const unit     = range === '30d' ? 'events' : 'commits';

  const loadRange = useCallback(
    async (r: Range) => {
      if (r === '30d') { setBars(initialData); return; }

      setLoading(true);
      try {
        if (!commitsCache.current) {
          const repos      = await getOwnRepos(githubUser);
          const oldestYear = repos.reduce(
            (min, repo) => Math.min(min, repo.createdYear),
            new Date().getFullYear(),
          );
          commitsCache.current = await getAllCommits(
            githubUser,
            repos,
            `${oldestYear}-01-01T00:00:00Z`,
          );
        }

        const commits = commitsCache.current;
        if (r === '6m')      setBars(buildWeekBars(commits, 26));
        else if (r === '1y') setBars(buildWeekBars(commits, 52));
        else                 setBars(buildYearBars(commits));
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
    setTooltip({ bar, x: bRect.left - cRect.left + bRect.width / 2, y: bRect.top - cRect.top });
  }

  return (
    <div className="flex flex-col">
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
      <div ref={containerRef} className="relative">
        <div className="flex items-end gap-px" style={{ height: '160px' }}>
          {bars.map((bar, i) => {
            const px = bar.count > 0
              ? Math.max((bar.count / maxCount) * 148, 6)
              : 4;
            return (
              <div
                key={`${bar.key}-${i}`}
                className={`flex-1 rounded-sm transition-all cursor-default ${
                  bar.count > 0
                    ? 'bg-indigo-500/60 hover:bg-indigo-400/90'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                style={{ height: `${px}px` }}
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
            style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-2xl text-xs font-mono whitespace-nowrap">
              <p className="text-gray-400">{tooltip.bar.label}</p>
              <p className="text-white font-bold mt-0.5">
                {tooltip.bar.count === 0
                  ? 'No activity'
                  : `${tooltip.bar.count} ${unit}`}
              </p>
            </div>
            <div className="mx-auto" style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
              borderTop: '5px solid #374151',
            }} />
          </div>
        )}

        {/* Bottom labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600 font-mono">
          <span>{bars.at(0)?.label ?? ''}</span>
          <span>{total} {unit}</span>
          <span>{bars.at(-1)?.label ?? ''}</span>
        </div>
      </div>
    </div>
  );
}
