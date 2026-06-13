"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/fetcher"
import type { FeatureFlags, VersionConfig } from "@/lib/zyber-types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

const FLAG_LABELS: Record<keyof FeatureFlags, string> = {
  chatEditEnabled: "Edit chat messages",
  chatDeleteEnabled: "Delete chat messages",
  chatReplyEnabled: "Reply to chat messages",
  chatReactionsEnabled: "React to chat messages",
  callRecordsEnabled: "Call records",
  accountDeletionEnabled: "Account deletion",
}

const DEFAULT_FLAGS: FeatureFlags = {
  chatEditEnabled: true,
  chatDeleteEnabled: true,
  chatReplyEnabled: true,
  chatReactionsEnabled: false,
  callRecordsEnabled: true,
  accountDeletionEnabled: true,
}

export function VersionClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "version"],
    queryFn: () => apiFetch<VersionConfig>("/api/zyber/version"),
  })

  const [form, setForm] = useState<VersionConfig | null>(null)
  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const save = useMutation({
    mutationFn: (next: VersionConfig) =>
      apiFetch<VersionConfig>("/api/zyber/version", {
        method: "PUT",
        body: JSON.stringify(next),
      }),
    onSuccess: (next) => {
      toast.success("Version config saved")
      setForm(next)
      qc.invalidateQueries({ queryKey: ["zyber", "version"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading || !form) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Version gate</CardTitle>
          <CardDescription>
            Latest available and minimum supported app versions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Latest version</Label>
              <Input
                value={form.latest_version}
                onChange={(e) =>
                  setForm({ ...form, latest_version: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Min supported version</Label>
              <Input
                value={form.min_supported_version}
                onChange={(e) =>
                  setForm({ ...form, min_supported_version: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>iOS update URL</Label>
              <Input
                value={form.ios_update_url}
                onChange={(e) =>
                  setForm({ ...form, ios_update_url: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Android update URL</Label>
              <Input
                value={form.android_update_url}
                onChange={(e) =>
                  setForm({ ...form, android_update_url: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Toggles</CardTitle>
          <CardDescription>
            Server-wide modes affecting all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Force update"
            description="Older builds are blocked from logging in."
            value={form.force_update}
            onChange={(v) => setForm({ ...form, force_update: v })}
          />
          <ToggleRow
            label="Maintenance mode"
            description="All non-admin requests are rejected."
            value={form.maintenance_mode}
            onChange={(v) => setForm({ ...form, maintenance_mode: v })}
          />
          <ToggleRow
            label="Work email signup open"
            description="Allow new accounts to skip work-email review."
            value={form.workEmailOpen}
            onChange={(v) => setForm({ ...form, workEmailOpen: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>
            Enable or disable client-side features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(FLAG_LABELS) as Array<keyof FeatureFlags>).map((key) => (
            <ToggleRow
              key={key}
              label={FLAG_LABELS[key]}
              value={form.featureFlags?.[key] ?? DEFAULT_FLAGS[key]}
              onChange={(v) =>
                setForm({
                  ...form,
                  featureFlags: {
                    ...DEFAULT_FLAGS,
                    ...form.featureFlags,
                    [key]: v,
                  },
                })
              }
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          disabled={save.isPending}
          onClick={() => data && setForm(data)}
        >
          Reset
        </Button>
        <Button
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <Switch checked={value} onCheckedChange={(v) => onChange(!!v)} />
    </div>
  )
}
