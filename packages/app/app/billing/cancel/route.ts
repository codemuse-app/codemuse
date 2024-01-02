import { headers, cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
//import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe" 

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented. It may have a redirect get parameter. If that is the case, then redirect to /login?redirect=...
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  // const supabase = createClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // );
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  //const currentSession = await supabase.auth.getSession()
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    return NextResponse.json({
        message: "You must be authenticated to cancel your plan."
      }, {
        status: 400,
      }) ;
  }
  
  const {data:profile} = await supabase.from("plan").select("*").eq("user_id",user.data.user.id).single();

  console.log(profile);
  //const stripe_customer_id = profile.stripe_customer_id;

  const subscriptions = await stripe.subscriptions.search({
    query: "status:\'active\' AND metadata[\'user_id\']:\'"+profile.user_id+"\'",
  });

  const subscription_id = subscriptions.data[0].id

  const subscription = await stripe.subscriptions.cancel(subscription_id);


  return NextResponse.redirect("http://localhost:4321");


}
