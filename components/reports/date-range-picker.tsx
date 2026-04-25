"use client";

import { useMemo, useState } from "react";
import {
  endOfDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange as RdpRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";

export type DateRange = { from: Date; to: Date };

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

type PresetKey = "today" | "yesterday" | "last7" | "last30" | "thisMonth";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "last7", label: "Últimos 7 dias" },
  { key: "last30", label: "Últimos 30 dias" },
  { key: "thisMonth", label: "Este mês" },
];

/** Devolve uma faixa pronta a partir do nome do preset. */
export function presetRange(key: PresetKey): DateRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

/**
 * Botão + popover com presets ("Hoje", "Últimos 7 dias", etc.) e dois
 * calendários lado a lado pra escolha personalizada do range.
 */
export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RdpRange>({
    from: value.from,
    to: value.to,
  });

  const label = useMemo(() => formatRangeLabel(value), [value]);

  function handlePreset(key: PresetKey) {
    const next = presetRange(key);
    setDraft({ from: next.from, to: next.to });
    onChange(next);
    setOpen(false);
  }

  function handleCalendarSelect(range: RdpRange | undefined) {
    const next: RdpRange = range ?? { from: undefined };
    setDraft(next);
    if (next.from && next.to) {
      onChange({ from: startOfDay(next.from), to: endOfDay(next.to) });
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="justify-start gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-2rem)] p-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ul className="flex flex-row flex-wrap gap-1 sm:flex-col sm:gap-0.5">
            {PRESETS.map((p) => (
              <li key={p.key}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePreset(p.key)}
                >
                  {p.label}
                </Button>
              </li>
            ))}
          </ul>

          <Separator orientation="vertical" className="hidden sm:block" />
          <Separator orientation="horizontal" className="sm:hidden" />

          <Calendar
            mode="range"
            numberOfMonths={2}
            locale={ptBR}
            selected={draft}
            onSelect={handleCalendarSelect}
            defaultMonth={value.from}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatRangeLabel(range: DateRange): string {
  const fromIso = range.from.toDateString();
  const toIso = range.to.toDateString();
  if (fromIso === toIso) return formatDate(range.from);
  return `${formatDate(range.from)} — ${formatDate(range.to)}`;
}
