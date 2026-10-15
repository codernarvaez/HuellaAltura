import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { coffeeTokenAbi, originRegistryAbi, traceabilityControllerAbi } from "./abis.ts";

// Errores del envío de transacciones (T03, SCRUM-8). Traduce los errores personalizados de los
// contratos y los de la wallet a un mensaje en español para el formulario. Módulo puro: se prueba
// con node:test.

export type CodigoErrorFirma =
  | "SIN_WALLET" // no hay proveedor EIP-1193 en el navegador
  | "SIN_CUENTA" // la wallet no entregó ninguna cuenta
  | "RECHAZADO" // el usuario rechazó la conexión, el cambio de red o la firma
  | "RED_INCORRECTA" // la wallet sigue en otra red después de pedir el cambio
  | "ABI_INCOMPATIBLE" // el contrato desplegado no tiene la interfaz de esta versión
  | "REVERTIRIA" // la simulación previa falló: no se pidió la firma
  | "REVERTIDA" // la transacción se minó pero revirtió
  | "RED"; // fallo del RPC o de la wallet sin causa del contrato

export interface ErrorContrato {
  nombre: string;
  args: readonly unknown[];
}

export class ErrorFirma extends Error {
  readonly codigo: CodigoErrorFirma;
  /** Error personalizado del contrato, si la causa fue un revert decodificado. */
  readonly contrato: ErrorContrato | null;

  // Sin propiedades de parámetro: node --experimental-strip-types no las admite.
  constructor(codigo: CodigoErrorFirma, mensaje: string, contrato: ErrorContrato | null = null, causa?: unknown) {
    super(mensaje, causa === undefined ? undefined : { cause: causa });
    this.name = "ErrorFirma";
    this.codigo = codigo;
    this.contrato = contrato;
  }
}

/** Errores de los tres contratos, sin repetir firmas: el controlador propaga los del token y del registro. */
export const ERRORES_ABI = (() => {
  const vistos = new Set<string>();
  return [...traceabilityControllerAbi, ...coffeeTokenAbi, ...originRegistryAbi].filter((e) => {
    if (e.type !== "error") return false;
    const firma = `${e.name}(${e.inputs.map((i) => i.type).join(",")})`;
    if (vistos.has(firma)) return false;
    vistos.add(firma);
    return true;
  });
})();

const rol = (nombre: string) => keccak256(stringToBytes(nombre));

/** Roles de HuellaAccess y CoffeeToken por su hash, con el nombre que ve el usuario. */
export const ROLES: Readonly<Record<Hex, string>> = {
  "0x0000000000000000000000000000000000000000000000000000000000000000": "administrador",
  [rol("RELAYER_ROLE")]: "relayer",
  [rol("FARMER_ROLE")]: "productor",
  [rol("PROCESSOR_ROLE")]: "procesador",
  [rol("GRADER_ROLE")]: "catador",
  [rol("EXPORTER_ROLE")]: "exportador",
  [rol("AUDITOR_ROLE")]: "auditor",
  [rol("CONTROLLER_ROLE")]: "controlador",
};

/** LotState de CoffeeTypes.sol, en el orden del enum. */
const ESTADOS = ["cosechado", "beneficiado", "secado", "trillado", "catado", "empacado", "exportado"];

const corta = (h: unknown) => {
  const s = String(h);
  return s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
};
const kg = (gramos: unknown) =>
  `${(Number(gramos as bigint) / 1000).toLocaleString("es-EC", { maximumFractionDigits: 3 })} kg`;

