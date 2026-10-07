import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-text">
            ProjectFlow
          </h1>
        </div>
        <div className="bg-surface border border-border rounded-[6px] p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
