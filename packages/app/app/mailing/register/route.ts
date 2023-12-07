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

  // Respond with an empty HTML page containing "Redirecting..." and a meta http-equiv="refresh" tag that redirects back to https://www.codemuse.app
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="15; url=https://www.codemuse.app/" />
      </head>
      <body>
        You have been successfully subscribed. Redirecting...
      </body>
    </html>`;
}
