import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Reset Password - ProjectFlow",
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
