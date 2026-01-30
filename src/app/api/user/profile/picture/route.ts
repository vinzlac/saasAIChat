import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadProfilePicture, deleteProfilePicture } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const url = await uploadProfilePicture(
      user.id,
      buffer,
      file.type
    );

    await db
      .update(profiles)
      .set({
        profilePictureUrl: url,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    return NextResponse.json({ profile_picture_url: url });
  } catch (error) {
    console.error("Picture upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'upload" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await deleteProfilePicture(user.id);

    await db
      .update(profiles)
      .set({
        profilePictureUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Picture delete error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
