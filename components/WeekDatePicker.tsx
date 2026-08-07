"use client";

import { useState } from "react";
import { updateWeekDate } from "@/lib/actions";
import NeumorphicDatePicker from "@/components/NeumorphicDatePicker";

interface WeekDatePickerProps {
  weekId: string;
  doneOn: string | null;
}

export default function WeekDatePicker({ weekId, doneOn }: WeekDatePickerProps) {
  const [date, setDate] = useState<string | null>(doneOn ?? null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await updateWeekDate(weekId, (fd.get("done") as string) || null);
    setMsg(res.ok ? "Saved" : res.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  return (
    <form className="week-date-form" onSubmit={onSubmit}>
      <input type="hidden" name="done" value={date ?? ""} />
      <NeumorphicDatePicker value={date} onChange={setDate} />
      <button className="week-date-save" type="submit">Save</button>
      {msg && <span className="week-date-msg">{msg}</span>}
    </form>
  );
}