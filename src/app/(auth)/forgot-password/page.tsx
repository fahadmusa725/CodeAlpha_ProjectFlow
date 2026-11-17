"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, TextField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setFieldError("Email is required");
      return false;
    }
    if (!emailRegex.test(email.trim())) {
      setFieldError("Invalid email address");
      return false;
    }
    setFieldError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      await apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setServerError("Too many attempts. Please try again later.");
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Forgot password</h2>
        <p className="text-xs text-muted-text mt-0.5">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
          {serverError}
        </div>
      )}

      {isSubmitted ? (
        <div className="flex flex-col gap-4">
          <div className="bg-accent/10 border border-accent/20 text-accent text-xs p-3 rounded-[4px] leading-relaxed">
            If this email is registered, a reset link has been sent. Please check your inbox and spam folder.
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-sm font-medium text-text bg-surface border border-border hover:bg-background rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError}
            placeholder="name@example.com"
            autoComplete="email"
          />

          <Button type="submit" isLoading={isLoading} className="w-full mt-1">
            Send reset link
          </Button>

          <div className="text-xs text-center text-muted-text mt-2 border-t border-border pt-4">
            Remember your password?{" "}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
