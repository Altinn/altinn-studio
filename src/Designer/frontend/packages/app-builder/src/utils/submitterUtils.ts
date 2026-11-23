import type { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';

/** Who can submit the form, as the builder offers the choice. */
export type Submitters = 'person' | 'organization' | 'both';

export const submitterChoices: Submitters[] = ['person', 'organization', 'both'];

/**
 * Reads the party types the app allows. No party type allowed means that every type is allowed, so
 * it reads as both, like a mix the builder does not offer.
 */
export function getSubmitters(partyTypes: PartyTypesAllowed | undefined): Submitters {
  const person = Boolean(partyTypes?.person);
  const organization = Boolean(partyTypes?.organisation);
  if (person && !organization) return 'person';
  if (organization && !person) return 'organization';
  return 'both';
}

export function toPartyTypesAllowed(submitters: Submitters): PartyTypesAllowed {
  const person = submitters !== 'organization';
  const organization = submitters !== 'person';
  return { person, organisation: organization, subUnit: organization, bankruptcyEstate: false };
}
