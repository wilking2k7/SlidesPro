import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 grid place-items-center shadow-sm shadow-blue-600/30">
            <div className="grid grid-cols-2 gap-[2px]">
              <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
              <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
              <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
              <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
            </div>
          </div>
          <span className="font-serif text-lg tracking-tight">SlidesPro</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">{session.user.email}</span>
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
