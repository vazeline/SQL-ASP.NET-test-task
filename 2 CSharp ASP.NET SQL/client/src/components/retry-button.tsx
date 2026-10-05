"use client";

import { useRouter } from "next/navigation";

export function RetryButton({ label = "Повторить" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      {label}
    </button>
  );
}