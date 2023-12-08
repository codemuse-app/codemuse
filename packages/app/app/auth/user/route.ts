import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Exposes a route that takes a refresh token and returns a new access token
// This is used by the VSCode extension to refresh the access token
// It uses the supabase-js client to refresh the token
export async function POST(request: Request) {
  const { token } = await request.json();

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("api_tokens")
    .select("*")
    .eq("id", token);

  if (error) {
    return new Response(error.message, { status: 401 });
  }

  return NextResponse.json({
    userId: data[0].user_id,
  });
}
