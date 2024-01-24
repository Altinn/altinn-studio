import type { PartyTypesAllowed, AllowedPartyTypes } from 'app-shared/types/ApplicationMetadata';

/**
 * PartyTypesAllowed where all values are set to false
 */
export const initialPartyTypes: PartyTypesAllowed = {
  bankruptcyEstate: false,
  organisation: false,
  person: false,
  subUnit: false,
};

/**
 * Map to handle the different text to display in the checkboxes
 */
export const partyTypesAllowedMap: Record<AllowedPartyTypes, string> = {
  bankruptcyEstate: 'settings_modal.access_control_tab_option_bankruptcy_estate',
  organisation: 'settings_modal.access_control_tab_option_organisation',
  person: 'settings_modal.access_control_tab_option_person',
  subUnit: 'settings_modal.access_control_tab_option_sub_unit',
};

/**
 * Maps the party types allowed map to objects of value and label
 * @returns
 */
export const getPartyTypesAllowedOptions = () => {
  return Object.keys(partyTypesAllowedMap).map((key) => ({
    value: key,
    label: partyTypesAllowedMap[key],
  }));
};
