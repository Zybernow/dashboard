"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

export const TelemetryDashboard = dynamic(
  () =>
    import("./telemetry-dashboard").then((m) => ({
      default: m.TelemetryDashboard,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
  },
)
