import {
  initialPartyTypes,
  partyTypesAllowedMap,
  getPartyTypesAllowedOptions,
} from './accessControlTabUtils';

describe('accessControlTabUtils', () => {
  describe('initialPartyTypes', () => {
    it('should have all values set to false', () => {
      expect(initialPartyTypes.bankruptcyEstate).toBe(false);
      expect(initialPartyTypes.organisation).toBe(false);
      expect(initialPartyTypes.person).toBe(false);
      expect(initialPartyTypes.subUnit).toBe(false);
    });
  });

  describe('partyTypesAllowedMap', () => {
    it('should map keys to text strings', () => {
      expect(partyTypesAllowedMap.bankruptcyEstate).toBe(
        'settings_modal.access_control_tab_option_bankruptcy_estate'
      );
      expect(partyTypesAllowedMap.organisation).toBe(
        'settings_modal.access_control_tab_option_organisation'
      );
      expect(partyTypesAllowedMap.person).toBe('settings_modal.access_control_tab_option_person');
      expect(partyTypesAllowedMap.subUnit).toBe(
        'settings_modal.access_control_tab_option_sub_unit'
      );
    });
  });

  describe('getPartyTypesAllowedOptions', () => {
    it('should have values matching the keys in partyTypesAllowedMap', () => {
      const options = getPartyTypesAllowedOptions();

      options.forEach((option) => {
        expect(Object.keys(partyTypesAllowedMap)).toContain(option.value);
      });
    });

    it('should have labels matching the values in partyTypesAllowedMap', () => {
      const options = getPartyTypesAllowedOptions();

      options.forEach((option) => {
        expect(option.label).toBe(partyTypesAllowedMap[option.value]);
      });
    });
  });
});
