import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <div className="mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">BookPMS</h1>
          <p className="mt-2 text-gray-500 text-sm">Publishing Management System</p>
        </div>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
