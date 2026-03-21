export interface OpenRouterConfig {
  apiKey: string;
  textModel: string;
  imageModel: string;
}

/** JSON Schema for the meme generation response */
const MEME_SCHEMA = {
  name: 'meme_manifest',
  strict: true,
  schema: {
    type: 'object',
    required: ['title', 'bullets', 'transitionText', 'closingLine'],
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      bullets: { type: 'array', items: { type: 'string' } },
      transitionText: { type: 'string' },
      parenthetical: { type: 'string' },
      imagePrompts: { type: 'array', items: { type: 'string' } },
      imageLabels: { type: 'array', items: { type: 'string' } },
      quoteLine: { type: 'string' },
      closingLine: { type: 'string' },
    },
  },
} as const;

export async function chatCompletion(
  config: OpenRouterConfig,
  messages: Array<{ role: string; content: string }>,
  jsonMode = false,
): Promise<string> {
  // Try json_schema first, fall back to json_object, then plain
  const responseFormats = jsonMode
    ? [
        { type: 'json_schema' as const, json_schema: MEME_SCHEMA },
        { type: 'json_object' as const },
      ]
    : [undefined];

  let lastError: Error | null = null;

  for (const responseFormat of responseFormats) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'stopit',
        },
        body: JSON.stringify({
          model: config.textModel,
          messages,
          max_tokens: 4096,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message ?? `OpenRouter API error: ${res.status}`;
        // If structured output isn't supported, try next format
        if (responseFormat?.type === 'json_schema' && res.status === 400) {
          lastError = new Error(msg);
          continue;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // Only retry if this was a json_schema attempt
      if (responseFormat?.type === 'json_schema') continue;
      throw lastError;
    }
  }

  throw lastError ?? new Error('Chat completion failed');
}

export async function generateImage(
  config: OpenRouterConfig,
  prompt: string,
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'stopit',
    },
    body: JSON.stringify({
      model: config.imageModel,
      modalities: ['text', 'image'],
      messages: [
        { role: 'user', content: `Generate an image: ${prompt}` },
      ],
      image_config: {
        aspect_ratio: '1:1',
        image_size: '1K',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Image generation error: ${res.status}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;

  // Images come back in message.images[]
  const imageUrl = message?.images?.[0]?.image_url?.url;
  if (imageUrl) return imageUrl;

  throw new Error('Model did not return an image');
}
