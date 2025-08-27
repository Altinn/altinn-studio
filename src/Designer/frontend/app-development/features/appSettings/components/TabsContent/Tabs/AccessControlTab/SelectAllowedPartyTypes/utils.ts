import type { AllowedPartyTypes, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';

export const initialPartyTypes: PartyTypesAllowed = {
  bankruptcyEstate: false,
  organisation: false,
  person: false,
  subUnit: false,
};

export const partyTypesAllowedMap: Record<AllowedPartyTypes, string> = {
  person: 'app_settings.access_control_tab_option_person',
  organisation: 'app_settings.access_control_tab_option_organisation',
  subUnit: 'app_settings.access_control_tab_option_sub_unit',
  bankruptcyEstate: 'app_settings.access_control_tab_option_bankruptcy_estate',
};

export function getPartyTypesAllowedOptions(): { value: string; label: string }[] {
  return Object.keys(partyTypesAllowedMap).map((key) => ({
    value: key,
    label: partyTypesAllowedMap[key],
  }));
}

export function getSelectedPartyTypes(partyTypesAllowed: PartyTypesAllowed): AllowedPartyTypes[] {
  return Object.keys(partyTypesAllowed).filter(
    (key) => partyTypesAllowed[key as AllowedPartyTypes],
  ) as AllowedPartyTypes[];
}

export function mapSelectedValuesToPartyTypesAllowed(selectedValues: string[]): PartyTypesAllowed {
  return Object.fromEntries(
    Object.keys(partyTypesAllowedMap).map((key) => [
      key,
      selectedValues.includes(key as AllowedPartyTypes),
    ]),
  ) as PartyTypesAllowed;
}
