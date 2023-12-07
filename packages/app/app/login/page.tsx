import { headers, cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div>
      <div className="flex flex-col items-center py-8 xl:py-24">
        <form className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-600 max-w-md">
          {searchParams?.message && (
            <p className="mb-4 p-4 rounded-md bg-foreground/10 text-foreground text-center">
              {searchParams.message}
            </p>
          )}
          <button
            type="button"
            className="text-white bg-[#24292F] hover:bg-[#24292F]/90 focus:ring-4 focus:outline-none focus:ring-[#24292F]/50 font-medium rounded-lg text-sm px-5 py-2.5 flex justify-center items-center dark:focus:ring-gray-500 dark:hover:bg-[#050708]/30 mb-2"
          >
            <svg
              className="w-4 h-4 me-2"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z"
                clipRule="evenodd"
              />
            </svg>
            Sign in with Github
          </button>
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
