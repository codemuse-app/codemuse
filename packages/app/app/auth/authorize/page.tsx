"use client";

import { createClient } from "@/utils/supabase/client";

export default () => {
  const supabase = createClient();

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
