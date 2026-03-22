import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );
}
