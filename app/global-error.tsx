"use client";

import { useEffect } from "react";
import { captureClientException } from "@/lib/observability/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientException(error, { boundary: "global-error", digest: error.digest });
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
            Something went wrong
          </h2>
          <p className="mb-2 max-w-md text-slate-500">
            An unexpected error interrupted this view. Try again, or return to the previous screen.
          </p>
          {error.digest ? (
            <p className="mb-6 max-w-md text-xs uppercase tracking-[0.24em] text-slate-400">
              Error reference: {error.digest}
            </p>
          ) : (
            <div className="mb-6" />
          )}
          <button
            onClick={() => reset()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
