import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const resendSchema = z.object({
  email: z.string().email("Email invalide"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Si cet email existe, un lien de confirmation a été envoyé." },
        { status: 200 }
      );
    }

    const { email } = parsed.data;
    const supabase = await createClient();

    await supabase.auth.resend({
      type: "signup",
      email,
    });

    return NextResponse.json({
      message: "Si cet email existe, un lien de confirmation a été envoyé.",
    });
  } catch (error) {
    return NextResponse.json({
      message: "Si cet email existe, un lien de confirmation a été envoyé.",
    });
  }
}
