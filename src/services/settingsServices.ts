const BASE_URL = '/api/settings'

async function request(options: RequestInit): Promise<void> {
  const res = await fetch(BASE_URL, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
}

export const settingsApi = {
  /** First visit: the server stores these only if the user has no settings yet. */
  init: (timezone: string, locale: string) =>
    request({ method: 'POST', body: JSON.stringify({ timezone, locale }) }),
  update: (patch: { memoryEnabled?: boolean; timezone?: string; locale?: string }) =>
    request({ method: 'PATCH', body: JSON.stringify(patch) }),
}
