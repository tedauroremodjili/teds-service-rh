# TED'S SERVICE — ERP RH

Application de gestion interne de TED'S SERVICE : ressources humaines, formations,
apprenants, ventes, comptabilité et documents administratifs.

**Pile technique** — Next.js 16 (App Router) · TypeScript · PostgreSQL 17 · Prisma 7 ·
Tailwind CSS v4 · Clean Architecture / DDD

---

## 1. Démarrage

```bash
npm install                # télécharge aussi le Chromium de Puppeteer (~200 Mo, sert au PDF)
cp .env.example .env      # puis renseigner DATABASE_URL et SESSION_SECRET
npm run db:migrate        # crée les tables
npm run db:seed           # rôles, permissions, comptes de démonstration
npm run dev               # http://localhost:3000
```

### Comptes de démonstration

Mot de passe commun : `Teds@2026`

| Email                        | Rôle           |
| ---------------------------- | -------------- |
| admin@tedsservice.cg         | Super administrateur |
| rh@tedsservice.cg            | Responsable RH |
| comptable@tedsservice.cg     | Comptable      |
| commercial@tedsservice.cg    | Commercial     |
| formateur@tedsservice.cg     | Formateur      |
| secretaire@tedsservice.cg    | Secrétaire     |

> Changez ces mots de passe avant toute mise en production.

### Scripts

| Commande               | Rôle                                              |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Serveur de développement                          |
| `npm run build`        | Build de production                               |
| `npm run lint`         | ESLint                                            |
| `npm run db:migrate`   | Crée et applique une migration                    |
| `npm run db:generate`  | Régénère le client Prisma                         |
| `npm run db:studio`    | Explorateur de base de données                    |
| `npm run db:seed`      | (Ré)initialise les données de référence           |

Vérifications manuelles (elles écrivent en base de développement) :

```bash
node --env-file=.env --conditions=react-server --import tsx scripts/auth-smoke.ts
node --env-file=.env --conditions=react-server --import tsx scripts/employees-smoke.ts
```

---

## 2. Architecture

Le code suit le **Domain-Driven Design** : le métier au centre, la technique en
périphérie. Chaque module fonctionnel est découpé en quatre couches.

```
src/
├── app/                  ← ROUTAGE UNIQUEMENT (pages, layouts)
│   ├── (auth)/           ← groupe de routes : connexion (URL sans « auth »)
│   └── (back-office)/    ← groupe de routes : espace protégé
│
├── modules/              ← UN DOSSIER PAR MODULE MÉTIER
│   └── <module>/
│       ├── domain/         règles métier — aucune dépendance technique
│       ├── application/    cas d'usage — orchestration
│       ├── infrastructure/ Prisma, cookies, hachage
│       └── presentation/   Server Actions et composants React
│
├── shared/               ← noyau partagé (Result, Money, composants UI)
└── infrastructure/       ← client Prisma, DAL d'autorisation, audit
```

### La règle des dépendances

```
presentation  →  application  →  domain
       ↘         infrastructure      ↗
```

Tout pointe **vers l'intérieur**. Le `domain` n'importe jamais Prisma, Next.js ou
React ; il se teste sans base de données ni serveur. L'infrastructure implémente
les interfaces (« ports ») déclarées par le domaine, jamais l'inverse.

**Exemple concret** — créer un employé :

1. `app/(back-office)/employes/nouveau/page.tsx` affiche le formulaire.
2. `modules/employees/presentation/actions.ts` reçoit le `FormData` et **vérifie
   la permission**.
3. `modules/employees/application/employee-use-cases.ts` orchestre : validation,
   unicité, enregistrement.
4. `modules/employees/domain/employee.ts` refuse toute fiche incohérente
   (salaire nul, embauche d'un mineur, taux de commission > 100 %).
5. `modules/employees/infrastructure/prisma-employee-repository.ts` écrit en base.

Le module **employees** est la référence : tout module portant ses propres règles
métier suit exactement ce découpage.

### Le moteur de ressources — un seul CRUD pour tout le reste

Les autres tables de l'ERP (contrats, présences, congés, ventes, écritures,
stock…) manipulent des formulaires plats sans règle propre. Les recopier une par
une aurait produit quinze fois la même liste paginée et le même formulaire. Elles
sont donc **déclarées**, pas codées :

