import { NextResponse } from "next/server";
import * as mailchimp from "@mailchimp/mailchimp_marketing";

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX,
});

export async function POST(request: Request) {
  // Receives a post request with a form data containing both email and redirect fields.
  const data = await request.formData();

  try {
    mailchimp.lists.addListMember(process.env.MAILCHIMP_LIST_ID as string, {
      email_address: data.get("email") as string,
      status: "subscribed",
    });
  } catch (error) {
    console.error(error);
  }

  // Redirect to https://codemuse.app
  // with a GET request
  return NextResponse.redirect("https://www.codemuse.app", {
    status: 303,
  });
}
