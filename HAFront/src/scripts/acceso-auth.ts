import { AUTH_API_URL as DEFAULT_AUTH_API_URL } from "../services/Api_Base";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "../lib/firebase-auth";
import { openPlatformSession } from "../lib/firebase-session";

type AccesoAuthConfig = {
  firebaseConfigured: boolean;
  authApiUrl?: string;
};

type AuthMode = "register" | "login";

function showAlert(message: string, type: "error" | "success" = "error") {
  const alertBox = document.getElementById("auth-alert");
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.classList.remove(
    "hidden",
    "border-error/30",
    "bg-error-container",
    "text-on-error-container",
    "border-primary/30",
    "bg-primary-container",
    "text-on-primary",
  );
  if (type === "success") {
    alertBox.classList.add("border-primary/30", "bg-primary-container", "text-on-primary");
  } else {
    alertBox.classList.add("border-error/30", "bg-error-container", "text-on-error-container");
  }
}

export function initAccesoAuth(config: AccesoAuthConfig) {
  const firebaseConfigured = Boolean(config.firebaseConfigured);
  const AUTH_API_URL = config.authApiUrl || DEFAULT_AUTH_API_URL;

  const tabRegister = document.getElementById("tab-register");
  const tabLogin = document.getElementById("tab-login");
  const authForm = document.getElementById("auth-form") as HTMLFormElement | null;
  const btnEmail = document.getElementById("btn-email") as HTMLButtonElement | null;
  const btnGoogle = document.getElementById("btn-google") as HTMLButtonElement | null;
  const fieldsRegister = document.getElementById("fields-register");
  const passwordInput = document.getElementById("password") as HTMLInputElement | null;

  let mode: AuthMode = "register";

  function setMode(nextMode: AuthMode) {
    mode = nextMode;
    const isRegister = mode === "register";
    tabRegister?.classList.toggle("bg-primary", isRegister);
    tabRegister?.classList.toggle("text-on-primary", isRegister);
    tabRegister?.classList.toggle("text-on-surface-variant", !isRegister);
    tabLogin?.classList.toggle("bg-primary", !isRegister);
    tabLogin?.classList.toggle("text-on-primary", !isRegister);
    tabLogin?.classList.toggle("text-on-surface-variant", isRegister);
    fieldsRegister?.classList.toggle("hidden", !isRegister);
    if (btnEmail) btnEmail.textContent = isRegister ? "Crear cuenta" : "Iniciar sesión";
    if (passwordInput) {
      passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
    }
  }

  tabRegister?.addEventListener("click", () => setMode("register"));
  tabLogin?.addEventListener("click", () => setMode("login"));

  if (btnGoogle) {
    if (!firebaseConfigured) {
      btnGoogle.disabled = true;
      btnGoogle.title = "Configura Firebase en HAFront/.env";
    } else {
      // Habilitar de inmediato: el módulo ya está empaquetado por Astro
      btnGoogle.disabled = false;
      btnGoogle.title = "Continuar con Google";
      btnGoogle.addEventListener("click", async () => {
        try {
          btnGoogle.disabled = true;
          const user = await signInWithGoogle();
          await openPlatformSession(user);
        } catch (error: unknown) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code?: string }).code)
              : "";
          if (code === "auth/popup-closed-by-user") return;
          if (code === "auth/popup-blocked") {
            showAlert(
              "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio y pulsa Continuar con Google otra vez.",
            );
            return;
          }
          showAlert(error instanceof Error ? error.message : "Error con Google Auth.");
        } finally {
          btnGoogle.disabled = false;
        }
      });
    }
  }

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!btnEmail) return;

    const formData = new FormData(authForm);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const firstName = String(formData.get("firstName") ?? "");
    const lastName = String(formData.get("lastName") ?? "");
    const cedula = String(formData.get("cedula") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const originalLabel = mode === "register" ? "Crear cuenta" : "Iniciar sesión";

    try {
      btnEmail.disabled = true;
      btnEmail.innerHTML = `
        <span class="inline-flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          ${mode === "register" ? "Creando cuenta..." : "Iniciando sesión..."}
        </span>
      `;

      if (firebaseConfigured) {
        if (mode === "register") {
          await signUpWithEmail(email, password, `${firstName} ${lastName}`.trim());
        } else {
          try {
            const firebaseUser = await signInWithEmail(email, password);
            await openPlatformSession(firebaseUser);
            return;
          } catch (firebaseError: unknown) {
            const code =
              firebaseError && typeof firebaseError === "object" && "code" in firebaseError
                ? String((firebaseError as { code?: string }).code)
                : "";
            if (code !== "auth/user-not-found" && code !== "auth/invalid-credential") {
              throw firebaseError;
            }
          }
        }
      }

      if (mode === "register") {
        const res = await fetch(`${AUTH_API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            identifier: cedula,
            phone_number: phone,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showAlert(data.detail ?? "Error al registrarse.");
          return;
        }
        showAlert("Cuenta creada. Ahora puedes iniciar sesión.", "success");
        setMode("login");
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = String(data.detail ?? data.message ?? "Credenciales inválidas.");
          showAlert(
            res.status === 429 || /429|limitando|rate limit/i.test(msg)
              ? "Demasiados intentos. Espera ~1 minuto e inténtalo de nuevo (el servicio free puede despertar lento)."
              : msg,
          );
          return;
        }

        document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json().catch(() => ({}));
        const roleName = String(me?.role?.name ?? "").toUpperCase();
        const isAdmin = ["ADMIN", "ADMINISTRADOR", "SUPER_ADMIN"].includes(roleName);

        window.location.href = isAdmin ? "/acopio/muestras" : "/productorFinca";
      }
    } catch (error) {
      showAlert(error instanceof Error ? error.message : "Error de autenticación.");
    } finally {
      btnEmail.disabled = false;
      btnEmail.textContent = originalLabel;
    }
  });
}
