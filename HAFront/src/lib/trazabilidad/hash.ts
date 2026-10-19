// Utilidades de hashing compartidas entre servidor y navegador.
// Deben producir exactamente los mismos bytes que el backend (ver HAContract/smart_contract.md §5).
import { keccak256, stringToHex, type Hex } from "viem";

/**
 * JSON canónico (RFC 8785 / JCS para los tipos que usamos):
 * claves ordenadas por unidades UTF-16, sin espacios, sin propiedades `undefined`.
 * Se arma a mano para no depender del orden de propiedades del motor JS.
 */
export function canonicalJson(valor: unknown): string {
  if (typeof valor === "number" && !Number.isFinite(valor)) {
    throw new Error(`Número no serializable en JSON canónico: ${valor}`);
  }
  if (Array.isArray(valor)) {
    return `[${valor.map((v) => canonicalJson(v === undefined ? null : v)).join(",")}]`;
  }
  if (valor !== null && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    const partes = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
    return `{${partes.join(",")}}`;
  }
  return JSON.stringify(valor);
}

/** keccak256 sobre los bytes UTF-8 del texto (equivale a `keccak256(bytes(texto))` en Solidity). */
export function hashTexto(texto: string): Hex {
  return keccak256(stringToHex(texto));
}

export function hashJson(valor: unknown): Hex {
  return hashTexto(canonicalJson(valor));
}
