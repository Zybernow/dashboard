import "server-only"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { eq } from "drizzle-orm"
import { dbProd } from "@/db/prod/drizzle"
import { maintainerColleges } from "@/db/prod/schema"

export type MaintainerSession = {
  username: string
  role: "maintainer"
  maintainerId: number
  colleges: string[]
}

export async function getMaintainerSession(): Promise<MaintainerSession | null> {
  const secret = process.env.JWT_SECRET_ADMIN
  if (!secret) return null

  const cookieStore = await cookies()
  const token = cookieStore.get("maintainer_token")?.value
  if (!token) return null

  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] })

    if (
      payload.role !== "maintainer" ||
      !payload.maintainer_id ||
      !payload.username
    ) {
      return null
    }

    const maintainerId = Number(payload.maintainer_id)
    const colleges = await getMaintainerColleges(maintainerId)

    return {
      username: String(payload.username),
      role: "maintainer",
      maintainerId,
      colleges,
    }
  } catch {
    return null
  }
}

export async function getMaintainerColleges(
  maintainerId: number,
): Promise<string[]> {
  const rows = await dbProd
    .select({ college: maintainerColleges.college })
    .from(maintainerColleges)
    .where(eq(maintainerColleges.maintainerId, maintainerId))
  return rows.map((r) => r.college)
}
