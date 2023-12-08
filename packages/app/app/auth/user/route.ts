import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Exposes a route that takes a refresh token and returns a new access token
// This is used by the VSCode extension to refresh the access token
// It uses the supabase-js client to refresh the token
export async function POST(request: Request) {
  const { token } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PRIVATE_SUPABASE_KEY!
  );

  const { data, error } = await supabase
    .from("api_tokens")
    .select("*")
    .eq("id", token)
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 401,
      }
    );
  }

  return NextResponse.json({
    userId: data.user_id,
  });
}
