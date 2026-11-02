// Copy this file and schema.d.ts into your Vite src directory.
import type { components } from "./schema";

type Schemas = components["schemas"];
export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
}

export function livrusp(baseUrl: string, getToken: () => string | null) {
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(baseUrl.replace(/\/$/, "") + path, { ...init, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body.detail ?? response.statusText);
    }
    return response;
  }

  async function json<T>(method: string, path: string, value?: unknown): Promise<T> {
    const response = await request(path, {
      method,
      headers: value === undefined ? {} : { "Content-Type": "application/json" },
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    return response.status === 204 ? undefined as T : response.json();
  }

  return {
    request, json,
    login: (data: Schemas["UserLogin"]) => json<Schemas["LoginResponse"]>("POST", "/login", data),
    profile: () => json<Schemas["Profile"]>("GET", "/me/profile"),
    books: (q = "") => json<Schemas["CatalogBook"][]>("GET", "/books?q=" + encodeURIComponent(q)),
    book: (id: number) => json<Schemas["Detail"]>("GET", `/books/${id}`),
    pdf: async (id: number) => (await request(`/books/${id}/content`)).blob(),
    upload: async (id: number, file: File) => {
      const body = new FormData();
      body.append("file", file);
      await request(`/books/${id}/content`, { method: "PUT", body });
    },
  };
}
