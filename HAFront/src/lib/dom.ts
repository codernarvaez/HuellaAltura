/** Typed DOM helpers for client scripts. */

export type DomElement =
  HTMLElement &
  HTMLInputElement &
  HTMLButtonElement &
  HTMLSelectElement &
  HTMLTextAreaElement &
  HTMLFormElement &
  HTMLAnchorElement &
  HTMLImageElement;

export function getEl<T extends HTMLElement = DomElement>(
  id: string
): T | null {
  return document.getElementById(id) as T | null;
}

export function requireEl<T extends HTMLElement = DomElement>(id: string): T {
  const el = getEl<T>(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

export function getInput(id: string): HTMLInputElement | null {
  return getEl<HTMLInputElement>(id);
}

export function requireInput(id: string): HTMLInputElement {
  return requireEl<HTMLInputElement>(id);
}

export function getButton(id: string): HTMLButtonElement | null {
  return getEl<HTMLButtonElement>(id);
}

export function getForm(id: string): HTMLFormElement | null {
  return getEl<HTMLFormElement>(id);
}

export function qs<T extends Element = Element>(
  selector: string,
  root: ParentNode = document
): T | null {
  return root.querySelector(selector) as T | null;
}

export function qsa<T extends Element = Element>(
  selector: string,
  root: ParentNode = document
): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

export function errMessage(e: unknown, fallback = "Error desconocido"): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}
