import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe"; 
import getRawBody from "raw-body";
import { get } from "http";
import { sign } from "crypto";

export const config = {
    api:{
        bodyParser:false,
    }
}
export async function POST(request: Request, res:Response) {
  // The `/auth/callback` route is required for the server-side auth flow implemented. It may have a redirect get parameter. If that is the case, then redirect to /login?redirect=...
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  
  console.log("Received !")
  console.log(request.headers)
  const signature = request.headers.get("stripe-signature")
  console.log(signature)
  const signingSecret = process.env.STRIPE_SIGNING_KEY;
  console.log(signingSecret)

  if(!signature || !signingSecret){
    return NextResponse.json({
        message: "Missing keys"
      }, {
        status: 400,
      })  
  }

  
  const rawRequestBody = await request.json();
  console.log(rawRequestBody)
  let event;

  try{
    event = stripe.webhooks.constructEvent(JSON.stringify(rawRequestBody), signature, signingSecret)
  }catch (error){
    console.log("error")
    console.log(error)
    return NextResponse.json({
        message: "ERROR"
      }, {
        status: 400,
      })   
  }

  console.log(event)
  
  return NextResponse.json({
            message: "ok"
        }, {
            status: 200,
        })  ;


}
