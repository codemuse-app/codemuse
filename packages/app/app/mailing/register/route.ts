import * as mailchimp from "@mailchimp/mailchimp_marketing";
import { createHash } from "crypto";

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX,
});

export async function POST(request: Request) {
  // Receives a post request with a form data containing both email and redirect fields.
  const data = await request.formData();

  const mailHash = createHash("md5")
    .update((data.get("email") as string).toLowerCase())
    .digest("hex");

  try {
    mailchimp.lists.setListMember(
      process.env.MAILCHIMP_LIST_ID as string,
      mailHash,
      {
        email_address: (data.get("email") as string).toLocaleLowerCase(),
        status: "pending",
        status_if_new: "subscribed",
      }
    );
  } catch (e) {
    console.error(e);

    mailchimp.lists.addListMember(process.env.MAILCHIMP_LIST_ID as string, {
      email_address: (data.get("email") as string).toLocaleLowerCase(),
      status: "subscribed",
    });
  }

  return new Response(
    `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="3; url=https://www.codemuse.app/" />
  </head>
  <body>
    You have been successfully subscribed. Redirecting...
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    }
  );
}
