/**
 * Normalise une action SUB vers la convention canonique.
 * Gère les deux formats historiques :
 *   - Format live tracker : { pid: SORTANT, inId: ENTRANT }
 *   - Format legacy PBP Editor : { pid: ENTRANT, subOut: SORTANT }
 *
 * Heuristique de détection : si inId existe → format live.
 * Sinon si subOut existe → format legacy PBP Editor.
 */
export function normalizeSub(action: any): { outId: string; inId: string } {
  if (action.inId != null && action.inId !== '') {
    // Format live tracker (majoritaire) : pid = SORTANT, inId = ENTRANT
    return { outId: String(action.pid), inId: String(action.inId) };
  }
  if (action.subOut != null && action.subOut !== '') {
    // Format legacy PBP Editor : pid = ENTRANT, subOut = SORTANT
    return { outId: String(action.subOut), inId: String(action.pid) };
  }
  // Données corrompues : aucun des deux champs n'est renseigné
  return { outId: String(action.pid), inId: '' };
}
