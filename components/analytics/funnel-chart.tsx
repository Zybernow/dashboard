"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { formatPercent } from "@/lib/analytics-utils"

interface FunnelStage {
  label: string
  value: number
  rate: number
}

interface FunnelChartProps {
  stages: FunnelStage[]
}

const COLORS = ["#7C6FF7", "#6B63E0", "#5A56C8", "#4A49B0"]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: FunnelStage }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-xl text-[12px]">
      <p className="font-semibold text-foreground mb-1">{d.label}</p>
      <p className="text-muted-foreground">
        Users:{" "}
        <span className="text-foreground font-medium">{d.value.toLocaleString()}</span>
      </p>
      {d.rate < 1 && (
        <p className="text-muted-foreground mt-0.5">
          Conversion:{" "}
          <span className="text-primary font-medium">{formatPercent(d.rate)}</span>
        </p>
      )}
    </div>
  )
}

interface LabelProps {
  x?: number
  y?: number
  width?: number
  value?: number
  index?: number
  stages: FunnelStage[]
}

function CustomLabel({ x = 0, y = 0, width = 0, value, index = 0, stages }: LabelProps) {
  const stage = stages[index]
  return (
    <g>
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize={11}
        fontWeight={600}
      >
        {value?.toLocaleString()}
      </text>
      {stage?.rate < 1 && (
        <text
          x={x + width / 2}
          y={y - 22}
          textAnchor="middle"
          fill={
            stage.rate >= 0.7
              ? "#34D399"
              : stage.rate >= 0.4
              ? "#FBBF24"
              : "#F87171"
          }
          fontSize={10}
          fontWeight={600}
        >
          {formatPercent(stage.rate)}
        </text>
      )}
    </g>
  )
}

export function FunnelChart({ stages }: FunnelChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={stages}
        margin={{ top: 32, right: 4, left: -20, bottom: 0 }}
        barSize={48}
      >
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          label={<CustomLabel stages={stages} />}
        >
          {stages.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
