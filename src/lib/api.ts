import { publicAnonKey } from "../../utils/supabase/info";

const BASE = "https://hytlalatrnxmzxwhjwov.supabase.co/functions/v1/server/make-server-a5627775";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Posts
  getPosts:      ()                   => req<any[]>("/posts"),
  createPost:    (p: any)             => req<any>("/posts",    { method: "POST", body: JSON.stringify(p) }),
  updatePost:    (id: number, p: any) => req<any>(`/posts/${id}`, { method: "PUT",  body: JSON.stringify(p) }),
  deletePost:    (id: number)         => req<any>(`/posts/${id}`, { method: "DELETE" }),

  // Registrations
  getRegistrations:   ()                   => req<any[]>("/registrations"),
  createRegistration: (r: any)             => req<any>("/registrations",    { method: "POST", body: JSON.stringify(r) }),
  updateRegistration: (id: string, r: any) => req<any>(`/registrations/${id}`, { method: "PUT",  body: JSON.stringify(r) }),
  deleteRegistration: (id: string)         => req<any>(`/registrations/${id}`, { method: "DELETE" }),

  // Popups
  getPopups:   ()                        => req<any[]>("/popups"),
  updatePopup: (dept: string, p: any)    => req<any>(`/popups/${encodeURIComponent(dept)}`, { method: "PUT", body: JSON.stringify(p) }),

  // Looker URLs
  getLooker:    ()                        => req<Record<string, string>>("/looker"),
  updateLooker: (key: string, url: string) => req<any>(`/looker/${key}`, { method: "PUT", body: JSON.stringify({ url }) }),
};
