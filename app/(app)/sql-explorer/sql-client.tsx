"use client"

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useMutation } from "@tanstack/react-query"
import { AlertCircleIcon, DatabaseIcon, PlayIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { apiFetch } from "@/lib/fetcher"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

// ── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

type QueryResult = {
  columns: string[]
  rows: Row[]
  rowCount: number
  duration_ms: number
  capped: boolean
}

// ── Build TanStack column definitions from a list of column names ─────────────

const colHelper = createColumnHelper<Row>()

function buildColumns(columns: string[]): ColumnDef<Row>[] {
  return columns.map((col) =>
    colHelper.accessor((row) => row[col], {
      id: col,
      header: col,
      cell: (info) => {
        const v = info.getValue()
        if (v === null || v === undefined) {
          return <span className="text-muted-foreground italic">null</span>
        }
        if (typeof v === "object") {
          return (
            <span className="font-mono text-xs">{JSON.stringify(v)}</span>
          )
        }
        return <span className="font-mono text-xs">{String(v)}</span>
      },
    }),
  )
}

// ── Results table ─────────────────────────────────────────────────────────────

function ResultsTable({ result }: { result: QueryResult }) {
  const columns = useMemo(
    () => buildColumns(result.columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.columns.join(",")],
  )

  const table = useReactTable<Row>({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">Results</CardTitle>
          <Badge variant="outline">
            {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">{result.duration_ms} ms</Badge>
          {result.capped && (
            <Badge variant="secondary">Showing first 500 rows</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {result.columns.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Query returned no rows.
          </p>
        ) : (
          <div className="overflow-auto">
            <DataTable table={table} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SqlExplorerClient() {
  const [sql, setSql] = useState("SELECT * FROM users LIMIT 10;")
  const [result, setResult] = useState<QueryResult | null>(null)

  const mutation = useMutation({
    mutationFn: (query: string) =>
      apiFetch<QueryResult>("/api/zyber/sql-explorer", {
        method: "POST",
        body: JSON.stringify({ sql: query }),
      }),
    onSuccess: (data) => setResult(data),
  })

  const handleRun = () => {
    if (sql.trim()) mutation.mutate(sql)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter / Cmd+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleRun()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Editor card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-5" />
            SQL Explorer
          </CardTitle>
          <CardDescription>
            Run read-only queries against the production database. Only{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              SELECT
            </code>{" "}
            statements are permitted — every query runs inside a{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              READ ONLY
            </code>{" "}
            transaction enforced at the database level.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SELECT ..."
            rows={7}
            spellCheck={false}
            className="font-mono text-sm resize-y"
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleRun}
              disabled={mutation.isPending || !sql.trim()}
            >
              {mutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <PlayIcon className="size-4" />
              )}
              Run query
            </Button>

            <span className="text-muted-foreground text-xs">
              Ctrl+Enter to run
            </span>

            <Badge variant="secondary" className="ml-auto">
              Max 500 rows · 10 s timeout
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Query error</AlertTitle>
          <AlertDescription className="font-mono text-xs break-all">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && !mutation.isError && (
        <ResultsTable result={result} />
      )}
    </div>
  )
}