```ts
// src/modules/resources/domain/catalog.ts
{
  key: "contrats",              // → /contrats, /contrats/nouveau, /contrats/:id…
  model: "contract",            // délégué Prisma
  permissions: {                // ce que chaque écran exige
    read: P.CONTRACTS_READ,
    create: P.CONTRACTS_MANAGE,
    update: P.CONTRACTS_MANAGE,
    remove: P.CONTRACTS_MANAGE,
  },
  fields: [ /* type métier de chaque champ : money, date, enum, relation… */ ],
  softDelete: false,
  deletable: false,             // pièce comptable : on n'efface pas l'historique
}
```

**Personne n'invente un identifiant.** Un champ déclaré `autoValue` arrive
pré-rempli avec la prochaine valeur libre : `CTR-2026-0007` pour une référence
de pièce, `DEP-0001` pour un code, `APP-0001` pour un matricule d'apprenant. La
valeur reste modifiable — une entreprise qui a déjà sa codification doit pouvoir
la conserver — et l'unicité est vérifiée à l'écriture dans les deux cas.

Le type déclaré d'un champ décide de tout : le contrôle affiché, la validation,
le formatage. Quatre pages génériques
(`src/app/(back-office)/[ressource]/`) servent les 25 ressources — index, fiche,
création, modification — et le segment dynamique ne prend la main que si aucune
route statique ne correspond, si bien que `/employes` et `/utilisateurs` gardent
leurs écrans dédiés.

| Couche | Fichier |
| ------ | ------- |
| Types de champs, validation | `modules/resources/domain/field.ts` |
| Définition, calculs purs | `modules/resources/domain/resource.ts` |
| Règles à état (solde de caisse, stock) | `modules/resources/domain/derivations.ts` |
| Catalogue des 25 ressources | `modules/resources/domain/catalog.ts` |
| Accès Prisma générique | `modules/resources/infrastructure/` |
| Table, filtres, formulaire, actions | `modules/resources/presentation/` |

Ouvrir un module revient à ajouter une entrée au catalogue, une entrée de menu
(`modules/dashboard/domain/navigation.ts`) et une ligne dans
`modules/auth/domain/route-permissions.ts`.

### Impression et PDF

Une seule mise en page sert aux deux usages : le papier et le fichier. Chaque
page d'impression (`/<ressource>/[id]/impression`, etc.) est d'abord un
document HTML/CSS ordinaire, rendu par Next.js comme n'importe quel écran —
c'est ce qui garantit que le PDF ne peut jamais différer de ce qui sort de
l'imprimante.

Deux façons d'obtenir un document, pour deux besoins différents :

| Bouton | Ce qu'il fait | Quand s'en servir |
| ------ | ------------- | ------------------ |
| **Télécharger le PDF** | Appelle `/api/impression/pdf`, qui rejoue la même page dans un Chromium sans affichage côté serveur (Puppeteer) et renvoie directement le fichier | Le cas courant : un PDF A4 propre, identique sur tous les postes, **sans** l'habillage que le navigateur ajoute de son côté (URL, date, numéro de page) — cet habillage est un réglage de la boîte de dialogue d'impression, qu'aucun CSS ni JS d'une page ne peut supprimer depuis le site lui-même |
| **Imprimer** | Ouvre la boîte de dialogue native (`window.print()`) | Impression papier directe |

Le rendu serveur (`modules/printing/infrastructure/pdf-renderer.ts`) réutilise
un navigateur Chromium partagé (mémorisé sur `globalThis`, comme le client
Prisma) et authentifie la page ciblée avec le cookie de session de
l'utilisateur : le contenu produit est donc exactement celui auquel il a
droit, vérifié par le DAL de la page elle-même — cet appel rejoue sa mise en
page, il ne contourne aucun contrôle. La route (`app/api/impression/pdf/`)
n'accepte que des chemins internes correspondant à une page d'impression
(jamais une URL absolue, pour écarter tout risque de SSRF) et refait un
contrôle d'accès en base avant de lancer le navigateur.

Trois niveaux, selon ce qu'on imprime :

| Niveau | Ce qu'on obtient | Comment |
| ------ | ---------------- | ------- |
| **Pièce dédiée** | Document A4 composé : papier à en-tête, cartouche, parties, totaux, somme en toutes lettres, signatures | `/<ressource>/<id>/impression` |
| **État de liste** | La liste filtrée en entier (pas la page courante), critères rappelés, colonnes de montants totalisées | `/<ressource>/impression?<mêmes filtres>` |
| **Page ordinaire** | N'importe quel écran (synthèse, tableau de bord) avec en-tête d'entreprise et ligne d'édition | Bouton 🖨 de la barre supérieure |

