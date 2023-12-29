import { createClient } from "@/utils/supabase/client";
import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe"; 

export const config = {
    api:{
        bodyParser:false,
    }
}


export async function updateSubscription(event:any){

  const supabase = createClient();

  const subscription = event.data.object;
  const stripe_customer_id = subscription.customer;
  const subscription_status = subscription.status;
  const price = subscription.items.data[0].price.id;

  const {data:profile} = await supabase.from("plan").select("*").eq("stripe_customer_id",stripe_customer_id).single();

  if(profile){ // case where a user already has a plan associated with him

    const updatedSubscription = {
      subscription_status, 
      price
    }
    await supabase.from("plan").update(updatedSubscription).eq("stripe_customer_id",stripe_customer_id);

  }else{

    let customer;
    try { // case where a user does not have a plan associated with him
      customer = await stripe.customers.retrieve(stripe_customer_id); // get customer email from stripe
      if (!('deleted' in customer)){

        const customer_email = customer.email;

        if (customer_email){
          const customer_plan ={
            email:customer_email,
            stripe_customer_id:stripe_customer_id,
            subscription_status:subscription_status,
            price:price, 
            user_id:subscription.metadata.user_id

          }
          const { data, error } = await supabase // create plan
          .from('plan')
          .insert([
            customer_plan
          ]);

          if(error){
            throw Error(error.message);

          }
    
        }

      }
    } catch (error) {
      throw Error("Error retrieving customer from Stripe");
    }
    
  }

}

export async function deleteSubscription(event:any){

  const supabase = createClient();

  const subscription = event.data.object;
  const stripe_customer_id = subscription.customer;
  const subscription_status = subscription.status;
  const price = subscription.items.data[0].price.id;

  const {data:profile} = await supabase.from("plan").select("*").eq("stripe_customer_id",stripe_customer_id).single();

  if(profile){
    console.log("profile")
    const updatedSubscription = {
      subscription_status, 
      price
    }
    await supabase.from("plan").update(updatedSubscription).eq("stripe_customer_id",stripe_customer_id);

    return NextResponse.json({
      status: 200,
    }) 
  }
  else {
    return NextResponse.json({
      message: "Missing plan"
    }, {
      status: 400,
    }) 
  }
}

export async function POST(request: Request, res:Response) {
  // The `/auth/callback` route is required for the server-side auth flow implemented. It may have a redirect get parameter. If that is the case, then redirect to /login?redirect=...
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  
  const signature = request.headers.get("stripe-signature")
  const signingSecret = process.env.STRIPE_SIGNING_KEY;

  if(!signature || !signingSecret){
    return NextResponse.json({
        message: "Missing keys"
      }, {
        status: 400,
      })  
  }

  
  // const rawRequestBody = await request.json();
  // console.log(JSON.stringify(rawRequestBody))
  let event;

  try{

  if (!request.body) {
    throw new Error("Request body is null");
  }
  const reader = request.body.getReader();
    let rawRequestBody = '';
    let done, value;

    while (({done, value} = await reader.read()) && !done) {
      rawRequestBody += new TextDecoder().decode(value);
    }

    event = stripe.webhooks.constructEvent(rawRequestBody, signature, signingSecret)

    switch (event.type){
      case "customer.subscription.updated":
        await updateSubscription(event);
        break;
      case "customer.subscription.deleted":
        await deleteSubscription(event);
        break;
    }

  }catch (error){
    console.log("error")
    console.log(error)
    return NextResponse.json({
        message: "ERROR"
      }, {
        status: 400,
      })   
  }

  return NextResponse.json({
            message: "ok"
        }, {
            status: 200,
        })  ;


}
