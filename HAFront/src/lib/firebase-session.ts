type FirebaseUser = { getIdToken: () => Promise<string> };

export async function openPlatformSession(user: FirebaseUser) {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail ?? data.message ?? "No se pudo abrir la sesión");
  }

  document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
  const meRes = await fetch("/api/auth/me");
  const me = await meRes.json().catch(() => ({}));
  const roleName = String(me?.role?.name ?? "").toUpperCase();
  const isAdmin = ["ADMIN", "ADMINISTRADOR", "SUPER_ADMIN"].includes(roleName);
  window.location.href = isAdmin ? "/acopio/muestras" : "/productorFinca";
}