Le gabarit est choisi par la ressource, pas par l'URL :

| Ressources | Gabarit |
| ---------- | ------- |
| `salaires` | Bulletin de paie — rubriques, retenues, net en toutes lettres |
| `ventes`, `prestations`, `inscriptions` | Facture — lignes, remises, règlements, tampon « Acquitté » |
| `paiements`, `caisse` | Reçu en **deux exemplaires** (souche + payeur) séparés par un trait de coupe |
| `certificats` | Certificat encadré, avec code de vérification |
| `employes` | Fiche du personnel, état du personnel avec masse salariale |
| *toutes les autres* | Fiche générique — les champs du catalogue, en-tête et signatures comprises |

Une ressource ajoutée au catalogue est donc imprimable le jour même, sans écrire
de page. Lui donner une pièce officielle demande deux ajouts : son gabarit dans
`modules/printing/domain/printable.ts` et son chargeur dans
`modules/printing/application/print-use-cases.ts`.

| Couche | Fichier |
| ------ | ------- |
| Gabarits, plafond de lignes, orientation | `modules/printing/domain/printable.ts` |
| Identité de l'entreprise (parametres `company.*`) | `modules/printing/infrastructure/company-queries.ts` |
| Lectures riches des pièces | `modules/printing/infrastructure/print-queries.ts` |
| Briques de mise en page A4 | `modules/printing/presentation/sheet.tsx` |
| Règles d'impression (`@page`, sauts, répétition d'en-tête) | `src/app/globals.css` |
| Rendu PDF côté serveur (Puppeteer) | `modules/printing/infrastructure/pdf-renderer.ts` |
| Route de téléchargement | `app/api/impression/pdf/route.ts` |

Ce que la feuille de style prend en charge, et qu'on oublie souvent : format A4
et marges (`@page`), passage en paysage au-delà de six colonnes, conservation
des aplats de la marque (`print-color-adjust`), répétition de l'en-tête de
tableau en haut de chaque page, blocs insécables, et neutralisation de la
gouttière de navigation — sans quoi tout le document se décale de cinq
centimètres sur le papier. Utilitaires disponibles : `no-print`, `print-only`,
`print-avoid-break`, `print-break-before`.

Les montants portés sur les pièces sont écrits en toutes lettres
(`shared/lib/amount-in-words.ts`) : c'est la mention qui fait foi en cas de
litige, un chiffre se surchargeant plus facilement qu'une phrase. L'accord de
« vingt » et « cent » y est traité — on écrit « trois cent mille », pas « trois
cents mille ».

### Objets-valeurs

`Money` et `Percentage` (`src/shared/domain/money.ts`) évitent les erreurs de
virgule flottante sur les salaires et rendent le calcul de commission explicite :

```ts
agent.commissionOn(Money.create(300_000).value); // → 30 000 FCFA (taux 10 %)
```

---

## 3. Sécurité

| Mécanisme                       | Emplacement                                        |
| ------------------------------- | -------------------------------------------------- |
| Session signée (JWT, HttpOnly)  | `modules/auth/infrastructure/session-token.ts`     |
| Hachage bcrypt (coût 12)        | `modules/auth/infrastructure/password-hasher.ts`   |
| Verrouillage après 5 échecs     | `modules/auth/domain/credentials.ts`               |
| Matrice RBAC (8 rôles)          | `modules/auth/domain/permissions.ts`               |
| Permissions par utilisateur     | `modules/users/` + table `user_permissions`        |
| Filtrage des routes (optimiste) | `src/proxy.ts`                                     |
| **Contrôle faisant autorité**   | `infrastructure/auth/dal.ts`                       |
| Journal d'audit                 | `infrastructure/auth/audit.ts`                     |

**Deux niveaux de contrôle, et c'est voulu.** `proxy.ts` filtre les navigations
avant tout rendu : c'est du confort et de la performance. Le contrôle qui protège
réellement les données est celui du **DAL**, appelé au début de chaque page et de
chaque Server Action — car une Server Action est joignable par une requête POST
directe, sans jamais passer par l'interface.

Règle à ne jamais enfreindre :

