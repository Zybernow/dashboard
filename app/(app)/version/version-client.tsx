"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/fetcher"
import type { FeatureFlags, VersionConfig } from "@/lib/zyber-types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  communityChatPushEnabled: "Community chat push notifications",
}

const DEFAULT_FLAGS: FeatureFlags = {
  chatEditEnabled: true,
  chatDeleteEnabled: true,
  chatReplyEnabled: true,
  chatReactionsEnabled: false,
  callRecordsEnabled: true,
  accountDeletionEnabled: true,
  communityChatPushEnabled: false,
}

// The four version-gate text fields edited behind the "Save changes" button.
type GateFields = Pick<
  VersionConfig,
  | "latest_version"
  | "min_supported_version"
  | "ios_update_url"
  | "android_update_url"
>

function gateFromConfig(config: VersionConfig): GateFields {
  return {
    latest_version: config.latest_version,
    min_supported_version: config.min_supported_version,
    ios_update_url: config.ios_update_url,
    android_update_url: config.android_update_url,
  }
}

export function VersionClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "version"],
    queryFn: () => apiFetch<VersionConfig>("/api/zyber/version"),
  })

  // Local edits for the version-gate inputs only. Toggles persist immediately
  // and read straight from `data`, so they don't live here.
  const [gate, setGate] = useState<GateFields | null>(null)
  // Initialize once from the first loaded config. Setting state during render
  // (React's recommended pattern over an effect) means a refetch after a toggle
  // auto-save never wipes in-progress gate edits.
  if (data && !gate) setGate(gateFromConfig(data))

  // Persists the version-gate inputs on top of the current server toggle state.
  const saveGate = useMutation({
    mutationFn: (next: VersionConfig) =>
      apiFetch<VersionConfig>("/api/zyber/version", {
        method: "PUT",
        body: JSON.stringify(next),
      }),
    onSuccess: (next) => {
      toast.success("Version gate saved")
      setGate(gateFromConfig(next))
      qc.invalidateQueries({ queryKey: ["zyber", "version"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Auto-saves a single toggle. Sends the full config built from the last-saved
  // server values plus the changed field, so unsaved gate edits are never
  // persisted by a toggle. Optimistic so the switch flips instantly.
  const saveToggle = useMutation({
    mutationFn: (next: VersionConfig) =>
      apiFetch<VersionConfig>("/api/zyber/version", {
        method: "PUT",
        body: JSON.stringify(next),
      }),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["zyber", "version"] })
      const prev = qc.getQueryData<VersionConfig>(["zyber", "version"])
      qc.setQueryData(["zyber", "version"], next)
      return { prev }
    },
    onError: (err: Error, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(["zyber", "version"], ctx.prev)
      toast.error(err.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["zyber", "version"] }),
  })

  if (isLoading || !data || !gate) {
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
                value={gate.latest_version}
                onChange={(e) =>
                  setGate({ ...gate, latest_version: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Min supported version</Label>
              <Input
                value={gate.min_supported_version}
                onChange={(e) =>
                  setGate({ ...gate, min_supported_version: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>iOS update URL</Label>
              <Input
                value={gate.ios_update_url}
                onChange={(e) =>
                  setGate({ ...gate, ios_update_url: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Android update URL</Label>
              <Input
                value={gate.android_update_url}
                onChange={(e) =>
                  setGate({ ...gate, android_update_url: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="ghost"
            disabled={saveGate.isPending}
            onClick={() => setGate(gateFromConfig(data))}
          >
            Reset
          </Button>
          <Button
            disabled={saveGate.isPending}
            onClick={() => saveGate.mutate({ ...data, ...gate })}
          >
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Toggles</CardTitle>
          <CardDescription>
            Server-wide modes affecting all users. Changes save instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Force update"
            description="Older builds are blocked from logging in."
            value={data.force_update}
            disabled={saveToggle.isPending}
            onChange={(v) => saveToggle.mutate({ ...data, force_update: v })}
          />
          <ToggleRow
            label="Maintenance mode"
            description="All non-admin requests are rejected."
            value={data.maintenance_mode}
            disabled={saveToggle.isPending}
            onChange={(v) => saveToggle.mutate({ ...data, maintenance_mode: v })}
          />
          <ToggleRow
            label="Work email signup open"
            description="Allow new accounts to skip work-email review."
            value={data.workEmailOpen}
            disabled={saveToggle.isPending}
            onChange={(v) => saveToggle.mutate({ ...data, workEmailOpen: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>
            Enable or disable client-side features. Changes save instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(FLAG_LABELS) as Array<keyof FeatureFlags>).map((key) => (
            <ToggleRow
              key={key}
              label={FLAG_LABELS[key]}
              value={data.featureFlags?.[key] ?? DEFAULT_FLAGS[key]}
              disabled={saveToggle.isPending}
              onChange={(v) =>
                saveToggle.mutate({
                  ...data,
                  featureFlags: {
                    ...DEFAULT_FLAGS,
                    ...data.featureFlags,
                    [key]: v,
                  },
                })
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  disabled?: boolean
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
      <Switch
        checked={value}
        disabled={disabled}
        onCheckedChange={(v) => onChange(!!v)}
      />
    </div>
  )
}
