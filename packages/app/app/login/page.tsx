import { headers, cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { GitHubLoginButton } from "@/components/auth/githubButton";

export default async function Login({
  searchParams,
}: {
  searchParams: { message: string; redirect?: string; machine_id?: string };
}) {
  const origin = headers().get("origin");

  const handleRedirect = async () => {
    "use server";

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      // User is not logged in
      return;
    }

    if (searchParams.redirect) {
      // Detect if the target redirect is vscode
      const decodedRedirect = decodeURIComponent(searchParams.redirect);

      if (
        !decodedRedirect.startsWith("vscode://") &&
        !decodedRedirect.startsWith("vscode-insiders://")
      ) {
        // Target redirect is not vscode
        return;
      }

      console.log("Redirect to vscode");

      if (!searchParams.machine_id) {
        // No machine id is provided
        //redirect("/login?message=Missing machine id");
      }

      const existingToken = await supabase
        .from("api_tokens")
        .select("id")
        .eq("machine_id", searchParams.machine_id)
        .eq("user_id", user.data.user.id)
        .single();

      console.log(existingToken.error);

      let token = null;

      if (existingToken.data) {
        token = existingToken.data.id;
      } else {
        const newToken = await supabase
          .from("api_tokens")
          .insert({
            user_id: user.data.user.id,
            machine_id: searchParams.machine_id,
          })
          .select()
          .single();

        if (newToken.error || !newToken.data) {
          console.error(newToken.error);
          return;
        }

        token = newToken.data.id;
      }

      if (!token) {
        console.error("No token found");
        return;
      }

      const redirectUrl = new URL(decodedRedirect);
      redirectUrl.searchParams.set("token", token);

      return redirect(redirectUrl.toString());
    }
  };

  await handleRedirect();

  const signIn = async (formData: FormData) => {
    "use server";

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      const redirectSearchParams = new URLSearchParams(searchParams);
      redirectSearchParams.set("message", "Missing email or password");

      return redirect(`/login?${redirectSearchParams.toString()}`);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email as string,
      password: password as string,
    });

    if (error) {
      const redirectSearchParams = new URLSearchParams(searchParams);
      redirectSearchParams.set("message", error.message);
    }

    handleRedirect();
  };

  const signUp = async (formData: FormData) => {
    "use server";

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      const redirectSearchParams = new URLSearchParams(searchParams);
      redirectSearchParams.set("message", "Missing email or password");

      return redirect(`/login?${redirectSearchParams.toString()}`);
    }

    const emailRedirectSearchParams = new URLSearchParams(searchParams);

    const { error } = await supabase.auth.signUp({
      email: email as string,
      password: password as string,
      options: {
        emailRedirectTo: `${origin}/auth/callback?${emailRedirectSearchParams.toString()}`,
      },
    });

    if (error) {
      const redirectSearchParams = new URLSearchParams(searchParams);
      redirectSearchParams.set("message", error.message);

      return redirect(`/login?${redirectSearchParams.toString()}`);
    }

    const redirectSearchParams = new URLSearchParams(searchParams);
    redirectSearchParams.set(
      "message",
      "Check your email for the confirmation link"
    );

    return redirect(`/login?${redirectSearchParams.toString()}`);
  };

  const oAuthRedirectUri = `${
    headers().get("origin") || "http://localhost:3000"
  }/login?${new URLSearchParams(searchParams).toString()}`;

  return (
    <div>
      <div className="flex flex-col items-center py-8 xl:py-24">
        <form className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-600 max-w-md">
          {searchParams?.message && (
            <p className="mb-4 p-4 rounded-md bg-foreground/10 text-foreground text-center">
              {searchParams.message}
            </p>
          )}
          <GitHubLoginButton redirectTo={oAuthRedirectUri} />
          <div className="mb-5">
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Your email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="name@flowbite.com"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Your password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              required
            />
          </div>
          <button
            formAction={signIn}
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          >
            Sign In
          </button>
          <hr />
          <button
            formAction={signUp}
            className="py-2.5 px-5 mt-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
