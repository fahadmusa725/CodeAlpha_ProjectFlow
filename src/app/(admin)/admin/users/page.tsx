import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

const PAGE_SIZE = 20;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface UsersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  await requireAdmin();
  const resolved = await searchParams;
  const rawQ = typeof resolved.q === "string" ? resolved.q.slice(0, 50) : "";
  const page = Math.max(1, parseInt(resolved.page || "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  await connectToDatabase();

  const filter = rawQ
    ? { $or: [
        { name: { $regex: escapeRegex(rawQ), $options: "i" } },
        { email: { $regex: escapeRegex(rawQ), $options: "i" } },
      ] }
    : {};

  const [users, totalCount, projectCounts] = await Promise.all([
    User.find(filter)
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .lean(),
    User.countDocuments(filter),
    Project.aggregate([
      { $unwind: "$members" },
      { $group: { _id: "$members.user", count: { $sum: 1 } } },
    ]),
  ]);

  const projectCountMap = new Map<string, number>();
  for (const item of projectCounts) {
    projectCountMap.set(item._id.toString(), item.count);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (rawQ) params.set("q", rawQ);
    params.set("page", String(p));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text">Users</h1>
        <p className="text-xs text-muted-text mt-0.5">
          {totalCount} {totalCount === 1 ? "user" : "users"} total
          {rawQ ? ` matching "${rawQ}"` : ""}
        </p>
      </div>

      {/* Search form */}
      <form method="GET" action="/admin/users" className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          id="admin-user-search"
          defaultValue={rawQ}
          placeholder="Search by name or email..."
          maxLength={50}
          className="w-full max-w-sm bg-surface border border-border rounded-[4px] px-3 py-1.5 text-sm text-text placeholder:text-muted-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Search users by name or email"
        />
        <button
          type="submit"
          className="text-sm font-medium bg-accent text-on-accent hover:bg-accent-hover px-3 py-1.5 rounded-[4px] transition-colors focus-visible:outline-2 focus-visible:outline-accent"
        >
          Search
        </button>
        {rawQ && (
          <Link
            href="/admin/users"
            className="text-sm text-muted-text hover:text-text px-2 py-1.5"
          >
            Clear
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <div className="border border-border rounded-[6px] bg-surface p-12 text-center">
          <p className="text-sm font-medium text-text">No users found</p>
          <p className="text-xs text-muted-text mt-1">
            {rawQ ? "Try a different search query." : "No users have registered yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-border">
          <table className="w-full text-sm text-left border-collapse min-w-[520px]">
            <caption className="sr-only">
              Users table, page {page} of {totalPages}
            </caption>
            <thead>
              <tr className="bg-background border-b border-border">
                <th scope="col" className="p-3 font-semibold text-text text-xs">Name</th>
                <th scope="col" className="p-3 font-semibold text-text text-xs">Email</th>
                <th scope="col" className="p-3 font-semibold text-text text-xs">Joined</th>
                <th scope="col" className="p-3 font-semibold text-text text-xs text-right">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u._id.toString()} className="hover:bg-background/50">
                  <td className="p-3 text-text font-medium text-xs">{u.name}</td>
                  <td className="p-3 text-muted-text text-xs">{u.email}</td>
                  <td className="p-3 text-muted-text text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="p-3 text-text text-xs text-right">
                    {projectCountMap.get(u._id.toString()) || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-xs text-muted-text">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="px-3 py-1.5 border border-border rounded-[4px] hover:bg-surface text-text font-medium transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl(page + 1)}
                className="px-3 py-1.5 border border-border rounded-[4px] hover:bg-surface text-text font-medium transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
