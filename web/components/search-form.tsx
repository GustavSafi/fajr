"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDictionary, path, type Locale } from "@/lib/i18n";
import { MUNICIPALITY_NAMES } from "@/lib/jobtech/places";
import { SuggestInput } from "./suggest-input";

/**
 * Sökfältet. Vanligt formulär med GET-liknande beteende: vi bygger URL:en och
 * navigerar, så att resultatet blir en delbar adress och bakåtknappen fungerar.
 *
 * "Var?" skickas som fritext i `plats`. Sökresultatsidan slår upp texten mot
 * API:ets egna kommunfacetter och skriver om till rätt kommun-id — då behöver
 * vi ingen egen ortlista att hålla uppdaterad.
 */
export function SearchForm({
  locale,
  size = "hero",
  defaultQuery = "",
  defaultPlace = "",
}: {
  locale: Locale;
  size?: "hero" | "compact";
  defaultQuery?: string;
  defaultPlace?: string;
}) {
  const t = getDictionary(locale);
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [place, setPlace] = useState(defaultPlace);

  const hero = size === "hero";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (place.trim()) params.set("plats", place.trim());
    const query = params.toString();
    router.push(path(locale, `/jobb${query ? `?${query}` : ""}`));
  }

  const field =
    "w-full bg-transparent text-ink placeholder:text-ink-mute/70 focus:outline-none";
  const label = "block text-[11px] font-medium uppercase tracking-wider text-ink-mute";

  return (
    <form
      onSubmit={submit}
      className={`flex flex-col gap-2 rounded-xl border border-line bg-surface p-2 shadow-card sm:flex-row sm:items-stretch ${
        hero ? "sm:gap-0" : ""
      }`}
    >
      <div className="flex-[3] rounded-lg px-3 py-2 focus-within:bg-sunk">
        <label className={label} htmlFor="q">
          {t.heroSearchLabel}
        </label>
        <SuggestInput
          id="q"
          name="q"
          type="occupation"
          value={q}
          onChange={setQ}
          placeholder={t.heroSearchPlaceholder}
          className={`${field} ${hero ? "text-[17px]" : "text-[15px]"}`}
        />
      </div>

      <div className="hidden w-px self-stretch bg-line sm:block" aria-hidden="true" />

      <div className="flex-[2] rounded-lg px-3 py-2 focus-within:bg-sunk">
        <label className={label} htmlFor="plats">
          {t.heroWhereLabel}
        </label>
        <SuggestInput
          id="plats"
          name="plats"
          value={place}
          onChange={setPlace}
          options={MUNICIPALITY_NAMES}
          placeholder={t.heroWherePlaceholder}
          className={`${field} ${hero ? "text-[17px]" : "text-[15px]"}`}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand px-6 py-3 font-display text-[15px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover sm:self-stretch"
      >
        {t.heroCta}
      </button>
    </form>
  );
}
