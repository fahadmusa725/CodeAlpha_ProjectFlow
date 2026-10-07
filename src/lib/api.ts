export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };

  const response = await fetch(endpoint, config);

  if (response.status === 401) {
    if (typeof window !== "undefined" && !endpoint.includes("/api/auth/login")) {
      const currentPath = window.location.pathname;
      const loginUrl = `/login${currentPath && currentPath !== "/" ? `?from=${encodeURIComponent(currentPath)}` : ""}`;
      window.location.assign(loginUrl);
    }
    let errorMsg = "Unauthorized";
    try {
      const data = await response.json();
      if (data && data.error) errorMsg = data.error;
    } catch {
      // ignore json parse error
    }
    throw new ApiError(401, errorMsg);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMsg);
  }

  return data as T;
}
