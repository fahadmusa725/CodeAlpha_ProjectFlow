"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import { getValidatedFrom } from "@/lib/redirect";
import type { AuthRegisterResponse } from "@/types";

interface RegisterPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = use(searchParams);
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: { name?: string; email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      errors.name = "Name must be between 2 and 50 characters";
    }

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
      await apiFetch<AuthRegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email, password }),
      });

      const destination = getValidatedFrom(resolvedSearchParams.from || null);
      router.push(destination);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError("An account with this email address already exists.");
        } else {
          setServerError(err.message || "Registration failed. Please try again.");
        }
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
        <h2 className="text-lg font-semibold text-text">Create account</h2>
        <p className="text-xs text-muted-text mt-0.5">
          Get started with ProjectFlow today
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          id="name"
          label="Full name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder="Jane Doe"
          autoComplete="name"
        />

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
          autoComplete="new-password"
        />

        <Button type="submit" isLoading={isLoading} className="w-full mt-1">
          Create account
        </Button>
      </form>

      <div className="text-xs text-center text-muted-text mt-2 border-t border-border pt-4">
        Already have an account?{" "}
        <Link
          href={`/login${resolvedSearchParams.from ? `?from=${encodeURIComponent(resolvedSearchParams.from)}` : ""}`}
          className="text-accent hover:underline font-medium"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
