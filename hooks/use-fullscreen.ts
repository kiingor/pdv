"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook pra entrar/sair do modo tela cheia do navegador (Fullscreen API).
 *
 * `isFullscreen` reflete o estado real do documento (também atualiza se
 * o usuário sair via ESC).
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(
      typeof document !== "undefined" &&
        typeof document.documentElement.requestFullscreen === "function",
    );

    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback(async () => {
    if (!isSupported) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Browser bloqueou (ex: chamada fora de gesto do usuário). Silencioso.
    }
  }, [isSupported]);

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Silencioso.
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) {
      void exit();
    } else {
      void enter();
    }
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isSupported, enter, exit, toggle };
}
