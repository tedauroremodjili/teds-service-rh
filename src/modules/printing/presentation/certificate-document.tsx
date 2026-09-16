import type { TrainingLevel } from "@/modules/trainings/domain/training";
import { TRAINING_LEVEL_LABELS } from "@/modules/trainings/presentation/training-badges";
import { formatDate, formatNumber, humanizeEnum } from "@/shared/lib/format";

import type { PrintableDocument } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";
import type { CertificateData } from "../infrastructure/print-queries";

import { DocumentFooter, Letterhead, PrintSheet, SignatureRow } from "./sheet";

/**
 * Certificat de formation.
 *
 * Piece d'apparat : centree, aeree, encadree — elle est destinee a etre
 * affichee, pas classee. D'ou une composition differente des autres documents,
 * qui eux servent la comptabilite.
 *
 * Le code de verification est imprime en clair : c'est ce qui permet a un
 * employeur de verifier le certificat aupres de l'etablissement, et c'est ce
 * qui rend un faux difficile a fabriquer.
 */
export function CertificateDocument({
  data,
  company,
  printable,
  editedBy,
}: {
  data: CertificateData;
  company: CompanyIdentity;
  printable: PrintableDocument;
  editedBy: string | null;
}) {
  const periode = periodeDeFormation(data.training.startDate, data.training.endDate);

  return (
    <PrintSheet>
      {/* Double filet : le liseré d'un diplome, obtenu sans image de fond —
          une bordure s'imprime toujours, une image de fond pas forcement.
          265 mm : la hauteur utile d'une A4 portrait une fois les marges
          deduites (269 mm), avec la marge de securite qui evite qu'un pixel
          d'arrondi ne renvoie le bas du cadre sur une seconde feuille. */}
      <div className="flex min-h-[265mm] flex-col border-4 border-double border-primary-900 p-6">
        <Letterhead company={company} />

        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-accent-600">
            {company.name}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-wide text-primary-900">
            {printable.title}
          </h1>
          <div className="mt-2 h-0.5 w-32 bg-accent-500" />

          <p className="mt-8 text-sm text-surface-700">
            Il est certifié que
          </p>
          <p className="mt-2 text-2xl font-bold text-surface-900">{data.student.fullName}</p>
          <p className="mt-1 text-[0.72rem] text-surface-500">
            Matricule {data.student.matricule}
            {data.student.birthDate ? ` — né(e) le ${formatDate(data.student.birthDate)}` : ""}
          </p>

          <p className="mt-6 max-w-[140mm] text-sm leading-relaxed text-surface-700">
            a suivi avec succès la formation
          </p>
          <p className="mt-2 max-w-[150mm] text-xl font-bold text-primary-800">
            {data.training.title}
          </p>
          <p className="mt-2 max-w-[140mm] text-[0.78rem] leading-relaxed text-surface-600">
            d&apos;une durée de {formatNumber(data.training.durationHours)} heures, de niveau{" "}
            {(
              TRAINING_LEVEL_LABELS[data.training.level as TrainingLevel] ??
              humanizeEnum(data.training.level)
            ).toLowerCase()}
            {periode ? `, ${periode}` : ""}.
          </p>

          {data.finalGrade !== null ? (
            <p className="mt-4 rounded border border-primary-300 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-900">
              Note finale : {formatNumber(data.finalGrade)} / 20
              {data.mention ? ` — mention ${data.mention}` : ""}
            </p>
          ) : data.mention ? (
            <p className="mt-4 rounded border border-primary-300 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-900">
              Mention {data.mention}
            </p>
          ) : null}

          <p className="mt-8 text-[0.78rem] text-surface-700">
            Fait à {villeDe(company.address)}, le {formatDate(data.issuedAt)}.
          </p>
        </div>

        <SignatureRow
          className="mt-4"
          signatures={[
            { role: "Le formateur", name: data.training.trainer, hint: "Signature" },
            { role: "La direction", hint: "Cachet et signature" },
          ]}
        />

        <div className="mt-6 flex items-end justify-between gap-6 border-t border-surface-300 pt-2 text-[0.62rem] text-surface-500">
          <p>
            Certificat n° <span className="font-mono font-semibold">{data.reference}</span> —
            formation {data.training.code}
          </p>
          <p>
            Code de vérification :{" "}
            <span className="font-mono font-semibold tracking-widest text-surface-800">
              {data.verificationCode}
            </span>
          </p>
        </div>

        <DocumentFooter note={printable.footnote} editedBy={editedBy} editedAt={new Date()} />
      </div>
    </PrintSheet>
  );
}

/** « du 3 mars au 12 juin 2026 », ou rien si les dates manquent. */
function periodeDeFormation(debut: string | null, fin: string | null): string | null {
  if (debut && fin) return `dispensée du ${formatDate(debut)} au ${formatDate(fin)}`;
  if (debut) return `débutée le ${formatDate(debut)}`;
  if (fin) return `achevée le ${formatDate(fin)}`;
  return null;
}

/**
 * Ville d'emission, extraite de l'adresse des parametres.
 * L'adresse est saisie en texte libre (« Brazzaville, République du Congo ») :
 * on en garde le premier segment, qui en est la ville dans tous les usages.
 */
function villeDe(adresse: string | null): string {
  if (!adresse) return "Brazzaville";
  return adresse.split(",")[0].trim() || "Brazzaville";
}
