import { headers, cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe" 

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented. It may have a redirect get parameter. If that is the case, then redirect to /login?redirect=...
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  console.log("SUCCESS");
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    return NextResponse.redirect("http://localhost:4321/");
  }

  //mark the user as a pro now
  
  return NextResponse.redirect("http://localhost:4321");


  //return NextResponse.redirect("http://localhost:4321/");
}