/** Mensaje en español de un error personalizado. Los desconocidos devuelven un texto genérico con su nombre. */
export function traducirErrorContrato(nombre: string, args: readonly unknown[] = []): string {
  switch (nombre) {
    case "AccessControlUnauthorizedAccount": {
      const [cuenta, necesario] = args as [Address, Hex];
      const r = ROLES[String(necesario).toLowerCase() as Hex] ?? corta(necesario);
      return `La cuenta ${corta(cuenta)} no tiene el rol de ${r} en el contrato.`;
    }
    case "EnforcedPause":
      return "El contrato está en pausa: por ahora no se aceptan registros.";
    case "ExpectedPause":
      return "El contrato no está en pausa.";
    case "FincaNotCompliant":
      return "La finca no tiene un DDS vigente para su versión actual del polígono (vencido, revocado o sin emitir).";
    case "LotNotFound":
      return "El lote no existe en la cadena.";
    case "InvalidState": {
      const [, actual] = args as [bigint, number];
      const estado = ESTADOS[Number(actual)] ?? `estado ${String(actual)}`;
      return `El lote está ${estado}: esta acción no corresponde a ese estado.`;
    }
    case "InvalidMass": {
      const [disponible, pedido] = args as [bigint, bigint];
      if (!disponible && !pedido) return "La cantidad debe ser mayor que cero.";
      return `La cantidad pedida (${kg(pedido)}) supera el saldo disponible (${kg(disponible)}).`;
    }
    case "InvalidHarvestDate":
      return "La fecha de cosecha no puede ser futura.";
    case "InvalidPh":
      return "El pH debe estar entre 0,1 y 14,0.";
    case "InvalidMoisture":
      return "La humedad debe estar entre 0,1 % y 100 %.";
    case "InvalidScore":
      return "El puntaje SCA no puede pasar de 100.";
    case "NotCustodian": {
      const [quien, desde] = args as [Address, Address];
      return `Solo el custodio ${corta(desde)} puede transferir este saldo (firma ${corta(quien)}).`;
    }
    case "MergeNeedsTwoLots":
      return "Para mezclar hace falta elegir al menos dos lotes.";
    case "ZeroAddress":
      return "Falta una dirección: el custodio o el destinatario no puede ser la dirección cero.";
    case "ERC1155InsufficientBalance": {
      const [, saldo, necesario] = args as [Address, bigint, bigint];
      return `Saldo insuficiente: hay ${kg(saldo)} y se necesitan ${kg(necesario)}.`;
    }
    case "TransferOnlyViaController":
      return "Los lotes solo se mueven a través del controlador de trazabilidad.";
    case "CertificateIsSoulbound":
      return "El certificado DDS es intransferible.";
    default:
      return `El contrato rechazó la operación (${nombre}).`;
  }
}

const CODIGO_RECHAZO = 4001;

function codigoRpc(e: unknown): number | undefined {
  const c = (e as { code?: unknown } | null)?.code;
  return typeof c === "number" ? c : undefined;
}

/** true si el usuario cerró o rechazó la solicitud en la wallet. */
export function esRechazoUsuario(err: unknown): boolean {
  if (err instanceof BaseError) {
    return !!err.walk((e) => e instanceof UserRejectedRequestError || codigoRpc(e) === CODIGO_RECHAZO);
  }
  return codigoRpc(err) === CODIGO_RECHAZO;
}

/** Busca el revert decodificado del contrato dentro de un error de viem. */
export function errorDeContrato(err: unknown): ErrorContrato | null {
  if (!(err instanceof BaseError)) return null;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
  if (!revert) return null;
  if (revert.data?.errorName) return { nombre: revert.data.errorName, args: revert.data.args ?? [] };
  if (revert.reason) return { nombre: "Error", args: [revert.reason] };
  return null;
}

/**
 * Convierte cualquier error del envío en ErrorFirma. `fase` decide el código cuando la causa es un
 * revert: "simulacion" (antes de firmar) o "recibo" (ya minada).
 */
export function interpretarError(err: unknown, fase: "simulacion" | "envio" = "envio"): ErrorFirma {
  if (err instanceof ErrorFirma) return err;
  if (esRechazoUsuario(err)) return new ErrorFirma("RECHAZADO", "Cancelaste la solicitud en la wallet.", null, err);
  const contrato = errorDeContrato(err);
  if (contrato) {
    const mensaje =
      contrato.nombre === "Error" ? `El contrato rechazó la operación: ${String(contrato.args[0])}` : traducirErrorContrato(contrato.nombre, contrato.args);
    return new ErrorFirma(fase === "simulacion" ? "REVERTIRIA" : "REVERTIDA", mensaje, contrato, err);
  }
  if (fase === "simulacion" && err instanceof BaseError && err.walk((e) => e instanceof ContractFunctionRevertedError)) {
    return new ErrorFirma("REVERTIRIA", "El contrato rechazaría la operación por un motivo que no se pudo leer.", null, err);
  }
  const detalle = err instanceof BaseError ? err.shortMessage : err instanceof Error ? err.message : String(err);
  return new ErrorFirma("RED", `No se pudo completar la operación: ${detalle}`, null, err);
}
