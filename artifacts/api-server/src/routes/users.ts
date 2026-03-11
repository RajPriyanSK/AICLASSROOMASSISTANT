import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { SyncUserBody, SyncUserResponse, GetMeQueryParams, GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users/sync", async (req, res): Promise<void> => {
  const parsed = SyncUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { firebaseUid, email, displayName, role } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid));

  if (existing.length > 0) {
    const [updated] = await db
      .update(usersTable)
      .set({ email, displayName: displayName ?? null })
      .where(eq(usersTable.firebaseUid, firebaseUid))
      .returning();
    res.json(SyncUserResponse.parse(updated));
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ firebaseUid, email, displayName: displayName ?? null, role })
    .returning();

  res.json(SyncUserResponse.parse(user));
});

router.get("/users/me", async (req, res): Promise<void> => {
  const params = GetMeQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, params.data.firebaseUid));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetMeResponse.parse(user));
});

export default router;
