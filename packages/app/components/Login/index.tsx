import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const LoginForm = () => {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
    });
  };

  return (
    <div>
      <button onClick={handleLogin}>Sign in with github</button>
    </div>
  );
};

export const SignUpForm = () => {};
