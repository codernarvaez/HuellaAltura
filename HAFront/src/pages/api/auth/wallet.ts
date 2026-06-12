import type { APIRoute } from "astro";
import { verifyMessage } from "viem";
import { createServerSupabase, createServiceSupabase } from "../../../lib/supabase/server";

export const prerender = false;

function walletEmail(address: string) {
  return `${address.toLowerCase()}@wallet.huellaaltura.local`;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const body = await request.json().catch(() => null);

  if (!body?.message || !body?.signature || !body?.address) {
    return new Response(JSON.stringify({ error: "Datos de firma incompletos." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nonce = cookies.get("siwe-nonce")?.value;
  if (!nonce || !String(body.message).includes(nonce)) {
    return new Response(JSON.stringify({ error: "Nonce inválido o expirado." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const valid = await verifyMessage({
    address: body.address as `0x${string}`,
    message: body.message,
    signature: body.signature as `0x${string}`,
  });

  if (!valid) {
    return new Response(JSON.stringify({ error: "Firma inválida." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  cookies.delete("siwe-nonce", { path: "/" });

  const admin = createServiceSupabase();
  if (!admin) {
    return new Response(
      JSON.stringify({
        error:
          "MetaMask requiere SUPABASE_SERVICE_ROLE_KEY en el servidor. Consulta HAFront/.env.example",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const email = walletEmail(body.address);
  const password = crypto.randomUUID();
  const checksumAddress = body.address as string;

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      auth_provider: "metamask",
      wallet_address: checksumAddress,
      full_name: `Wallet ${checksumAddress.slice(0, 6)}…${checksumAddress.slice(-4)}`,
    },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (createError) {
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      return new Response(JSON.stringify({ error: "No se pudo vincular la wallet." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await admin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: {
        ...existing.user_metadata,
        auth_provider: "metamask",
        wallet_address: checksumAddress,
      },
    });
  }

  const supabase = createServerSupabase(cookies);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return new Response(JSON.stringify({ error: signInError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return redirect("/dashboard");
};
