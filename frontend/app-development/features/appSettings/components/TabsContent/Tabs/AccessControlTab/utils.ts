import type { AllowedPartyTypes, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';

export const initialPartyTypes: PartyTypesAllowed = {
  bankruptcyEstate: false,
  organisation: false,
  person: false,
  subUnit: false,
};

export const partyTypesAllowedMap: Record<AllowedPartyTypes, string> = {
  person: 'settings_modal.access_control_tab_option_person',
  organisation: 'settings_modal.access_control_tab_option_organisation',
  subUnit: 'settings_modal.access_control_tab_option_sub_unit',
  bankruptcyEstate: 'settings_modal.access_control_tab_option_bankruptcy_estate',
};

export function getPartyTypesAllowedOptions() {
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
