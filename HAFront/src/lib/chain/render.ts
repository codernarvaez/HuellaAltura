import type { ChainEvent, LotHistory, Origin } from "./trazabilidad";
import { bytes32ToText } from "./trazabilidad";

// Presentación de la historia del lote (HU-07): una tarjeta por fase, de origen a exportación.

const FORMS = ["Cereza", "Pergamino seco", "Café verde"];
const STATES = ["Cosechado", "Procesado", "Secado", "Trillado", "Catado", "Empacado", "Exportado"];
const RIPENESS = ["Madura", "Sobremadura", "Inmadura"];
const PROCESS = ["Lavado", "Natural", "Honey"];
const DRYING = ["Patio", "Cama africana", "Mecánico"];
const MAX_SAFE_MOISTURE = 125n; // 12,5 % × 10

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const hexId = (id: bigint) => "0x" + id.toString(16).padStart(64, "0");
const shortId = (id: bigint) => {
  const h = id.toString(16).padStart(64, "0");
  return `0x${h.slice(0, 2)}…${h.slice(-4)}`;
};
const shortHex = (h: string) => (h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h);
const kg = (grams: unknown) => `${(Number(grams as bigint) / 1000).toLocaleString("es-EC", { maximumFractionDigits: 3 })} kg`;
const date = (ts: bigint, withTime = true) =>
  ts === 0n
    ? "—"
    : new Date(Number(ts) * 1000).toLocaleString("es-EC", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "long" });
const tenths = (v: unknown) => (Number(v as number) / 10).toLocaleString("es-EC", { maximumFractionDigits: 1 });

