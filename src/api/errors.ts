export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Every backend error uses {error:{code,message,details?}}. */
export function toApiError(status: number, body: unknown): ApiError {
  const e = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
  return new ApiError(status, e?.code ?? `HTTP_${status}`, e?.message ?? `Request failed (${status})`, e?.details);
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) return err.code.startsWith("HTTP_") ? `${err.message}` : `${err.message} (${err.code})`;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
