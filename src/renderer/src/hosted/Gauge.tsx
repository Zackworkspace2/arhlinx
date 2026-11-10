interface GaugeProps {
  value: number
  max: number
  unit: string
  phase: string
  running: boolean
}

const SIZE = 220
const CENTER = SIZE / 2
const RADIUS = 86
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

export function Gauge({ value, max, unit, phase, running }: GaugeProps): React.JSX.Element {
  const ratio = Math.min(1, Math.max(0, value / max))
  const eased = Math.sqrt(ratio)
  const angle = START + SWEEP * eased
  const percent = Math.max(0, Math.min(100, eased * 100))

  const ticks = Array.from({ length: 21 }, (_, index) => {
    const tickAngle = START + (SWEEP / 20) * index
    const outer = point(tickAngle, RADIUS - 12)
    const inner = point(tickAngle, RADIUS - 18)
    return { outer, inner, major: index % 5 === 0 }
  })

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="gauge-fill" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={arcPath(START, START + SWEEP, RADIUS)}
          fill="none"
          stroke="var(--panel-2)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        <path
          d={arcPath(START, START + SWEEP, RADIUS)}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
          filter="url(#gauge-glow)"
          style={{ transition: 'stroke-dasharray 160ms linear' }}
        />

        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.major ? 'var(--muted)' : 'var(--line)'}
            strokeWidth={tick.major ? 2 : 1}
            strokeLinecap="round"
          />
        ))}

        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transition: 'transform 160ms linear'
          }}
        >
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - RADIUS + 22}
            stroke="var(--fg)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>

        <circle cx={CENTER} cy={CENTER} r={5} fill="var(--fg)" />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{phase}</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums leading-none">
          {value > 0 ? value.toFixed(value >= 100 ? 0 : 1) : '—'}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted">{unit}</p>
        {running && (
          <span className="mt-2 size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
