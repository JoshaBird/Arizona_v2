import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-green-50">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-stone-800">404</h1>
        <h2 className="text-2xl font-semibold text-stone-600">
          Page Not Found
        </h2>
        <p className="text-stone-500 max-w-md mx-auto">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It
          might have been moved, deleted, or doesn&apos;t exist.
        </p>
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
