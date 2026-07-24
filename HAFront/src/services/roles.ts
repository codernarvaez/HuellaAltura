// src/services/roles.ts

// ============================================================
// ROLES DEL SISTEMA
// ============================================================

export const ADMIN_ROLES = ["ADMIN", "ADMINISTRADOR", "SUPER_ADMIN"];

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TENANT_ADMIN: "TENANT_ADMIN",
  ADMIN: "ADMIN",
  ADMINISTRADOR: "ADMINISTRADOR",
  PRODUCTOR: "PRODUCTOR",
  TECNICO_CAMPO: "TECNICO_CAMPO",
  INVESTIGADOR: "INVESTIGADOR",
  AUDITOR_INTERNO: "AUDITOR_INTERNO",
  // Roles de Acopio (Módulo 3)
  ANALISTA_FISICO: "ANALISTA_FISICO",
  CATADOR_Q: "CATADOR_Q",
  JEFE_CALIDAD: "JEFE_CALIDAD",
  GERENCIA_ACOPIO: "GERENCIA_ACOPIO",
  BODEGUERO: "BODEGUERO",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ============================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================

/**
 * Verifica si un rol es de administrador
 */
export function isAdminRole(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return ADMIN_ROLES.includes(roleName.toUpperCase());
}

/**
 * Verifica si un rol es de técnico de campo
 */
export function isTecnicoCampo(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return roleName.toUpperCase() === ROLES.TECNICO_CAMPO;
}

/**
 * Verifica si un rol es de investigador
 */
export function isInvestigador(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return roleName.toUpperCase() === ROLES.INVESTIGADOR;
}

/**
 * Verifica si un rol es de auditor interno
 */
export function isAuditorInterno(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return roleName.toUpperCase() === ROLES.AUDITOR_INTERNO;
}

/**
 * Verifica si un rol es de productor
 */
export function isProductor(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return roleName.toUpperCase() === ROLES.PRODUCTOR;
}

// ============================================================
// FUNCIONES DE VALIDACIÓN - MÓDULO DE ACOPIO
// ============================================================

/**
 * Verifica si un rol puede tomar muestras en finca
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, TECNICO_CAMPO
 */
export function puedeTomarMuestras(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || role === ROLES.TECNICO_CAMPO;
}

/**
 * Verifica si un rol puede realizar análisis físico
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, ANALISTA_FISICO, JEFE_CALIDAD
 */
export function puedeAnalizarFisico(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || 
         role === ROLES.ANALISTA_FISICO || 
         role === ROLES.JEFE_CALIDAD;
}

/**
 * Verifica si un rol puede realizar catación SCA
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, CATADOR_Q, JEFE_CALIDAD
 */
export function puedeCatar(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || 
         role === ROLES.CATADOR_Q || 
         role === ROLES.JEFE_CALIDAD;
}

/**
 * Verifica si un rol puede aprobar órdenes de compra
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, GERENCIA_ACOPIO
 */
export function puedeAprobarCompras(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || role === ROLES.GERENCIA_ACOPIO;
}

/**
 * Verifica si un rol puede gestionar bodega
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, BODEGUERO
 */
export function puedeGestionarBodega(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || role === ROLES.BODEGUERO;
}

/**
 * Verifica si un rol puede gestionar despachos
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, GERENCIA_ACOPIO
 */
export function puedeGestionarDespachos(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || role === ROLES.GERENCIA_ACOPIO;
}

/**
 * Verifica si un rol puede ver certificados de trazabilidad
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO, JEFE_CALIDAD, GERENCIA_ACOPIO
 */
export function puedeVerCertificados(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || 
         role === ROLES.TECNICO_CAMPO ||
         role === ROLES.AUDITOR_INTERNO ||
         role === ROLES.JEFE_CALIDAD ||
         role === ROLES.GERENCIA_ACOPIO;
}

/**
 * Verifica si un rol puede acceder al módulo de acopio (cualquier parte)
 */
export function puedeAccederAcopio(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || 
         role === ROLES.TECNICO_CAMPO ||
         role === ROLES.ANALISTA_FISICO ||
         role === ROLES.CATADOR_Q ||
         role === ROLES.JEFE_CALIDAD ||
         role === ROLES.GERENCIA_ACOPIO ||
         role === ROLES.BODEGUERO ||
         role === ROLES.AUDITOR_INTERNO;
}

