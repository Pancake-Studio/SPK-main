"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ domain }: { domain?: string }) {
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      variant="outline"
      className="w-full"
      size="lg"
      loading={pending}
      onClick={() => {
        setPending(true);
        signIn("google", { callbackUrl: "/dashboard" });
      }}
    >
      <Globe className="size-5" />
      เข้าสู่ระบบด้วย Google{domain ? ` (@${domain})` : ""}
    </Button>
  );
}
