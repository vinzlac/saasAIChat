import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  description: z.string().max(500).optional(),
  hobbies: z.array(z.string()).max(10).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      user_id: profile.userId,
      email: user.email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      description: profile.description,
      profile_picture_url: profile.profilePictureUrl,
      hobbies: profile.hobbies ?? [],
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description;
    }
    if (parsed.data.hobbies !== undefined) {
      updates.hobbies = parsed.data.hobbies;
    }

    const [updated] = await db
      .update(profiles)
      .set(updates as typeof profiles.$inferInsert)
      .where(eq(profiles.userId, user.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      user_id: updated.userId,
      first_name: updated.firstName,
      last_name: updated.lastName,
      description: updated.description,
      profile_picture_url: updated.profilePictureUrl,
      hobbies: updated.hobbies ?? [],
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
