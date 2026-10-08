import Ably from "ably";

let restClient: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest | null {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ABLY_API_KEY is missing. Realtime publishing is disabled.");
    }
    return null;
  }
  if (!restClient) {
    restClient = new Ably.Rest({ key: apiKey });
  }
  return restClient;
}

export async function publishToProject(
  projectId: string,
  eventName: string,
  data: Record<string, unknown>
): Promise<void> {
  const client = getAblyRest();
  if (!client) return;

  try {
    const channel = client.channels.get(`project:${projectId}`);
    const publishPromise = channel.publish(eventName, data);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Ably publish timeout after 3s")), 3000)
    );
    await Promise.race([publishPromise, timeoutPromise]);
  } catch (error) {
    // Log error cleanly without leaking credentials/API keys
    console.error(`Failed to publish realtime event "${eventName}" to project "${projectId}":`, error instanceof Error ? error.message : "Unknown error");
  }
}
