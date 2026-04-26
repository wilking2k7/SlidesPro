import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-100">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block w-5 h-5 rounded bg-neutral-900" />
          SlidesPro
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
