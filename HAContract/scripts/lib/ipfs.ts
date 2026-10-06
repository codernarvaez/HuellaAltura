import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { canonicalJSON, documentHash, validateDocument, type SchemaName } from "./documents";

// Pinning en Pinata (PLAN §1 y §3.6). En producción esto vive en HABack/chain-service;
// aquí lo usan los scripts de demo. El JWT nunca va al frontend.

const PINATA_API = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export interface Pinned {
  cid: string;
  uri: string; // ipfs://<cid>
  hash: string; // keccak256 del contenido canónico (solo documentos JSON)
  pinned: boolean; // false = CID calculado localmente, sin Pinata (solo redes locales)
}

export function gatewayUrl(cid: string): string {
  const gateway = (process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud").replace(/\/$/, "");
  return `${gateway}/ipfs/${cid}`;
}

async function pinBytes(data: Buffer, name: string, allowLocal: boolean): Promise<{ cid: string; pinned: boolean }> {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) {
    if (!allowLocal) throw new Error("Falta PINATA_JWT: no se puede fijar el documento en IPFS.");
    return { cid: computeRawCid(data), pinned: false };
  }
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)]), name);
  form.append("pinataMetadata", JSON.stringify({ name }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  const res = await fetch(PINATA_API, { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: form });
  if (!res.ok) throw new Error(`Pinata respondió ${res.status}: ${await res.text()}`);
  const { IpfsHash } = (await res.json()) as { IpfsHash: string };
  return { cid: IpfsHash, pinned: true };
}

/**
 * Valida el documento contra su esquema, lo serializa en forma canónica y lo fija.
 * Se sube como archivo (no con pinJSONToIPFS) para que los bytes en IPFS sean
 * exactamente los que produjeron `hash`.
 */
export async function pinDocument(schema: SchemaName, name: string, doc: unknown, allowLocal = false): Promise<Pinned> {
  validateDocument(schema, doc);
  const { cid, pinned } = await pinBytes(Buffer.from(canonicalJSON(doc), "utf8"), `${name}.json`, allowLocal);
  return { cid, uri: `ipfs://${cid}`, hash: documentHash(doc), pinned };
}

/** Fija un archivo (foto, PDF del DDS sin datos personales). */
export async function pinFile(filePath: string, allowLocal = false): Promise<Pinned> {
  const data = await readFile(filePath);
  const { cid, pinned } = await pinBytes(data, basename(filePath), allowLocal);
  return { cid, uri: `ipfs://${cid}`, hash: "", pinned };
}

/** CIDv1 (raw, sha2-256): el CID real del contenido, pero sin fijar en ningún nodo. */
export function computeRawCid(data: Buffer): string {
  const digest = createHash("sha256").update(data).digest();
  return "b" + base32(Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), digest]));
}

function base32(bytes: Buffer): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