// ============================================================
// FUNCIONES DE VALIDACIÓN - MÓDULO DE LABORES
// ============================================================

/**
 * Verifica si un rol puede validar normativa de labores
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, PRODUCTOR, TECNICO_CAMPO, INVESTIGADOR
 */
export function puedeValidarNormativa(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || 
         role === ROLES.PRODUCTOR ||
         role === ROLES.TECNICO_CAMPO ||
         role === ROLES.INVESTIGADOR;
}

/**
 * Verifica si un rol puede aprobar/rechazar labores
 * Roles: SUPER_ADMIN, TENANT_ADMIN, ADMIN, AUDITOR_INTERNO
 */
export function puedeAprobarLabores(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const role = roleName.toUpperCase();
  return isAdminRole(roleName) || role === ROLES.AUDITOR_INTERNO;
}

// ============================================================
// MAPA DE PERMISOS PARA EL MENÚ
// ============================================================

export interface MenuItem {
  href: string;
  label: string;
  icon: string;
  visible: (role: string | undefined | null) => boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  // Módulo 1: Productor y Finca
  {
    href: '/productorFinca',
    label: 'Productor y Finca',
    icon: 'agriculture',
    visible: (role) => !isAdminRole(role) && !isInvestigador(role) && !isAuditorInterno(role)
  },
  // Módulo 2: Información Agroambiental
  {
    href: '/infoAgro',
    label: 'Información Agroambiental',
    icon: 'eco',
    visible: (role) => true
  },
  // Módulo 2: Satelital
  {
    href: '/satelital',
    label: 'Satelital',
    icon: 'satellite_alt',
    visible: (role) => true
  },
  // Módulo 2: Expediente
  {
    href: '/expedientes',
    label: 'Expediente',
    icon: 'folder_open',
    visible: (role) => true
  },
  // Módulo 2: Calendario
  {
    href: '/calendario',
    label: 'Calendario',
    icon: 'calendar_month',
    visible: (role) => true
  },
  // Módulo 2: Ledger de Labores
  {
    href: '/labores',
    label: 'Ledger de Labores',
    icon: 'receipt_long',
    visible: (role) => true
  },
  // Módulo 3: Acopio - Muestras
  {
    href: '/acopio/muestras',
    label: 'Muestras',
    icon: 'science',
    visible: (role) => puedeTomarMuestras(role)
  },
  // Módulo 3: Acopio - Laboratorio
  {
    href: '/acopio/laboratorio',
    label: 'Laboratorio',
    icon: 'biotech',
    visible: (role) => puedeAnalizarFisico(role) || puedeCatar(role)
  },
  // Módulo 3: Acopio - Órdenes de Compra
  {
    href: '/acopio/compras',
    label: 'Órdenes de Compra',
    icon: 'shopping_cart',
    visible: (role) => puedeAprobarCompras(role)
  },
  // Módulo 3: Acopio - Bodega
  {
    href: '/acopio/bodega',
    label: 'Bodega',
    icon: 'warehouse',
    visible: (role) => puedeGestionarBodega(role)
  },
  // Módulo 3: Acopio - Despachos
  {
    href: '/acopio/despachos',
    label: 'Despachos',
    icon: 'local_shipping',
    visible: (role) => puedeGestionarDespachos(role)
  },
  // Módulo 3: Acopio - Certificados
  {
    href: '/acopio/certificados',
    label: 'Certificados',
    icon: 'verified',
    visible: (role) => puedeVerCertificados(role)
  },
  // Administración
  {
    href: '/user',
    label: 'Gestión de Usuarios',
    icon: 'group',
    visible: (role) => isAdminRole(role)
  },
  {
    href: '/rol',
    label: 'Gestión de Roles',
    icon: 'admin_panel_settings',
    visible: (role) => isAdminRole(role)
  },
  {
    href: '/variableDynamic',
    label: 'Variables Dinámicas',
    icon: 'tune',
    visible: (role) => isAdminRole(role)
  },
  {
    href: '/auditoriaSatelital',
    label: 'Auditoría Satelital',
    icon: 'satellite',
    visible: (role) => isAdminRole(role)
  },
];