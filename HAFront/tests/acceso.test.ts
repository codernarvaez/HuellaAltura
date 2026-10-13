import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LOGIN_PATH,
  clasificarRuta,
  decidirAcceso,
  estaEnSeccion,
  isAdminOnlyPath,
  isPublicPath,
} from "../src/lib/acceso.ts";

const CONTINUAR = { tipo: "continuar" };
const A_LOGIN = { tipo: "redirigir", destino: LOGIN_PATH, borrarCookie: false };
const A_LOGIN_BORRANDO = { tipo: "redirigir", destino: LOGIN_PATH, borrarCookie: true };
const PROHIBIDO = { tipo: "prohibido" };

describe("estaEnSeccion", () => {
  it("acepta la sección y sus subrutas", () => {
    assert.equal(estaEnSeccion("/trazabilidad", "/trazabilidad"), true);
    assert.equal(estaEnSeccion("/trazabilidad/", "/trazabilidad"), true);
    assert.equal(estaEnSeccion("/trazabilidad/lotes/1", "/trazabilidad"), true);
  });

  it("no acepta rutas que solo comparten el prefijo", () => {
    assert.equal(estaEnSeccion("/trazabilidadX", "/trazabilidad"), false);
    assert.equal(estaEnSeccion("/", "/trazabilidad"), false);
  });
});

describe("isPublicPath e isAdminOnlyPath", () => {
  it("mantiene las rutas públicas existentes", () => {
    for (const ruta of ["/", "/acceso", "/legal/terminos", "/legal/privacidad", "/legal/cookies"]) {
      assert.equal(isPublicPath(ruta), true, ruta);
    }
    for (const ruta of ["/api/auth/callback", "/_astro/app.js", "/favicon.ico"]) {
      assert.equal(isPublicPath(ruta), true, ruta);
    }
  });

  it("abre /verificar por segmento", () => {
    assert.equal(isPublicPath("/verificar"), true);
    assert.equal(isPublicPath("/verificar/7"), true);
    assert.equal(isPublicPath("/verificarX"), false);
  });

  it("no abre /trazabilidad", () => {
    assert.equal(isPublicPath("/trazabilidad"), false);
    assert.equal(isPublicPath("/trazabilidad/cosecha"), false);
  });

  it("mantiene las rutas de administración y deja fuera /trazabilidad", () => {
    for (const ruta of ["/user", "/rol", "/variableDynamic"]) {
      assert.equal(isAdminOnlyPath(ruta), true, ruta);
    }
    assert.equal(isAdminOnlyPath("/trazabilidad"), false);
  });
});

describe("clasificarRuta", () => {
  it("distingue pública, admin y privada", () => {
    assert.equal(clasificarRuta("/acceso"), "publica");
    assert.equal(clasificarRuta("/user"), "admin");
    assert.equal(clasificarRuta("/trazabilidad"), "privada");
    assert.equal(clasificarRuta("/productorFinca"), "privada");
  });
});

describe("decidirAcceso", () => {
  it("deja pasar las rutas públicas con o sin token", () => {
    assert.deepEqual(decidirAcceso({ pathname: "/verificar/7" }), CONTINUAR);
    assert.deepEqual(decidirAcceso({ pathname: "/", token: "t", sesionValida: false }), CONTINUAR);
  });

  it("manda a /acceso sin token y no borra la cookie", () => {
    for (const pathname of ["/trazabilidad", "/trazabilidad/cosecha", "/trazabilidad/lotes/1/secado", "/trazabilidadX"]) {
      assert.deepEqual(decidirAcceso({ pathname }), A_LOGIN, pathname);
    }
    assert.deepEqual(decidirAcceso({ pathname: "/trazabilidad", token: "" }), A_LOGIN);
    assert.deepEqual(decidirAcceso({ pathname: "/trazabilidad", token: null }), A_LOGIN);
  });

  it("manda a /acceso y borra la cookie si la sesión no es válida", () => {
    assert.deepEqual(decidirAcceso({ pathname: "/trazabilidad", token: "t", sesionValida: false }), A_LOGIN_BORRANDO);
  });

  it("deja entrar a /trazabilidad con cualquier rol", () => {
    for (const rol of ["PRODUCTOR", "TECNICO", "AUDITOR", "SUPER_ADMIN", null]) {
      assert.deepEqual(decidirAcceso({ pathname: "/trazabilidad", token: "t", sesionValida: true, rol }), CONTINUAR, String(rol));
    }
  });

  it("prohíbe las rutas de administración sin rol admin", () => {
    assert.deepEqual(decidirAcceso({ pathname: "/user", token: "t", sesionValida: true, rol: "PRODUCTOR" }), PROHIBIDO);
    assert.deepEqual(decidirAcceso({ pathname: "/rol", token: "t", sesionValida: true, rol: null }), PROHIBIDO);
    assert.deepEqual(decidirAcceso({ pathname: "/user", token: "t", sesionValida: true, rol: "admin" }), CONTINUAR);
  });
});
