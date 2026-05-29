"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { EditIcon, PlusIcon, TrashIcon } from "lucide-react"
import { apiFetch } from "@/lib/fetcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

type Announcement = {
  id: number
  title: string
  body: string
  image_url: string
  button_text: string
  button_action: string
  is_active: boolean
  start_at: string | null
  end_at: string | null
  price_inr: number
  created_at: string
  updated_at: string
}

type AnnouncementForm = {
  title: string
  body: string
  image_url: string
  button_text: string
  button_action: string
  is_active: boolean
  start_at: string
  end_at: string
  price_inr: string
}

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  body: "",
  image_url: "",
  button_text: "",
  button_action: "",
  is_active: true,
  start_at: "",
  end_at: "",
  price_inr: "0",
}

function formToPayload(f: AnnouncementForm) {
  return {
    title: f.title.trim(),
    body: f.body.trim(),
    image_url: f.image_url.trim(),
    button_text: f.button_text.trim(),
    button_action: f.button_action.trim(),
    is_active: f.is_active,
    start_at: f.start_at ? new Date(f.start_at).toISOString() : null,
    end_at: f.end_at ? new Date(f.end_at).toISOString() : null,
    price_inr: Number.parseInt(f.price_inr, 10) || 0,
  }
}

export function AnnouncementsClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["zyber", "announcements"],
    queryFn: () =>
      apiFetch<{ announcements: Announcement[] }>("/api/zyber/announcements"),
  })

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch<unknown>(`/api/zyber/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Announcement deleted")
      qc.invalidateQueries({ queryKey: ["zyber", "announcements"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>
            {data ? `${data.announcements.length} announcement${data.announcements.length === 1 ? "" : "s"}` : "Loading…"}
          </CardTitle>
          <CardDescription>
            In-app popups shown to users based on schedule and active status.
          </CardDescription>
        </div>
        <AnnouncementFormDialog mode="create" />
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Price (₹)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium">{a.title}</div>
                    {a.button_text ? (
                      <div className="text-xs text-muted-foreground">
                        Button: {a.button_text}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.start_at || a.end_at ? (
                      <span>
                        {a.start_at
                          ? new Date(a.start_at).toLocaleDateString()
                          : "∞"}{" "}
                        →{" "}
                        {a.end_at
                          ? new Date(a.end_at).toLocaleDateString()
                          : "∞"}
                      </span>
                    ) : (
                      "Always"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.price_inr === 0 ? "Free" : `₹${a.price_inr}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      <AnnouncementFormDialog mode="edit" announcement={a} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={remove.isPending}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove.mutate(a.id)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.announcements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No announcements yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function AnnouncementFormDialog({
  mode,
  announcement,
}: {
  mode: "create" | "edit"
  announcement?: Announcement
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AnnouncementForm>(() =>
    announcement
      ? {
          title: announcement.title,
          body: announcement.body,
          image_url: announcement.image_url,
          button_text: announcement.button_text,
          button_action: announcement.button_action,
          is_active: announcement.is_active,
          start_at: announcement.start_at
            ? new Date(announcement.start_at).toISOString().slice(0, 16)
            : "",
          end_at: announcement.end_at
            ? new Date(announcement.end_at).toISOString().slice(0, 16)
            : "",
          price_inr: String(announcement.price_inr),
        }
      : EMPTY_FORM,
  )

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof formToPayload>) =>
      mode === "create"
        ? apiFetch<Announcement>("/api/zyber/announcements", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : apiFetch<Announcement>(`/api/zyber/announcements/${announcement!.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          }),
    onSuccess: () => {
      toast.success(mode === "create" ? "Announcement created" : "Announcement updated")
      qc.invalidateQueries({ queryKey: ["zyber", "announcements"] })
      setOpen(false)
      if (mode === "create") setForm(EMPTY_FORM)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const set = (key: keyof AnnouncementForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button size="sm">
              <PlusIcon className="mr-1 size-4" />
              New
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm">
              <EditIcon className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New announcement" : "Edit announcement"}
          </DialogTitle>
          <DialogDescription>
            Announcements are shown as in-app popups to users.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={set("title")} placeholder="What's new" />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea
              rows={3}
              value={form.body}
              onChange={set("body")}
              placeholder="Description shown to the user…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Button text</Label>
              <Input value={form.button_text} onChange={set("button_text")} placeholder="Learn more" />
            </div>
            <div className="space-y-1">
              <Label>Button action</Label>
              <Input value={form.button_action} onChange={set("button_action")} placeholder="https://… or deep-link" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Image URL (optional)</Label>
            <Input value={form.image_url} onChange={set("image_url")} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start (optional)</Label>
              <Input type="datetime-local" value={form.start_at} onChange={set("start_at")} />
            </div>
            <div className="space-y-1">
              <Label>End (optional)</Label>
              <Input type="datetime-local" value={form.end_at} onChange={set("end_at")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Price (₹, 0 = free)</Label>
              <Input type="number" min="0" value={form.price_inr} onChange={set("price_inr")} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Active</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.title.trim() || save.isPending}
            onClick={() => save.mutate(formToPayload(form))}
          >
            {mode === "create" ? "Create" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
