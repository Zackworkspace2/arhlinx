export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isErrorBody(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string'
}

export async function apiGet<T>(path: string, timeoutMs = 20000): Promise<T> {
  return request<T>(path, { method: 'GET' }, timeoutMs)
}

export async function apiPost<T>(path: string, body: unknown, timeoutMs = 20000): Promise<T> {
  return request<T>(
    path,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    },
    timeoutMs
  )
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: { accept: 'application/json', ...(init.headers ?? {}) }
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = null
      }
    }

    if (!response.ok) {
      if (response.status === 404 && !isErrorBody(body)) {
        throw new ApiError(
          'The local API is not mounted on this server. Start the app with `npm run dev`, or run `npm start` after a build.',
          response.status
        )
      }
      const message = isErrorBody(body) ? body.error : `Request failed (${response.status})`
      throw new ApiError(message, response.status)
    }
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The local service did not answer in time.', 0)
    }
    throw new ApiError(
      'Cannot reach the local service. Start the app with `npm run dev`.',
      0
    )
  } finally {
    clearTimeout(timer)
  }
}
