"use client"

import React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface GrowthDataPoint {
  date: string
  value: number
}

interface GrowthTrendChartProps {
  data: GrowthDataPoint[]
  valueLabel?: string
}

function CustomTooltip({ active, payload, label, valueLabel }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-xl text-[12px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        {valueLabel}:{" "}
        <span className="text-primary font-medium">
          {payload[0]?.value?.toLocaleString()}
        </span>
      </p>
    </div>
  )
}

export function GrowthTrendChart({
  data,
  valueLabel = "Value",
}: GrowthTrendChartProps) {
  const uid = React.useId().replace(/:/g, "")
  const gradientId = `areaGradient-${uid}`

  const tickFormatter = (val: string, idx: number) =>
    idx % 5 === 0 ? val : ""

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} className="opacity-30" />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, stroke: "hsl(var(--background))", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