export function ipfsLink(cidOrUri: string, gateway: string, label = "Ver documento") {
  const cid = cidOrUri.replace(/^ipfs:\/\//, "");
  if (!cid) return "";
  return `<a class="inline-flex items-center gap-1 text-secondary underline hover:text-primary" target="_blank" rel="noopener" href="${esc(gateway + cid)}"><span class="material-symbols-outlined text-base">open_in_new</span>${esc(label)}</a>`;
}

const row = (label: string, value: string) =>
  `<div class="flex justify-between gap-4 border-b border-outline-variant/40 py-1.5 last:border-0"><dt class="text-on-surface-variant">${esc(label)}</dt><dd class="text-right font-medium break-all">${value}</dd></div>`;

const badge = (text: string, tone: "ok" | "warn" | "bad" | "info") => {
  const cls = {
    ok: "bg-primary-fixed text-on-primary-fixed",
    warn: "bg-secondary-fixed text-on-secondary-fixed",
    bad: "bg-error-container text-on-error-container",
    info: "bg-surface-container-high text-on-surface",
  }[tone];
  return `<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}">${esc(text)}</span>`;
};

function card(icon: string, title: string, when: bigint, body: string, extra = "") {
  return `
  <li class="relative pl-10">
    <span class="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
      <span class="material-symbols-outlined text-lg">${icon}</span>
    </span>
    <article class="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
      <header class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-lg font-semibold text-primary">${esc(title)}</h3>
        <time class="text-xs text-on-surface-variant">${esc(date(when))}</time>
      </header>
      <dl class="text-sm">${body}</dl>
      ${extra ? `<div class="mt-2 flex flex-wrap gap-3 text-sm">${extra}</div>` : ""}
    </article>
  </li>`;
}

export function ddsStatus(o: Origin, nowSec: bigint): { text: string; tone: "ok" | "warn" | "bad" } {
  if (o.cert.revoked) return { text: "Revocado", tone: "bad" };
  if (o.cert.expiresAt <= nowSec) return { text: "Vencido", tone: "warn" };
  return { text: "Vigente", tone: "ok" };
}

function originCard(o: Origin, gateway: string, nowSec: bigint) {
  const st = ddsStatus(o, nowSec);
  const body =
    row("Finca (id)", `<span title="${esc(o.fincaId)}">${esc(shortHex(o.fincaId))}</span>`) +
    row("Versión del polígono", `v${o.fincaVersion}${o.currentVersion !== o.fincaVersion ? ` (actual v${o.currentVersion})` : ""}`) +
    row("Área", `${(o.areaHa100 / 100).toLocaleString("es-EC")} ha`) +
    row("Polígono (hash)", `<span title="${esc(o.geoHash)}">${esc(shortHex(o.geoHash))}</span>`) +
    row(
      "Auditoría de deforestación",
      o.audit.anchoredAt === 0n
        ? "—"
        : `${badge(o.audit.approved ? "Aprobada" : "Rechazada", o.audit.approved ? "ok" : "bad")} · corte ${esc(date(o.audit.fechaCorte, false))}`,
    ) +
    row("Certificado DDS", `${esc(shortId(o.certId))} ${badge(st.text, st.tone)}`) +
    row("Emitido", esc(date(o.cert.issuedAt, false))) +
    row("Vence", esc(date(o.cert.expiresAt, false)));
  return card("forest", "Origen y cumplimiento EUDR", o.cert.issuedAt, body, ipfsLink(o.certUri, gateway, "Certificado DDS (IPFS)"));
}

/** Agrupa los eventos por transacción: una tarjeta por fase. */
function phaseCards(h: LotHistory, gateway: string) {
  const byTx = new Map<string, ChainEvent[]>();
  for (const e of h.events) byTx.set(e.txHash, [...(byTx.get(e.txHash) ?? []), e]);

  const out: string[] = [];
  for (const group of byTx.values()) {
    const get = (n: string) => group.find((e) => e.name === n);
    const when = group[0].timestamp;
    const harvest = get("HarvestRegistered");
    const processed = get("LotProcessed");
    const transformed = get("LotTransformed");
    const dried = get("LotDried");
    const moist = get("HighMoistureWarning");
    const graded = get("LotGraded");
    const custody = get("CustodyTransferred");
    const split = get("LotSplit");
    const merged = get("LotMerged");
    const exported = get("LotExported");

    if (harvest) {
      const a = harvest.args;
      const node = h.nodes.get(a.lotId as bigint);
      out.push(
        card(
          "agriculture",
          "Cosecha",
          when,
          row("Lote (BatchID)", `<span title="${hexId(a.lotId as bigint)}">${esc(shortId(a.lotId as bigint))}</span>`) +
            row("Fecha de cosecha", esc(date(node?.lot.harvestDate ?? 0n, false))) +
            row("Peso", kg(a.grams)) +
            row("Variedad", esc(bytes32ToText(a.variety as `0x${string}`) || "—")) +
            row("Madurez de la cereza", esc(RIPENESS[Number(a.ripeness)] ?? "—")) +
            row("Estado inicial", esc(STATES[0])) +
            row("Custodio", `<span title="${esc(String(a.holder))}">${esc(shortHex(String(a.holder)))}</span>`),
          ipfsLink(String(a.cid), gateway, "Registro de cosecha") +
            `<span data-photo-cid="${esc(String(a.cid))}"></span>`,
        ),
      );
    } else if (processed) {
      const a = processed.args;
      out.push(
        card(
          "water_drop",
          "Beneficio húmedo",
          when,
          row("Tipo de proceso", esc(PROCESS[Number(a.processType)] ?? "—")) +
            row("Fermentación", `${Number(a.fermentationHours)} h`) +
            row("pH", tenths(a.phX10)),
          ipfsLink(String(a.cid), gateway, "Datos del beneficio"),
        ),
      );
    } else if (transformed && dried) {
      const t = transformed.args;
      const d = dried.args;
      const risky = Boolean(moist) || BigInt(d.moistureX10 as number) > MAX_SAFE_MOISTURE;
      out.push(
        card(
          "sunny",
          "Secado",
          when,
          row("Método", esc(DRYING[Number(d.method)] ?? "—")) +
            row("Humedad final", `${tenths(d.moistureX10)} % ${risky ? badge("Riesgo: humedad > 12,5 %", "warn") : badge("Segura", "ok")}`) +
            row("Cereza → pergamino", `${kg(t.gramsIn)} → ${kg(t.gramsOut)}`) +
            row("Nuevo lote", esc(shortId(t.toLotId as bigint))),
          ipfsLink(String(t.cid), gateway, "Datos del secado"),
        ),
      );
    } else if (transformed) {
      const t = transformed.args;
      const yieldPct = (Number(t.gramsOut as bigint) / Number(t.gramsIn as bigint)) * 100;
      out.push(
        card(
          "grain",
          "Trilla",
          when,
          row("Forma", esc(FORMS[Number(t.form)] ?? "—")) +
            row("Pergamino → verde", `${kg(t.gramsIn)} → ${kg(t.gramsOut)}`) +
            row("Factor de rendimiento", `${yieldPct.toLocaleString("es-EC", { maximumFractionDigits: 1 })} %`) +
            row("Nuevo lote", esc(shortId(t.toLotId as bigint))),
          ipfsLink(String(t.cid), gateway, "Datos de la trilla"),
        ),
      );
    } else if (graded) {
      const a = graded.args;
      out.push(
        card(
          "local_cafe",
          "Cata SCA",
          when,
          row("Puntaje SCA", `<span class="text-lg">${Number(a.scaScore)}</span> / 100`) +
            row("Defectos", String(Number(a.defects))) +
            row("Catador", `<span title="${esc(String(a.grader))}">${esc(shortHex(String(a.grader)))}</span>`),
          ipfsLink(String(a.cid), gateway, "Formulario de cata"),
        ),
      );
    } else if (custody) {
      const a = custody.args;
      out.push(
        card(
          "local_shipping",
          "Cambio de custodia",
          when,
          row("Lote", esc(shortId(a.lotId as bigint))) +
            row("De", `<span title="${esc(String(a.from))}">${esc(shortHex(String(a.from)))}</span>`) +
            row("A", `<span title="${esc(String(a.to))}">${esc(shortHex(String(a.to)))}</span>`) +
            row("Cantidad", kg(a.grams)) +
            row("Guía de remisión (hash)", esc(shortHex(String(a.dataHash)))),
          a.cid ? ipfsLink(String(a.cid), gateway, "Guía de remisión") : "",
        ),
      );
    } else if (split) {
      const a = split.args;
      const children = a.childIds as bigint[];
      const grams = a.grams as bigint[];
      out.push(
        card(
          "inventory_2",
          "Empaque en sacos",
          when,
          row("Lote de origen", esc(shortId(a.lotId as bigint))) +
            children.map((c, i) => row(`Saco ${i + 1} (${shortId(c)})`, kg(grams[i]))).join("") +
            row("Total", kg(grams.reduce((s, g) => s + g, 0n))),
          ipfsLink(String(a.cid), gateway, "Detalle del empaque"),
        ),
      );
    } else if (merged) {
      const a = merged.args;
      out.push(
        card(
          "merge",
          "Lote de exportación",
          when,
          row("Lote resultante", esc(shortId(a.lotId as bigint))) +
            row("Sacos unidos", (a.parentIds as bigint[]).map((p) => esc(shortId(p))).join(", ")) +
            row("Peso total", kg(a.grams)),
          ipfsLink(String(a.cid), gateway, "Detalle del lote"),
        ),
      );
    } else if (exported) {
      const a = exported.args;
      out.push(
        card(
          "flight_takeoff",
          "Exportación",
          when,
          row("Lote", esc(shortId(a.lotId as bigint))) + row("Referencia DDS / TRACES", esc(shortHex(String(a.refDDS)))),
          ipfsLink(String(a.cid), gateway, "Documento de exportación"),
        ),
      );
    }
  }
  return out.join("");
}

export function renderHistory(h: LotHistory, gateway: string): string {
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const lot = h.node.lot;
  const variety = bytes32ToText(lot.variety);
  const dds = h.origins.map((o) => ddsStatus(o, nowSec));
  const summary = `
  <section class="mb-6 rounded-xl bg-primary p-5 text-on-primary">
    <p class="text-xs uppercase tracking-wider opacity-80">Lote</p>
    <p class="font-mono text-sm break-all" title="${hexId(h.lotId)}">${hexId(h.lotId)}</p>
    <div class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div><p class="opacity-80">Estado</p><p class="font-semibold">${esc(STATES[lot.state] ?? "—")}</p></div>
      <div><p class="opacity-80">Forma</p><p class="font-semibold">${esc(FORMS[lot.form] ?? "—")}</p></div>
      <div><p class="opacity-80">En circulación</p><p class="font-semibold">${kg(h.node.grams)}</p></div>
      <div><p class="opacity-80">Variedad</p><p class="font-semibold">${esc(variety || "Mezcla")}</p></div>
    </div>
    <p class="mt-3 text-sm">EUDR: ${dds.map((d) => badge(`DDS ${d.text}`, d.tone)).join(" ")}
      ${h.origins.length > 1 ? `· ${h.origins.length} fincas de origen` : ""}</p>
    ${h.uri ? `<p class="mt-3 text-sm [&_a]:text-on-primary">${ipfsLink(h.uri, gateway, "Metadatos del lote (IPFS)")}</p>` : ""}
  </section>`;

  const timeline = `
  <ol class="relative space-y-4 border-l-2 border-primary/20 ml-4 pl-0">
    ${h.origins.map((o) => originCard(o, gateway, nowSec)).join("")}
    ${phaseCards(h, gateway)}
  </ol>`;

  return summary + timeline;
}
