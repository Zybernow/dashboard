import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface AnalyticsSectionCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  noPadding?: boolean
}

export function AnalyticsSectionCard({
  title,
  subtitle,
  children,
  className,
  action,
  noPadding = false,
}: AnalyticsSectionCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-[13px] font-semibold">{title}</CardTitle>
          {subtitle && (
            <CardDescription className="text-[11px] mt-0.5">{subtitle}</CardDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className={noPadding ? "p-0" : undefined}>
        {children}
      </CardContent>
    </Card>
  )
}
