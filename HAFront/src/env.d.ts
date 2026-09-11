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
    USER_DATA: unknown;
    FINCA_DATA: unknown;
    POLIGONO_DATA: unknown;
    POLIGONO_CARGADO: unknown;
    ERROR: string | null;
    guardarFinca: () => Promise<void>;
    L: unknown;
    lucide?: {
      createIcons: () => void;
    };
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
    __FINCA_DATA__?: unknown;
  }

  namespace App {
    interface Locals {
      user?: UserOut & {
        user_metadata?: {
          full_name?: string;
          auth_provider?: string;
          wallet_address?: string;
        };
      };
    }
  }
}

export {};
