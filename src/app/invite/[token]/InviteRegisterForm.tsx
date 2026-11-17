"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";

interface InviteRegisterFormProps {
  email: string;
  inviteToken: string;
}

export function InviteRegisterForm({ email, inviteToken }: InviteRegisterFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: { name?: string; password?: string } = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      errors.name = "Name must be between 2 and 50 characters";
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
      const res = await apiFetch<{ user: { id: string; name: string; email: string }; joinedProject?: string }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email,
            password,
            inviteToken,
          }),
        }
      );

      if (res.joinedProject) {
        router.push(`/projects/${res.joinedProject}`);
      } else {
        router.push("/projects");
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || "Failed to create account");
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2" noValidate>
      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
          {serverError}
        </div>
      )}

      <TextField
        id="name"
        label="Full name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        placeholder="Alex Smith"
        autoComplete="name"
      />

      <TextField
        id="email"
        label="Email address"
        type="email"
        value={email}
        disabled
        autoComplete="email"
      />

      <TextField
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />

      <Button type="submit" isLoading={isLoading} className="w-full mt-1">
        Create account &amp; Join
      </Button>
    </form>
  );
}
