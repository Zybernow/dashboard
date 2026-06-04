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

interface MessageBucket {
  bucket: string
  count: number
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-xl text-[12px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Matches:{" "}
        <span className="text-foreground font-medium">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

export function MessageDistributionChart({ data }: { data: MessageBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barSize={36}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