```ts
// Page
const user = await requirePermission(PERMISSIONS.EMPLOYEES_READ);

// Server Action (recharge l'utilisateur depuis la base)
const user = await authorizeAction(PERMISSIONS.EMPLOYEES_CREATE);
```

### Le rôle est un socle, pas une cage

Les droits s'attribuent à **deux échelles**, avec le même écran de cases à
cocher (`modules/auth/presentation/permission-matrix.tsx`) :

| Écran | Portée | Effet |
| ----- | ------ | ----- |
| `/roles/<ROLE>` | le socle du rôle | tous ses titulaires, d'un coup |
| `/utilisateurs/<id>` | un compte précis | lui seul, sans toucher aux autres |

La matrice est **toujours affichée**, grisée quand elle n'est pas modifiable —
lecture seule, propre compte, ou rôle joker (tout coché). Masquer les modules
laisserait croire qu'ils n'existent pas, alors que la question posée à l'écran
est « que détient ce compte ? » : la réponse mérite d'être lue même sans droit
de la changer.

Les rôles se **créent** (`/roles/nouveau`), se renomment et se suppriment. Le
nom saisi produit un identifiant technique stable — « Responsable caisse »
donne `RESPONSABLE_CAISSE` — qui apparaît dans les URL et le journal d'audit et
ne bouge plus ensuite. Les 8 rôles du cahier des charges sont marqués
« système » : leur socle se modifie, mais ils ne se suppriment pas. Un rôle
encore porté par un compte ne se supprime pas non plus.

Les comptes ont eux aussi leur CRUD complet : création, fiche, modification
(`/utilisateurs/<id>/modifier` — email, rattachement, remplacement du mot de
passe) et archivage. **Archivage et non suppression** : l'identifiant du compte
est cité dans le journal d'audit et dans l'historique des ventes ; l'effacer
rendrait ces traces muettes. Le mot de passe ne se lit jamais, il se remplace.

```
droits effectifs = permissions du rôle          (table role_permissions)
                 + permissions accordées à ce compte
                 − permissions retirées à ce compte     (le refus l'emporte)
```

Les deux tables vivent en base : un rôle se modifie depuis l'interface, et la
matrice de `permissions.ts` n'est plus que la valeur d'installation appliquée
par `prisma db seed`. **Relancer le seed réinitialise les socles** ; les
attributions individuelles, elles, ne sont pas touchées.

Pour un compte, seul l'**écart** avec son rôle est stocké (`user_permissions`).
Conséquence voulue : si le rôle COMPTABLE gagne un droit demain, tous les
comptables l'obtiennent, y compris ceux dont la fiche a été personnalisée.

La résolution vit dans le domaine (`resolvePermissions`, `diffFromBase`) ; le
DAL la recalcule **depuis la base** à chaque page et à chaque Server Action, si
bien qu'un droit retiré cesse d'agir dès la page suivante, sans attendre la
reconnexion.

Trois garde-fous, tous destinés à garder le système administrable :

- personne ne modifie ses propres droits, ni le socle de son propre rôle —
  sinon la permission « Attribuer rôles et permissions » suffirait à s'octroyer
  tout le reste ;
- le super administrateur détient le joker `*` : son socle ne s'édite pas, on le
  restreint en changeant son rôle ;
- seul un super administrateur peut en créer ou en nommer un autre.

Chaque attribution laisse une entrée d'audit.

**Ouvrir un accès à quelqu'un** : `/utilisateurs/nouveau` (permission
`users.manage`) crée le compte — email, mot de passe provisoire, rôle de départ,
rattachement facultatif à une fiche employé — puis sa fiche permet d'ajuster
les droits un par un.

### Les informations de l'entreprise

`/parametres` édite l'identité imprimée sur les factures, les reçus et les
certificats : raison sociale, email, téléphone, adresse, site, logo, RCCM, NIU,
plus la monnaie, le taux de TVA et les règles de temps de travail.

Ces valeurs sont stockées en JSON (`settings`) pour rester typées — un taux est
un nombre, pas la chaîne « 18 ». L'écran ne demande donc jamais de saisir du
JSON : chaque réglage est déclaré dans
`modules/settings/domain/catalog.ts` avec son type, et c'est ce type qui décide
du champ affiché et de la validation (email mal formé, taux hors de [0, 100],
URL sans `http://`, heure hors format sont refusés). Une clé ajoutée à la main
en base reste modifiable : elle apparaît en fin d'écran, traitée comme du texte.

