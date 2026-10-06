import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { keccak256, toUtf8Bytes } from "ethers";
import lotSchema from "../../schemas/lot.v1.json";
import ddsSchema from "../../schemas/dds.v1.json";
import fincaSchema from "../../schemas/finca.v1.json";

// Documentos off-chain (PLAN §3.5): se validan contra su JSON Schema, se serializan en
// forma canónica (claves ordenadas) y su keccak256 es el `dataHash` que va on-chain.

export type SchemaName = "lot/v1" | "dds/v1" | "finca/v1";

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
const validators = {
  "lot/v1": ajv.compile(lotSchema),
  "dds/v1": ajv.compile(ddsSchema),
  "finca/v1": ajv.compile(fincaSchema),
};

/** Claves que nunca pueden salir de Postgres (LOPDP / GDPR, ADR-002). */
const PERSONAL_KEYS =
  /^(nombres?|apellidos?|cedula|c[eé]dula|identificacion|ruc|telefono|celular|email|correo|direccion|firma|escritura)$/i;

function findPersonalKey(value: unknown, path = "$"): string | undefined {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findPersonalKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (PERSONAL_KEYS.test(k)) return `${path}.${k}`;
      const hit = findPersonalKey(v, `${path}.${k}`);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function validateDocument(schema: SchemaName, doc: unknown): void {
  const personal = findPersonalKey(doc);
  if (personal) throw new Error(`Dato personal no permitido en IPFS: ${personal}`);
  const validate = validators[schema];
  if (!validate(doc)) {
    throw new Error(`Documento inválido (${schema}): ${ajv.errorsText(validate.errors)}`);
  }
}

/** JSON canónico: claves ordenadas, sin espacios. Mismo documento → mismos bytes → mismo hash. */
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJSON(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function documentHash(doc: unknown): string {
  return keccak256(toUtf8Bytes(canonicalJSON(doc)));
}
