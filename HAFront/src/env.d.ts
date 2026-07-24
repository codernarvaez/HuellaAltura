/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { UserOut } from "./services/auth.service";

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    USUARIO_ID: string;
    FINCA_ID: string;
    USER_DATA: any;
    FINCA_DATA: any;
    POLIGONO_DATA: any;
    POLIGONO_CARGADO: any;
    ERROR: string | null;
    guardarFinca: () => Promise<void>;
    L: any;
  }
}
export {};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }

  namespace App {
    interface Locals {
      user?: UserOut;
    }
  }
}