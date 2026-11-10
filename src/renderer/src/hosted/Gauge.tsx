interface GaugeProps {
  value: number
  max: number
  unit: string
  phase: string
  running: boolean
}

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = 96
const START = -120
const SWEEP = 240

function point(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180
  return {
    x: CENTER + Math.sin(radians) * radius,
    y: CENTER - Math.cos(radians) * radius
  }
}

function arcPath(from: number, to: number, radius: number): string {
  const start = point(from, radius)
  const end = point(to, radius)
  const largeArc = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function scaleLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return String(Math.round(value))
}

export function Gauge({ value, max, unit, phase, running }: GaugeProps): React.JSX.Element {
  const ratio = Math.min(1, Math.max(0, value / max))
  const eased = Math.sqrt(ratio)
  const angle = START + SWEEP * eased
  const percent = Math.max(0, Math.min(100, eased * 100))

  const ticks = Array.from({ length: 25 }, (_, index) => {
    const tickAngle = START + (SWEEP / 24) * index
    const major = index % 6 === 0
    return {
      outer: point(tickAngle, RADIUS - 14),
      inner: point(tickAngle, RADIUS - (major ? 24 : 19)),
      major
    }
  })

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
        <defs>
          <linearGradient id="dial-fill" x1="15%" y1="100%" x2="85%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="55%" stopColor="var(--accent-strong)" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="dial-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={RADIUS + 12} fill="var(--panel-2)" opacity={0.35} />

        <path
          d={arcPath(START, START + SWEEP, RADIUS)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={12}
          strokeLinecap="round"
        />

        <path
          d={arcPath(START, START + SWEEP, RADIUS)}
          fill="none"
          stroke="url(#dial-fill)"
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
          filter="url(#dial-glow)"
          style={{ transition: 'stroke-dasharray 150ms linear' }}
        />

        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.major ? 'var(--muted)' : 'var(--line)'}
            strokeWidth={tick.major ? 2.5 : 1.5}
            strokeLinecap="round"
            opacity={tick.major ? 0.8 : 0.55}
          />
        ))}

        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transition: 'transform 150ms linear'
          }}
        >
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - RADIUS + 26}
            stroke="var(--fg)"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        </g>
        <circle cx={CENTER} cy={CENTER} r={6} fill="var(--fg)" />
        <circle cx={CENTER} cy={CENTER} r={12} fill="none" stroke="var(--line)" strokeWidth={2} />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">{phase}</p>
        <p className="mt-1.5 text-[52px] font-semibold leading-none tracking-tight tabular-nums">
          {value > 0 ? value.toFixed(value >= 100 ? 0 : 1) : '0'}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted">{unit}</p>
        {running && (
          <span className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            live
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[16%] top-[78%] text-[10px] font-medium text-muted">0</span>
        <span className="absolute left-1/2 top-[6%] -translate-x-1/2 text-[10px] font-medium text-muted">
          {scaleLabel(max / 2)}
        </span>
        <span className="absolute right-[16%] top-[78%] text-[10px] font-medium text-muted">
          {scaleLabel(max)}
        </span>
      </div>
    </div>
  )
}
