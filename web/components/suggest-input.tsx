"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Textfält med förslag medan man skriver.
 *
 * Förslagen kommer från JobTechs typeahead, rankad efter hur ofta ordet
 * förekommer i riktiga annonser. Ett tecken ger de vanligaste träffarna, fler
 * tecken ger snävare — "s" ger allmänna ord, "sys" ger systemutvecklare.
 *
 * Får fältet en egen `options`-lista söker det i den i stället för att fråga
 * API:et. Sveriges 290 kommuner ligger redan i webbläsaren — att ringa
 * Arbetsförmedlingen för att få veta att "göte" betyder Göteborg vore slöseri,
 * och svaret ska komma medan man skriver, inte 150 ms senare.
 *
 * Byggd som en riktig combobox: piltangenter, Enter, Escape och rätt
 * aria-roller. Fungerar utan att man rör listan — man kan alltid skriva fritt
 * och ignorera förslagen, och fältet fungerar även om förslagen inte laddar.
 */

export function SuggestInput({
  id,
  value,
  onChange,
  onCommit,
  type,
  options,
  placeholder,
  className = "",
  autoComplete = "off",
  name,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Körs när ett förslag valts eller Enter tryckts på fritext. */
  onCommit?: (value: string) => void;
  type?: "occupation" | "skill";
  /** Egen lista att söka i i stället för API:et. */
  options?: string[];
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  name?: string;
}) {
  const listId = useId();
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Hämta förslag när man slutat skriva en kort stund.
  useEffect(() => {
    const query = value.trim();
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    if (options) {
      const needle = query.toLowerCase();
      // Den som börjar på det man skrivit ligger först — skriver man "sund"
      // menar man Sundsvall, inte Härnösand.
      const starts = options.filter((o) => o.toLowerCase().startsWith(needle));
      const contains = options.filter(
        (o) => !o.toLowerCase().startsWith(needle) && o.toLowerCase().includes(needle),
      );
      const next = [...starts, ...contains]
        .filter((o) => o.toLowerCase() !== needle)
        .slice(0, 8);
      setSuggestions(next);
      setActive(-1);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/complete?q=${encodeURIComponent(query)}&type=${type}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: string[] };
        const next = (data.suggestions ?? []).filter(
          (s) => s.toLowerCase() !== query.toLowerCase(),
        );
        setSuggestions(next);
        setActive(-1);
      } catch {
        // Avbrutet anrop eller nät som strular — fältet fungerar ändå.
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, type, options]);

  // Stäng listan när man klickar utanför.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function choose(suggestion: string) {
    onChange(suggestion);
    setOpen(false);
    setSuggestions([]);
    onCommit?.(suggestion);
  }

  const visible = open && suggestions.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <input
        id={inputId}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && visible) {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && visible) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === "Enter") {
            if (visible && active >= 0) {
              e.preventDefault();
              choose(suggestions[active]!);
            } else if (onCommit) {
              e.preventDefault();
              onCommit(value);
              setOpen(false);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />

      {visible && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lift"
        >
          {suggestions.map((suggestion, i) => (
            <li key={suggestion} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                // onMouseDown, inte onClick: annars hinner fältet tappa fokus
                // och listan stängas innan klicket registreras.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(suggestion);
                }}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-3 py-2 text-left text-[14.5px] transition-colors ${
                  i === active ? "bg-brand-wash text-brand" : "text-ink-soft"
                }`}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
