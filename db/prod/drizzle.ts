import { drizzle } from "drizzle-orm/postgres-js"
import { client } from "../drizzle"
import * as schema from "./schema"

export const dbProd = drizzle({ client, schema })
