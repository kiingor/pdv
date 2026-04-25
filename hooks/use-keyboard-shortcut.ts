"use client";

import { useEffect } from "react";

type Options = {
  /** Skip when an editable element is focused (input/textarea/contenteditable). Default: true. */
  ignoreInEditable?: boolean;
  /** Disable the shortcut entirely while still mounted. */
  enabled?: boolean;
};

/**
 * Liga uma tecla (ex: "F4", "Escape", "/") a um handler global em window.
 * Por padrão, ignora quando o foco está em um input/textarea pra não competir
 * com a digitação.
 */
export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  { ignoreInEditable = true, enabled = true }: Options = {}
) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (ignoreInEditable && isEditableElement(e.target)) return;
      handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler, ignoreInEditable, enabled]);
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}
