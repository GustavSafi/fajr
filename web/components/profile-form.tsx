"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fill, getDictionary, path, type Locale } from "@/lib/i18n";
import type { EmploymentType } from "@/lib/types";
import {
  PROFILE_COOKIE,
  profileCompleteness,
  serializeProfile,
  type MatchProfile,
} from "@/lib/matching/profile";
import { toQueryString } from "@/lib/search-params";
import { SuggestInput } from "./suggest-input";

/**
 * Profilguiden. Steg 1 syns direkt och räcker för att ranka; steg 2 ligger
 * hopfällt bakom "förbättra matchningen".
 *
 * Profilen skrivs till en cookie i webbläsaren, inte till en databas — det är
 * det som gör att man kan testa matchningen utan konto. Serverkomponenterna
 * läser samma cookie när de rankar, så ingen data behöver skickas någon
 * annanstans.
 */

const YEAR_OPTIONS = [0, 1, 2, 3, 5, 8, 12, 20];

const EMPLOYMENT_TYPES: EmploymentType[] = ["full-time", "part-time", "contract", "internship"];

/** Fält där man lägger till flera värden, ett i taget. */
function ChipInput({
  label,
  help,
  placeholder,
  values,
  onChange,
  addLabel,
  removeLabel,
  id,
  suggest,
}: {
  label: string;
  help: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  removeLabel: string;
  id: string;
  suggest: "occupation" | "skill";
}) {
  const [draft, setDraft] = useState("");

  function add(raw?: string) {
    const value = (raw ?? draft).trim();
    if (!value || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value].slice(0, 12));
    setDraft("");
  }

  return (
    <div>
      <label htmlFor={id} className="block font-display text-[15px] font-semibold">
        {label}
      </label>
      <p className="mt-0.5 text-[13px] text-ink-mute">{help}</p>

      <div className="mt-2 flex gap-2">
        <div className="min-w-0 flex-1">
          <SuggestInput
            id={id}
            type={suggest}
            value={draft}
            onChange={setDraft}
            // Enter eller ett valt förslag lägger till direkt — annars skulle
            // Enter skicka hela formuläret i stället.
            onCommit={(value) => add(value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-ink-mute/70 focus:border-brand focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => add()}
          className="rounded-lg border border-line px-3 py-2 text-[14px] font-medium transition-colors hover:bg-sunk"
        >
          {addLabel}
        </button>
      </div>

      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`${removeLabel}: ${value}`}
                className="group flex items-center gap-1.5 rounded-md bg-brand-wash px-2.5 py-1 text-[13px] text-brand transition-colors hover:bg-urgent-wash hover:text-urgent"
              >
                {value}
                <span aria-hidden="true" className="text-[15px] leading-none">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProfileForm({
  locale,
  initial,
  municipalities,
}: {
  locale: Locale;
  initial: MatchProfile;
  municipalities: Array<{ id: string; label: string }>;
}) {
  const t = getDictionary(locale);
  const router = useRouter();

  const [profile, setProfile] = useState<MatchProfile>(initial);
  const [placeDraft, setPlaceDraft] = useState("");
  const [showMore, setShowMore] = useState(
    Boolean(initial.skills?.length || initial.salaryMin || initial.remote),
  );

  const set = <K extends keyof MatchProfile>(key: K, value: MatchProfile[K]) =>
    setProfile((p) => {
      const next = { ...p };
      if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
      else next[key] = value;
      return next;
    });

  /*
   * useMemo, inte en vanlig map: listan går in som beroende i
   * SuggestInputs effekt, och en ny array vid varje rendering skulle
   * få effekten att köra om i all oändlighet.
   */
  const municipalityNames = useMemo(
    () => municipalities.map((m) => m.label),
    [municipalities],
  );

  const chosenPlaces = (profile.municipalities ?? [])
    .map((id) => municipalities.find((m) => m.id === id))
    .filter((m): m is { id: string; label: string } => Boolean(m));

  function addPlace(name: string) {
    const match = municipalities.find(
      (m) => m.label.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!match) return;
    const current = profile.municipalities ?? [];
    if (!current.includes(match.id)) set("municipalities", [...current, match.id].slice(0, 12));
    setPlaceDraft("");
  }

  const roles = profile.roles ?? [];
  const places = profile.municipalities ?? [];

  function save(event: React.FormEvent) {
    event.preventDefault();
    const year = 60 * 60 * 24 * 365;
    document.cookie = `${PROFILE_COOKIE}=${serializeProfile(profile)}; path=/; max-age=${year}; SameSite=Lax`;

    /*
     * Sökningen måste utgå från profilen, inte bara rankas efter den.
     *
     * Skickade vi bara ?sortera=match fick man de hundra annonser API:et råkar
     * leverera på en tom sökning och sedan en rankning bland dem — en
     * undersköterska i Göteborg möttes av arbetsmiljöingenjörer med 54 %
     * matchning. Rankningen kan bara sortera det den fått; vad den får avgörs
     * här. Yrkena läggs ihop till en fritextsökning (JobTech ORar
     * yrkesbegrepp: "undersköterska lärare" ger summan av båda) och
     * kommunerna blir ett riktigt filter.
     */
    const query = toQueryString({
      ...(roles.length ? { q: roles.join(" ") } : {}),
      ...(places.length ? { municipality: places } : {}),
      sort: "match",
    });

    router.push(path(locale, `/jobb${query}`));
    router.refresh();
  }

  function clear() {
    document.cookie = `${PROFILE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    setProfile({ v: 1 });
    router.refresh();
  }

  const percent = Math.round(profileCompleteness(profile) * 100);
  const field = "rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink focus:border-brand focus:outline-none";

  return (
    <form onSubmit={save} className="flex flex-col gap-7">
      <ChipInput
        id="roller"
        label={t.profileRoles}
        help={t.profileRolesHelp}
        placeholder={t.heroSearchPlaceholder}
        values={profile.roles ?? []}
        onChange={(next) => set("roles", next)}
        addLabel={t.profileAdd}
        removeLabel={t.profileRemove}
        suggest="occupation"
      />

      <div>
        <label htmlFor="plats" className="block font-display text-[15px] font-semibold">
          {t.profileWhere}
        </label>
        <p className="mt-0.5 text-[13px] text-ink-mute">{t.profileWhereHelp}</p>
        <div className="mt-2 flex gap-2">
          <div className="min-w-0 flex-1">
            <SuggestInput
              id="plats"
              value={placeDraft}
              onChange={setPlaceDraft}
              onCommit={addPlace}
              options={municipalityNames}
              placeholder={t.heroWherePlaceholder}
              className={`w-full ${field}`}
            />
          </div>
          <button
            type="button"
            onClick={() => addPlace(placeDraft)}
            className="rounded-lg border border-line px-3 py-2 text-[14px] font-medium transition-colors hover:bg-sunk"
          >
            {t.profileAdd}
          </button>
        </div>
        {chosenPlaces.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {chosenPlaces.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "municipalities",
                      (profile.municipalities ?? []).filter((id) => id !== m.id),
                    )
                  }
                  aria-label={`${t.profileRemove}: ${m.label}`}
                  className="flex items-center gap-1.5 rounded-md bg-brand-wash px-2.5 py-1 text-[13px] text-brand transition-colors hover:bg-urgent-wash hover:text-urgent"
                >
                  {m.label}
                  <span aria-hidden="true" className="text-[15px] leading-none">
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="ar" className="block font-display text-[15px] font-semibold">
          {t.profileYears}
        </label>
        <select
          id="ar"
          value={profile.years ?? ""}
          onChange={(e) => set("years", e.target.value === "" ? undefined : Number(e.target.value))}
          className={`mt-2 ${field}`}
        >
          <option value="">—</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y === 0 ? (locale === "sv" ? "Ingen än" : "None yet") : `${y}+`}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="font-display text-[15px] font-semibold">{t.profileEmployment}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((type) => {
            const active = (profile.employment ?? []).includes(type);
            const labels: Record<EmploymentType, string> = {
              "full-time": t.jobFullTime,
              "part-time": t.jobPartTime,
              contract: locale === "sv" ? "Tidsbegränsat" : "Fixed-term",
              internship: locale === "sv" ? "Praktik" : "Internship",
            };
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const current = profile.employment ?? [];
                  set(
                    "employment",
                    active ? current.filter((v) => v !== type) : [...current, type],
                  );
                }}
                className={`rounded-full border px-3.5 py-1.5 text-[14px] transition-colors ${
                  active
                    ? "border-brand bg-brand-wash text-brand"
                    : "border-line text-ink-soft hover:bg-sunk"
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="border-t border-line pt-6">
        {!showMore ? (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="text-[14.5px] font-medium text-brand hover:underline"
          >
            + {t.profileMore}
          </button>
        ) : (
          <div className="flex flex-col gap-7">
            <p className="text-[13px] text-ink-mute">{t.profileMoreHelp}</p>

            <ChipInput
              id="kunskaper"
              label={t.profileSkills}
              help={t.profileSkillsHelp}
              placeholder={locale === "sv" ? "Excel, B-körkort, spanska …" : "Excel, driving licence, Spanish …"}
              values={profile.skills ?? []}
              onChange={(next) => set("skills", next)}
              addLabel={t.profileAdd}
              removeLabel={t.profileRemove}
              suggest="skill"
            />

            <div>
              <label htmlFor="lon" className="block font-display text-[15px] font-semibold">
                {t.profileSalary}
              </label>
              <p className="mt-0.5 text-[13px] text-ink-mute">{t.profileSalaryHelp}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="lon"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={profile.salaryMin ?? ""}
                  onChange={(e) =>
                    set("salaryMin", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className={`w-40 tnum ${field}`}
                />
                <span className="text-[14px] text-ink-mute">{t.salaryPerMonth}</span>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-[15px]">
              <input
                type="checkbox"
                checked={profile.remote === true}
                onChange={(e) => set("remote", e.target.checked ? true : undefined)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              {t.profileRemote}
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-3 font-display text-[15px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
        >
          {t.profileSave}
        </button>
        <span className="tnum text-[13px] text-ink-mute">
          {fill(t.profileComplete, { percent })}
        </span>
        <button
          type="button"
          onClick={clear}
          className="ml-auto text-[13px] text-ink-mute hover:text-urgent hover:underline"
        >
          {t.profileClear}
        </button>
      </div>
    </form>
  );
}
