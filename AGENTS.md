<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TED'S SERVICE — conventions du projet

Voir [README.md](README.md) pour l'architecture complète. Résumé opérationnel :

## Règles non négociables

1. **La règle des dépendances.** `domain/` n'importe jamais Prisma, Next.js ou
   React. L'infrastructure implémente les ports déclarés par le domaine.
2. **Autorisation au plus près des données.** Toute page appelle
   `requirePermission()` et toute Server Action appelle `authorizeAction()`
   (`src/infrastructure/auth/dal.ts`). `proxy.ts` n'est qu'un filtre optimiste :
   il ne remplace jamais ces appels.
3. **Le rôle est un socle, les droits s'attribuent au compte.** Les permissions
   effectives valent `rôle + accordées − retirées` (`resolvePermissions()` dans
   `modules/auth/domain/permissions.ts`). Le socle du rôle se lit dans
   `role_permissions` (modifiable depuis `/roles`), jamais dans la matrice du
   code — celle-ci n'est que la valeur d'installation du seed. Ne jamais déduire
   un droit du seul rôle : un compte peut en avoir reçu ou perdu un via
   `user_permissions`. Toute nouvelle permission se déclare dans `PERMISSIONS`
   **et** dans `PERMISSION_MODULES`, sinon elle reste invisible dans l'écran
   d'attribution.
   **`RoleName` est du texte**, pas une énumération : les rôles se créent depuis
   l'interface. `SYSTEM_ROLES` ne liste que les 8 rôles fournis — ne jamais
   supposer qu'un rôle en fait partie, et toujours peupler un `<select>` de
   rôles depuis la base.
   **Un code ou un matricule ne se saisit pas** : le champ porte `autoValue`
   (`"reference"` horodatée, `"code"` séquentielle) et arrive pré-rempli.
4. **Les erreurs métier passent par `Result<T>`**, pas par des exceptions. Les
   messages destinés à l'utilisateur sont en français, sans détail technique.
4. **Les montants passent par `Money`** (`src/shared/domain/money.ts`), jamais
   par un `number` nu. Les `Decimal` de Prisma sont convertis en `number` dans
   le repository, avant la frontière serveur/client.
5. **Suppression logique** (`deletedAt`) pour tout ce qui a un historique
   comptable. L'unicité (matricule, email) se vérifie sur **toutes** les fiches,
   archivées comprises — c'est le périmètre de la contrainte SQL.

## Pièges de cette pile

- `params` et `searchParams` sont des **promesses** (`await props.params`).
- `cookies()` et `headers()` sont asynchrones.
- Le fichier est `proxy.ts`, pas `middleware.ts`.
- Prisma 7 : l'URL est dans `prisma.config.ts`, le client exige `@prisma/adapter-pg`.
- Tailwind v4 : le thème est dans `src/app/globals.css`, il n'y a pas de
  `tailwind.config.js`.
- Ne jamais passer un composant (par exemple une icône `lucide-react`) d'un
  composant serveur à un composant client : ce n'est pas sérialisable. Le
  composant client importe l'icône lui-même.

## Deux façons d'ajouter un écran

**1. CRUD sans règle propre → déclarer une ressource.** Ajouter une entrée dans
`src/modules/resources/domain/catalog.ts` suffit : index, fiche, création et
modification sont générés par `src/app/(back-office)/[ressource]/`, avec les
permissions déclarées. Ne jamais recopier une liste ou un formulaire pour ça.
Une ressource ajoutée doit l'être aussi dans `route-permissions.ts` (filtre
optimiste) et dans `navigation.ts` (menu) — le script
`scripts/resources-smoke.ts` vérifie la cohérence.

**2. Règles métier réelles → un module à quatre couches.**
`src/modules/employees/` est le gabarit : un port, un repository Prisma, des
Server Actions qui vérifient les droits et journalisent l'audit. C'est le choix
dès qu'il y a des invariants (unicité, validation croisée, cycle de vie).

Une vue de synthèse (statistiques, échéances) vit sous `/<ressource>/synthese` et
n'écrit rien ; l'index générique y renvoie via `summary: true`.

## Rémunération : le barème, pas le taux

Ce que touche une personne ne se résume pas à un pourcentage. Une animatrice
touche 85 % des paiements des enfants qu'elle encadre, 1 000 F par document
vendu et 5 % sur les prestations — trois règles, trois assiettes.

- **La source de vérité est `RemunerationRule`** (`modules/remuneration/`), une
  ligne par activité, avec sa cible (formation, catégorie, document,
  prestation), son mode (pourcentage ou montant fixe) et sa portée (mes ventes
  ou toute l'activité ciblée). `Employee.commissionRate` est le **modèle
  précédent** : un repli global, à laisser à 0 dès qu'un barème existe.
- **Le décompte se recalcule, il ne se stocke pas.** Rien n'est figé tant que la
  paie du mois n'est pas validée : corriger une règle corrige le montant.
  Salaire versé = salaire de base + somme des lignes du barème.
- **Le barème se saisit à la création** (`BaremeInitial`, empilé côté client et
  envoyé sérialisé) **ou après coup** sur `/employes/<id>/remuneration`. Dans les
  deux cas, la validation est celle du domaine (`validerRegleSansEmploye`) — la
  saisie du navigateur n'est jamais crue sur parole.
- **Poser un barème exige `payroll.calculate`**, pas `employees.create` :
  décider d'un salaire n'est pas créer une fiche. Le contrôle est dans la Server
  Action, masquer la section n'étant qu'un confort.
- À la création, le barème est **validé avant** l'écriture de la fiche : une
  règle fautive ne doit jamais laisser en base un employé à moitié configuré.

## Impression et PDF

Le PDF vient du navigateur (« Imprimer » → « Enregistrer au format PDF ») : il
n'y a **qu'une** mise en page, celle du papier. Ne jamais ajouter Puppeteer ni un
générateur de PDF sans que ce choix soit remis en cause explicitement.

- **Une pièce s'imprime sous `/<ressource>/<id>/impression`**, une liste sous
  `/<ressource>/impression` (mêmes filtres que l'écran, sans la pagination).
  Ces deux pages sont génériques : une ressource ajoutée au catalogue est
  imprimable sans écrire de page.
- **Le gabarit se déclare, il ne se code pas.** Pour donner une pièce officielle
  à une ressource : une entrée dans `modules/printing/domain/printable.ts` et un
  chargeur dans `modules/printing/application/print-use-cases.ts`. À défaut, la
  fiche générique s'imprime — c'est un repli acceptable, pas un échec.
- **Imprimer, c'est lire** : la page d'impression exige la permission `read` de
  la ressource, comme n'importe quelle page (règle 2).
- **Ne jamais mettre en page une pièce à la main.** Les briques A4 sont dans
  `modules/printing/presentation/sheet.tsx` (`PrintSheet`, `Letterhead`,
  `DocumentCartouche`, `PartyBlock`, `TotalsBlock`, `AmountInWords`,
  `SignatureRow`, `DocumentFooter`).
- **Utilitaires CSS** (`src/app/globals.css`) : `no-print`, `print-only`,
  `print-avoid-break`, `print-break-before`, `print-landscape`. Le format A4,
  les marges, la répétition de l'en-tête de tableau et la conservation des
  aplats de la marque y sont déjà réglés — ne pas les redéfinir dans un
  composant.
- **L'identité imprimée vient des paramètres** (`company.*`), jamais du code :
  `getCompanyIdentity()`. Une mention vide ne s'imprime pas.
- **Un montant porté sur une pièce s'écrit aussi en toutes lettres**
  (`montantEnLettres()`, `src/shared/lib/amount-in-words.ts`).
