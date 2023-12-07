import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Exposes a route that takes a refresh token and returns a new access token
// This is used by the VSCode extension to refresh the access token
// It uses the supabase-js client to refresh the token
export async function POST(request: Request) {
  const { refresh_token } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  console.log("Here");

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (error) {
    return new Response(error.message, { status: 401 });
  }

  return NextResponse.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: {
      email: data.user?.email,
    },
  });
}
