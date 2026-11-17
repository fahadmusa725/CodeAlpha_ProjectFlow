"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, TextField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";

const HEX_64_REGEX = /^[0-9a-f]{64}$/;

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const isTokenValidFormat = HEX_64_REGEX.test(token);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8 || password.length > 72) {
      errors.password = "Password must be between 8 and 72 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
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
      await apiFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setServerError("Too many attempts. Please try again later.");
        } else if (err.status === 400) {
          setServerError("This reset link is invalid or has expired.");
        } else {
          setServerError("An unexpected error occurred. Please try again.");
        }
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValidFormat) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Invalid reset link</h2>
          <p className="text-xs text-muted-text mt-0.5">
            This password reset link is invalid or has expired.
          </p>
        </div>

        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px] leading-relaxed">
          The link you followed is missing a valid security token or has already expired.
        </div>

        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Reset password</h2>
        <p className="text-xs text-muted-text mt-0.5">
          Choose a new password for your ProjectFlow account.
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
          {serverError}
        </div>
      )}

      {isSuccess ? (
        <div className="flex flex-col gap-4">
          <div className="bg-accent/10 border border-accent/20 text-accent text-xs p-3 rounded-[4px] leading-relaxed">
            Your password has been reset successfully. You can now sign in with your new password.
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            id="password"
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            autoComplete="new-password"
          />

          <TextField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />

          <Button type="submit" isLoading={isLoading} className="w-full mt-1">
            Reset password
          </Button>

          <div className="text-xs text-center text-muted-text mt-2 border-t border-border pt-4">
            <Link href="/login" className="text-accent hover:underline font-medium">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
