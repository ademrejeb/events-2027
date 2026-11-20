import Layout from "@/components/Layout";

export default function Privacy() {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
          Politique de confidentialité
        </h1>
        <div className="prose prose-zinc mt-6 max-w-none space-y-5 text-zinc-600">
          <p>
            Yed Lkhir — يد الخير collecte le minimum de données nécessaires au bon
            fonctionnement de la plateforme solidaire.
          </p>
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">
              Participation sans compte
            </h2>
            <p>
              Pour participer à une action, vous fournissez votre nom, votre
              téléphone, votre e-mail et éventuellement vos compétences. Ces
              informations sont transmises uniquement à l&rsquo;organisation
              responsable de l&rsquo;action, afin de coordonner votre participation.
              Elles ne sont jamais affichées publiquement.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">
              Comptes organisateurs
            </h2>
            <p>
              Les comptes organisateurs sont soumis à vérification manuelle. Les
              informations transmises lors de la candidature servent à vérifier votre
              légitimité.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">Sécurité</h2>
            <p>
              Les mots de passe sont gérés par notre fournisseur d&rsquo;authentification
              (Supabase) et ne sont jamais stockés en clair. L&rsquo;accès aux données
              est contrôlé côté serveur.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">
              Vos droits
            </h2>
            <p>
              Vous pouvez demander la modification ou la suppression de vos données en
              écrivant à contact@yedlkhir.tn.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
