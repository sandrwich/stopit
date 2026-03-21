const VERIFIER_KEY = 'stopit-oauth-verifier';

/** Generate a random code verifier for PKCE. */
function generateVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hash a string and return base64url-encoded result. */
async function sha256Challenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Start the OAuth flow — redirects the user to OpenRouter. */
export async function startOAuth() {
  const verifier = generateVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await sha256Challenge(verifier);
  const callbackUrl = window.location.origin + window.location.pathname;
  const url = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${challenge}&code_challenge_method=S256`;
  window.location.href = url;
}

/** Check if the current URL has an OAuth callback code and exchange it for an API key. */
export async function handleOAuthCallback(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  // Clean the URL
  window.history.replaceState({}, '', window.location.pathname);

  const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      ...(verifier ? { code_verifier: verifier, code_challenge_method: 'S256' } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `OAuth exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return data.key ?? null;
}
