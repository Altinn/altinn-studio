import { PrefillSource } from 'app-shared/types/PrefillConfig';
import type { PrefillConfig, PrefillFieldMap } from 'app-shared/types/PrefillConfig';

/** The registers the builder can prefill from. Query parameters are left to the prefill editor. */
export type RegisterSource = PrefillSource.DSF | PrefillSource.ER | PrefillSource.UserProfile;

export const registerSources: RegisterSource[] = [
  PrefillSource.DSF,
  PrefillSource.ER,
  PrefillSource.UserProfile,
];

/**
 * The register fields the builder offers, chosen for what basic apps ask for. The prefill editor in
 * the data model editor offers all of them.
 */
export const registerFields: Record<RegisterSource, string[]> = {
  [PrefillSource.DSF]: [
    'Name',
    'FirstName',
    'LastName',
    'SSN',
    'AddressStreetName',
    'AddressPostalCode',
    'AddressCity',
    'MailingAddress',
    'MailingPostalCode',
    'MailingPostalCity',
    'TelephoneNumber',
    'MobileNumber',
  ],
  [PrefillSource.ER]: [
    'Name',
    'OrgNumber',
    'BusinessAddress',
    'BusinessPostalCode',
    'BusinessPostalCity',
    'EMailAddress',
    'TelephoneNumber',
  ],
  [PrefillSource.UserProfile]: ['Party.Name', 'Email', 'PhoneNumber'],
};

export type Prefill = {
  source: RegisterSource;
  registerField: string;
};

/** Finds which register field, if any, prefills the data model field. */
export function getPrefill(
  config: PrefillConfig | undefined,
  fieldName: string,
): Prefill | undefined {
  for (const source of registerSources) {
    const fieldMap: PrefillFieldMap = config?.[source] ?? {};
    const registerField = Object.keys(fieldMap).find((key) => fieldMap[key] === fieldName);
    if (registerField) return { source, registerField };
  }
  return undefined;
}

/** Makes the data model field prefilled from the given register field, or from none. */
export function setPrefill(
  config: PrefillConfig | undefined,
  fieldName: string,
  prefill: Prefill | undefined,
): PrefillConfig {
  const updated: PrefillConfig = { ...config };
  registerSources.forEach((source) => {
    const fieldMap = updated[source];
    if (!fieldMap) return;
    updated[source] = Object.fromEntries(
      Object.entries(fieldMap).filter(([, mappedField]) => mappedField !== fieldName),
    );
  });
  if (prefill) {
    updated[prefill.source] = { ...updated[prefill.source], [prefill.registerField]: fieldName };
  }
  return updated;
}

/**
 * The register fields that can prefill the data model field. The prefill file maps each register
 * field to one data model field, so a register field that fills in another field is not offered.
 */
export function getAvailableRegisterFields(
  config: PrefillConfig | undefined,
  source: RegisterSource,
  fieldName: string,
): string[] {
  const fieldMap: PrefillFieldMap = config?.[source] ?? {};
  return registerFields[source].filter(
    (registerField) => !fieldMap[registerField] || fieldMap[registerField] === fieldName,
  );
}
