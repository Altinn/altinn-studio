import { type SigneeState } from 'src/layout/SigneeList/api';

export type CurrentUserStatus = 'awaitingSignature' | 'signed' | 'notSigning';

/**
 * Calculates the current user's signing status based on the signees they can sign for.
 * @param currentUserPartyId - The party ID of the current user.
 * @param userSignees - The list of signees the user can sign for.
 * @param canSign - Indicates if the user has permission to sign.
 * @returns
 */
export function getCurrentUserStatus(
  currentUserPartyId: number | undefined,
  userSignees: SigneeState[],
  canSign: boolean,
): CurrentUserStatus {
  if (!canSign) {
    return 'notSigning';
  }

  const hasUnsignedSignees = userSignees.some((signee) => !signee.hasSigned);
  if (hasUnsignedSignees) {
    return 'awaitingSignature';
  }

  // If the current user is not listed as a signee, but they have sign permission, they should still be able to sign
  const currentUserIsInList = userSignees.some((signee) => signee.partyId === currentUserPartyId);

  if (!currentUserIsInList) {
    return 'awaitingSignature';
  }

  // If all signees have signed
  return 'signed';
}
