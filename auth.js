import { supabase } from "./supabase.js";

/* ======================================================
   LOGIN CON GOOGLE (SaaS PRO)
====================================================== */
export async function login() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://aimeku.github.io/tugestor/",
        queryParams: {
          prompt: "consent",
          access_type: "offline",
        },
      },
    });

    if (error) throw error;
  } catch (err) {
    console.error("Login error:", err.message);
    alert("No se pudo iniciar sesión con Google");
  }
}


/* ======================================================
   LOGOUT
====================================================== */
export async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}

/* ======================================================
   SESIÓN ACTUAL
====================================================== */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

/* ======================================================
   UX HELPERS
====================================================== */
function setLoadingState(loading) {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;

  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px">
        <span class="spinner"></span>
        Conectando…
      </span>
    `;
  } else {
    btn.disabled = false;
    btn.textContent = "Continuar con Google";
  }
}
