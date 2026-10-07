"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import { getValidatedFrom } from "@/lib/redirect";
import type { AuthLoginResponse } from "@/types";

interface LoginPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = use(searchParams);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8 || password.length > 72) {
      errors.password = "Password must be between 8 and 72 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      await apiFetch<AuthLoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const destination = getValidatedFrom(resolvedSearchParams.from || null);
      router.push(destination);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError("Invalid email or password");
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
        <h2 className="text-lg font-semibold text-text">Sign in</h2>
        <p className="text-xs text-muted-text mt-0.5">
          Enter your credentials to access your account
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="name@example.com"
          autoComplete="email"
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          autoComplete="current-password"
        />

        <Button type="submit" isLoading={isLoading} className="w-full mt-1">
          Sign in
        </Button>
      </form>

      <div className="text-xs text-center text-muted-text mt-2 border-t border-border pt-4">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register${resolvedSearchParams.from ? `?from=${encodeURIComponent(resolvedSearchParams.from)}` : ""}`}
          className="text-accent hover:underline font-medium"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
