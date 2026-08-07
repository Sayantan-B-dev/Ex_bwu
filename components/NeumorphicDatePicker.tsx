"use client";

import { useEffect, useRef, useState } from "react";

interface NeumorphicDatePickerProps {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseISO(iso: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

export default function NeumorphicDatePicker({ value, onChange, placeholder = "Pick a date" }: NeumorphicDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => parseISO(value) ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const sel = parseISO(value);
  const today = new Date();
  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(d: number) {
    onChange(toISO(y, m, d));
    setOpen(false);
  }

  function shift(by: number) {
    setView(new Date(y, m + by, 1));
  }

  function setToday() {
    const t = new Date();
    onChange(toISO(t.getFullYear(), t.getMonth(), t.getDate()));
    setOpen(false);
  }

  const label = sel ? `${sel.getDate()} ${SHORT_MONTHS[sel.getMonth()]} ${sel.getFullYear()}` : null;

  return (
    <div className="date-pick-wrap" ref={wrapRef}>
      <button
        type="button"
        className={label ? "date-trigger has" : "date-trigger"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {label ?? placeholder}
      </button>
      {open && (
        <div className="date-pop" role="dialog" aria-label="Pick a date">
          <div className="date-pop-head">
            <button type="button" className="date-nav" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
            <span className="date-month">{MONTHS[m]} {y}</span>
            <button type="button" className="date-nav" aria-label="Next month" onClick={() => shift(1)}>›</button>
          </div>
          <div className="date-grid">
            {WEEKDAYS.map((d) => (
              <span key={d} className="date-dow">{d}</span>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <span key={i} className="date-day empty" />
              ) : (
                <button
                  key={i}
                  type="button"
                  className={
                    [
                      "date-day",
                      sel && sel.getDate() === d && sel.getMonth() === m && sel.getFullYear() === y ? "sel" : "",
                      today.getDate() === d && today.getMonth() === m && today.getFullYear() === y ? "today" : "",
                    ].join(" ")
                  }
                  onClick={() => pick(d)}
                >
                  {d}
                </button>
              )
            )}
          </div>
          <div className="date-pop-foot">
            <button type="button" className="date-foot-btn" onClick={() => { onChange(null); setOpen(false); }}>Clear</button>
            <button type="button" className="date-foot-btn" onClick={setToday}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}