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
    return NextResponse.redirect("http://localhost:3000/login?redirect=http://localhost:3000/billing/checkout");
  }

 const session = await stripe.checkout.sessions.create({
    mode:"subscription",
    payment_method_types:["card"],
    line_items: [{price:"price_1OMYihAPXUWu7ydfBdS3nblF", quantity:1}],
    success_url:"http://localhost:3000/billing/success",
    cancel_url:"http://localhost:4321/pricing",
    //customer_email: user.data.user.email, // Replace with the customer's email address
    subscription_data:{
      metadata:{
        user_id:user.data.user.id

      }
    }
  })
  
  return NextResponse.redirect(session.url!);


  //return NextResponse.redirect("http://localhost:4321");
}
