export const defaultModel = "openai/gpt-oss-20b";
export type AiSettings = {
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
};
const maxRetryWaitSeconds = 3;
// Returns the model's text, or null on any failure. Callers treat the text as untrusted.
export async function complete(
  settings: AiSettings,
  request: {
    system: string;
    user: string;
    timeoutMs: number;
    schema?: { name: string; schema: object };
  },
): Promise<string | null> {
  try {
    for (let attempt = 0; ; attempt++) {
      const response = await (settings.fetch ?? fetch)(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          signal: AbortSignal.timeout(request.timeoutMs),
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model || defaultModel,
            max_completion_tokens: 2000,
            reasoning_effort: "low",
            include_reasoning: false,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user.slice(0, 500) },
            ],
            ...(request.schema
              ? {
                  response_format: {
                    type: "json_schema",
                    json_schema: { ...request.schema, strict: true },
                  },
                }
              : {}),
          }),
        },
      );
      if (response.ok) {
        const result = await response.json();
        const text = result.choices?.[0]?.message?.content;
        return typeof text === "string" ? text : null;
      }
      // Groq sometimes returns 400 for a badly generated reply, despite strict mode.
      // A 429 is worth one short wait for the per-minute limit, not the daily one.
      const wait =
        response.status === 429
          ? Number(response.headers.get("retry-after") ?? 1)
          : 0;
      if (
        attempt > 0 ||
        ![400, 429].includes(response.status) ||
        !(wait <= maxRetryWaitSeconds)
      )
        return null;
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    }
  } catch {
    return null;
  }
}
