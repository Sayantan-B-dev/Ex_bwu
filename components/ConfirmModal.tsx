"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type ResolveFn = (value: boolean) => void;

let _resolver: ResolveFn | null = null;
let _setState: React.Dispatch<React.SetStateAction<{ id: number; text: string } | null>> | null = null;

export function confirmAsync(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    _resolver = resolve;
    _setState?.({ id: Date.now(), text });
  });
}

export default function ConfirmModal() {
  const [state, setState] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    _setState = setState;
    return () => { _setState = null; };
  }, []);

  const close = useCallback((value: boolean) => {
    _resolver?.(value);
    _resolver = null;
    setState(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!state) return;
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, close]);

  if (!state) return null;

  return (
    <div className="confirm-overlay" onClick={() => close(false)}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-text">{state.text}</p>
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={() => close(false)} type="button">Cancel</button>
          <button className="confirm-btn ok" onClick={() => close(true)} type="button">Confirm</button>
        </div>
      </div>
    </div>
  );
}
