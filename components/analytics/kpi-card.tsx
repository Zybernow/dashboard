"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface AnalyticsKPICardProps {
  label: string
  value: string
  subValue?: string
  accent?: boolean
  isLoading?: boolean
  icon?: React.ReactNode
  live?: boolean
}

export function AnalyticsKPICard({
  label,
  value,
  subValue,
  accent = false,
  isLoading = false,
  icon,
  live = false,
}: AnalyticsKPICardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-5 flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 flex flex-col gap-2",
        accent && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.1)]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        {live && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            LIVE
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  )
}
