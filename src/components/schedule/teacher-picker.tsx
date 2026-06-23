"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

/** Searchable teacher selector — updates `?teacher=<id>` so the server renders
 *  that teacher's editable timetable. */
export function TeacherPicker({ teachers, value }: { teachers: ComboboxOption[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  function select(id: string) {
    const next = new URLSearchParams(params);
    if (id) next.set("teacher", id);
    else next.delete("teacher");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="w-full sm:max-w-sm">
      <Combobox
        options={teachers}
        value={value}
        onChange={select}
        placeholder="เลือกครูที่ต้องการจัดตาราง"
        searchPlaceholder="ค้นหาชื่อครู…"
        className={pending ? "opacity-60" : undefined}
      />
    </div>
  );
}
