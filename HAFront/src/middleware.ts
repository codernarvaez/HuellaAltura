import { defineMiddleware } from "astro:middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (url && key && context.url.pathname.startsWith("/dashboard")) {
    const supabase = createServerClient(url, key, {
      cookies: {
        get(name: string) {
          return context.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          context.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          context.cookies.delete(name, options);
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return context.redirect("/acceso");
    }

    context.locals.user = user;
  }

  return next();
});