L'enregistrement est transactionnel — des paramètres à moitié écrits
laisseraient l'entreprise avec un ancien email et un nouveau téléphone — et les
documents imprimés reprennent les nouvelles valeurs immédiatement.

Vérification bout en bout contre la vraie base :

```bash
node --env-file=.env --import tsx --conditions=react-server scripts/permissions-smoke.ts
```

---

## 4. Particularités de Next.js 16

Cette version diffère des tutoriels antérieurs. Points à connaître :

| Sujet                | Ce qui change                                                         |
| -------------------- | --------------------------------------------------------------------- |
| `middleware.ts`      | Renommé **`proxy.ts`**, fonction exportée `proxy`, runtime Node.js     |
| `params`, `searchParams` | Ce sont des **promesses** : `const { id } = await props.params`    |
| `cookies()`, `headers()` | Asynchrones également                                              |
| Turbopack            | Activé par défaut, sans option `--turbopack`                           |
| `revalidateTag`      | Exige un second argument (`revalidateTag("tag", "max")`)              |
| Tailwind             | v4 : plus de `tailwind.config.js`, tout est dans `globals.css`         |
| Prisma 7             | L'URL vit dans `prisma.config.ts` ; le client exige un *driver adapter* |

La documentation officielle est disponible hors ligne dans
`node_modules/next/dist/docs/`.

---

## 5. Charte graphique

Palette dérivée du logo (`public/logo.jpeg`), déclarée dans
`src/app/globals.css` :

| Rôle                | Couleur   | Classes             |
| ------------------- | --------- | ------------------- |
| Bleu marine « Ted's » | `#123A6B` | `primary-900`       |
| Bleu vif (globe)    | `#2B7CC9` | `primary-600`       |
| Orange « Service »  | `#F07D1A` | `accent-500`        |

Le bleu porte la structure (navigation, titres, actions principales), l'orange
signale ce qui mérite l'attention (montants de commission, mises en avant).
Les composants réutilisables sont dans `src/shared/ui/`.

---

## 6. État d'avancement

| Module                          | État                          |
| ------------------------------- | ----------------------------- |
| 1 — Authentification, RBAC      | ✅ Livré (rôles + droits par utilisateur) |
| 2 — Employés                    | ✅ Livré (module dédié, CRUD complet) |
| 3 à 13, 17 — Contrats → Paramètres | ✅ CRUD livré via le moteur de ressources (25 écrans) + vues de synthèse |
| 15 — Tableau de bord            | ✅ Livré                       |
| 14 — Rapports                   | ✅ Consultation livrée          |
| 16 — Notifications              | ⏳ Schéma prêt, écran à développer |

Chaque module de saisie dispose donc de quatre écrans — liste filtrable, fiche,
création, modification — plus une vue de synthèse quand le pilotage le justifie.
Ce qui reste à écrire au cas par cas, ce sont les **règles métier** propres à
certains modules : lignes de vente, calcul automatique de la paie et des
commissions, génération des factures. Le CRUD, lui, est en place.

Le schéma PostgreSQL couvre **l'intégralité** du cahier des charges : les 35
tables des 17 modules existent déjà.

### Vérifications manuelles

```bash
# Domaine + base : catalogue, cycle CRUD, garde-fous, calculs à état
node --env-file=.env --import tsx --conditions=react-server scripts/resources-smoke.ts

# Permissions attribuées à un utilisateur précis
node --env-file=.env --import tsx --conditions=react-server scripts/permissions-smoke.ts

# Écrans réels (serveur démarré) : rendu et refus d'accès
node --env-file=.env --import tsx --conditions=react-server scripts/pages-smoke.ts

# Impression : gabarits, chargement des pièces, montants en toutes lettres
node --env-file=.env --import tsx --conditions=react-server scripts/printing-smoke.ts
```

### Ajouter un module

1. `src/modules/<nom>/domain/` — entité, objets-valeurs, port du repository
2. `src/modules/<nom>/application/` — cas d'usage
3. `src/modules/<nom>/infrastructure/` — implémentation Prisma du port
4. `src/modules/<nom>/presentation/` — Server Actions et composants
5. `src/app/(back-office)/<url>/` — pages
6. Déclarer les permissions dans `modules/auth/domain/permissions.ts`, la route
   dans `route-permissions.ts` et l'entrée de menu dans
   `modules/dashboard/domain/navigation.ts`
