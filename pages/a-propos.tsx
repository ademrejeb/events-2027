import { useState, type FormEvent } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import {
  Alert,
  Button,
  Container,
  FormField,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
} from "@adem.rejeb/ui";

const VALUES = [
  {
    title: "Confiance",
    text: "Chaque organisation est vérifiée manuellement avant de publier ses actions. Les comptes signalés sont suspendus.",
    icon: "M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z",
  },
  {
    title: "Transparence",
    text: "Les dons se font uniquement vers les comptes bancaires officiels des organisations, jamais via la plateforme.",
    icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    title: "Proximité",
    text: "Des actions locales, portées par des associations et des initiatives de quartier, partout en Tunisie.",
    icon: "M12 21s-7-4.35-9.5-8.5C.8 9.7 2 6 5.5 6c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 6 18.2 9.7 16.5 12.5 14 16.65 12 21 12 21z",
  },
];

const FAQ = [
  {
    q: "La participation est-elle gratuite ?",
    a: "Oui. Rejoindre une action ne coûte rien et ne nécessite pas de compte : votre nom, votre téléphone et votre e-mail suffisent pour que l'organisation vous contacte.",
  },
  {
    q: "Comment sont vérifiés les organisateurs ?",
    a: "Chaque candidature est examinée par notre équipe. Une fois approuvée, l'organisation peut publier ses actions et recevoir des bénévoles.",
  },
  {
    q: "Puis-je faire un don via la plateforme ?",
    a: "Non : nous ne collectons aucun paiement. Les dons se font directement auprès de l'organisation, via son RIB officiel affiché sur sa page.",
  },
  {
    q: "Mes données sont-elles publiques ?",
    a: "Non. Vos coordonnées de participation ne sont visibles que par l'organisation concernée. Consultez notre politique de confidentialité pour le détail.",
  },
];

export default function About() {
  const [type, setType] = useState("improvement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setFeedback("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject,
          message,
          contact_email: email || undefined,
          website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setFeedback(data?.error ?? "Envoi impossible. Réessayez plus tard.");
        return;
      }
      setStatus("success");
      setFeedback(data?.message ?? "Merci ! Votre message a bien été transmis.");
      setSubject("");
      setMessage("");
      setEmail("");
    } catch {
      setStatus("error");
      setFeedback("Connexion impossible. Vérifiez votre réseau et réessayez.");
    }
  }

  return (
    <Layout>
      <section className="border-b border-zinc-200 bg-gradient-to-b from-red-50 via-white to-white">
        <Container>
          <div className="mx-auto max-w-3xl py-16 text-center sm:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-semibold text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              À propos de Yed Lkhir
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              La main du bien,{" "}
              <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                à portée de clic
              </span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600">
              Yed Lkhir (يد الخير) est une plateforme tunisienne à but non lucratif qui
              relie les organisations caritatives et les citoyens prêts à donner un peu
              de leur temps. Notre objectif : rendre le bénévolat simple, sûr et local.
            </p>
          </div>
        </Container>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={v.icon} />
                </svg>
              </span>
              <h2 className="mt-5 text-lg font-bold text-zinc-900">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm lg:grid-cols-2 lg:p-10">
          <Stack gap={4}>
            <Text as="h2" weight="bold" size="xl">
              Notre mission
            </Text>
            <Text tone="muted" size="sm">
              En Tunisie, de nombreuses associations accomplissent un travail
              remarquable mais manquent de visibilité et de bras. À l&rsquo;inverse,
              beaucoup de citoyens souhaitent aider sans savoir où ni comment.
            </Text>
            <Text tone="muted" size="sm">
              Yed Lkhir comble ce vide : un annuaire d&rsquo;organisations vérifiées,
              des actions géolocalisées, une inscription en quelques secondes et un
              suivi simple des participants pour les organisateurs.
            </Text>
            <Stack direction="row" gap={3} wrap>
              <Link href="/#evenements">
                <Button variant="primary">Trouver une action</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline">Inscrire mon organisation</Button>
              </Link>
            </Stack>
          </Stack>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { k: "100 %", v: "gratuit, sans commission" },
              { k: "0", v: "paiement collecté sur la plateforme" },
              { k: "Vérifiés", v: "organisateurs approuvés un par un" },
              { k: "Tunisie", v: "actions locales, dans toutes les régions" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 p-5">
                <p className="text-2xl font-extrabold tracking-tight text-red-700">{s.k}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <Text as="h2" weight="bold" size="xl">
          Questions fréquentes
        </Text>
        <div className="mt-5 divide-y divide-zinc-200 rounded-3xl border border-zinc-200 bg-white">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-zinc-900">
                {item.q}
                <span className="text-red-600 transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Stack gap={2}>
            <Text as="h2" weight="bold" size="xl">
              Contact &amp; suggestions
            </Text>
            <Text tone="muted" size="sm">
              Un bug, une amélioration, une donnée à corriger ? Écrivez-nous : votre
              message arrive directement dans le tableau de bord de l&rsquo;équipe.
            </Text>
          </Stack>

          {status === "success" ? (
            <div className="mt-6">
              <Alert variant="success">{feedback}</Alert>
              <Button
                variant="ghost"
                className="mt-3"
                onClick={() => setStatus("idle")}
              >
                Envoyer un autre message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Type de message">
                  <Select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="improvement">Suggestion d&rsquo;amélioration</option>
                    <option value="bug">Signaler un bug</option>
                    <option value="data">Correction de données</option>
                    <option value="other">Autre</option>
                  </Select>
                </FormField>
                <FormField label="Votre e-mail (optionnel)">
                  <Input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.tn"
                  />
                </FormField>
              </div>

              <FormField label="Sujet">
                <Input
                  required
                  minLength={3}
                  maxLength={160}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="En quelques mots"
                />
              </FormField>

              <FormField label="Message">
                <Textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre retour avec le plus de détails possible…"
                />
              </FormField>

              <div className="hidden" aria-hidden="true">
                <label htmlFor="feedback-website">Site web</label>
                <input
                  id="feedback-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {status === "error" && <Alert variant="danger">{feedback}</Alert>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">
                  Votre adresse IP est hachée uniquement pour limiter le spam.
                </p>
                <Button type="submit" variant="primary" disabled={status === "sending"}>
                  {status === "sending" ? "Envoi…" : "Envoyer le message"}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-6 text-xs text-zinc-500">
            Vous pouvez aussi écrire à{" "}
            <a href="mailto:contact@yedlkhir.tn" className="link-underline font-medium text-red-700">
              contact@yedlkhir.tn
            </a>
            . Consultez notre{" "}
            <Link href="/privacy" className="link-underline font-medium text-red-700">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </section>
    </Layout>
  );
}
