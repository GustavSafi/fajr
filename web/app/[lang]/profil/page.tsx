import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { MUNICIPALITIES } from "@/lib/jobtech/places";
import { PROFILE_COOKIE, parseProfileCookie } from "@/lib/matching/profile";
import { ProfileForm } from "@/components/profile-form";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "sv";
  const t = getDictionary(locale);
  // Profilsidan har inget att erbjuda Google — den är ett formulär.
  return { title: t.profileTitle, robots: { index: false, follow: true } };
}

export default async function ProfilePage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  const store = await cookies();
  const profile = parseProfileCookie(store.get(PROFILE_COOKIE)?.value);

  // Bara id och namn till klienten — resten av taxonomin behövs inte där.
  const municipalities = MUNICIPALITIES.map((m) => ({ id: m.id, label: m.label }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-[28px] leading-tight sm:text-[32px]">{t.profileTitle}</h1>
      <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-ink-soft">
        {t.profileLead}
      </p>

      <div className="mt-9">
        <ProfileForm locale={lang} initial={profile} municipalities={municipalities} />
      </div>
    </div>
  );
}
