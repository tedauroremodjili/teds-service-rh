/**
 * Normalisation des arguments d'une Server Action de formulaire.
 *
 * Une action utilisee avec `useActionState` est declaree
 * `(etatPrecedent, formData)`. C'est bien ce que React envoie une fois la page
 * hydratee.
 *
 * Mais le meme formulaire peut etre soumis AVANT que le JavaScript ne soit
 * charge — reseau lent, script bloque, navigateur ancien. Dans ce cas, la
 * requete part nativement et l'action ne recoit qu'un seul argument : le
 * `FormData`. Sans precaution, `formData.get(...)` porte alors sur `undefined`
 * et la page renvoie une erreur 500 au lieu du formulaire.
 *
 * Cette fonction accepte les deux formes d'appel et laisse la validation
 * habituelle produire un message lisible dans le cas, theorique, ou aucun
 * FormData n'arrive.
 */
export function coerceFormData(first: unknown, second: unknown): FormData {
  if (second instanceof FormData) return second;
  if (first instanceof FormData) return first;
  return new FormData();
}
