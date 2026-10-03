import { useLayoutEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fromKey } from '@/lib/dates'
import { formatMoney, formatMoneyShort, niceTicks } from '@/lib/money'
import type { ExpenseSummary } from '@/lib/types'

const HEIGHT = 240
const PAD = { top: 12, right: 8, bottom: 26, left: 52 }
const BAR_MAX = 24

/** Ancho del contenedor (la gráfica se dibuja a su medida) */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Columna con la punta redondeada (4px) y la base recta */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/**
 * Dinero gastado por día: una columna por día sobre una sola línea base.
 * Al pasar el mouse (o con el teclado) cada día muestra su total; clic abre el día.
 */
export function SpendingChart({
  days,
  average,
  today,
  onOpenDay,
}: {
  days: ExpenseSummary['days']
  average: number
  today: string
  onOpenDay: (date: string) => void
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const max = Math.max(0, ...days.map((d) => d.total))
  const ticks = niceTicks(max)
  const top = ticks.at(-1) || 1
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const band = days.length ? innerW / days.length : 0
  const barW = Math.max(2, Math.min(BAR_MAX, band - 4))
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH
  // Etiquetas del eje x: todas si caben; si no, el 1 y cada 5 días
  const labelEvery = band >= 22 ? 1 : 5
  const showLabel = (i: number) => labelEvery === 1 || i === 0 || (i + 1) % labelEvery === 0

  const h = hover !== null ? days[hover] : null
  const tipX = hover !== null ? PAD.left + band * hover + band / 2 : 0

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Dinero gastado por día" className="overflow-visible">
          {/* Cuadrícula y eje y: recesivos */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text
                x={PAD.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[10.5px] tabular-nums"
              >
                {formatMoneyShort(t)}
              </text>
            </g>
          ))}

          {days.map((d, i) => {
            const x = PAD.left + band * i + (band - barW) / 2
            const barH = (d.total / top) * innerH
            return (
              <g key={d.date}>
                {d.total > 0 && (
                  <path
                    d={columnPath(x, y(d.total), barW, barH)}
                    fill="var(--chart-spend)"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    className="transition-opacity"
                  />
                )}
                {showLabel(i) && (
                  <text
                    x={PAD.left + band * i + band / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className={
                      d.date === today
                        ? 'fill-foreground text-[10.5px] font-semibold'
                        : 'fill-muted-foreground text-[10.5px]'
                    }
                  >
                    {Number(d.date.slice(8))}
                  </text>
                )}
              </g>
            )
          })}

          {/* Promedio diario: línea de referencia con su etiqueta */}
          {average > 0 && (
            <g>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(average)}
                y2={y(average)}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                opacity={0.7}
              />
              <text
                x={width - PAD.right}
                y={y(average) - 5}
                textAnchor="end"
                className="fill-muted-foreground text-[10.5px]"
              >
                Promedio {formatMoney(average)}
              </text>
            </g>
          )}

          {/* Zonas para el mouse y el teclado: toda la columna del día, más grande que la barra */}
          {days.map((d, i) => (
            <rect
              key={d.date}
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${format(fromKey(d.date), "EEEE d 'de' LLLL", { locale: es })}: ${formatMoney(d.total)}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onOpenDay(d.date)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenDay(d.date)
                }
              }}
            />
          ))}
        </svg>
      )}

      {h && (
        <div
          className="pointer-events-none absolute z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-lg border bg-popover px-3 py-2 text-xs whitespace-nowrap shadow-md"
          style={{
            // Sin tapar el eje y ni salirse por la derecha
            left: Math.min(Math.max(tipX, PAD.left + 72), width - 72),
            top: Math.max(0, y(h.total) - 64),
          }}
        >
          <span className="text-muted-foreground">
            {format(fromKey(h.date), "EEE d 'de' LLLL", { locale: es }).replace('.', '')}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
            <span className="size-2 rounded-[2px] bg-chart-spend" aria-hidden />
            {formatMoney(h.total)}
          </span>
          <span className="text-muted-foreground">
            {h.count === 0 ? 'Sin gastos' : `${h.count} ${h.count === 1 ? 'gasto' : 'gastos'}`}
          </span>
        </div>
      )}
    </div>
  )
}
