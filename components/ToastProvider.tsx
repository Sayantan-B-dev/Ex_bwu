"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface Toast {
  id: number;
  text: string;
  ok: boolean;
}

interface ToastCtx {
  toast: (text: string, ok?: boolean) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

let _id = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    const t = timerRef.current.get(id);
    if (t) { clearTimeout(t); timerRef.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((text: string, ok = true) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, text, ok }]);
    const t = setTimeout(() => remove(id), 3500);
    timerRef.current.set(id, t);
  }, [remove]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.ok ? "ok" : "err"}`} onClick={() => remove(t.id)}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
