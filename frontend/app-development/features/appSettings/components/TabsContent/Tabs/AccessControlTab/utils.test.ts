import {
  initialPartyTypes,
  partyTypesAllowedMap,
  getPartyTypesAllowedOptions,
  getSelectedPartyTypes,
} from './utils';

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
        'settings_modal.access_control_tab_option_bankruptcy_estate',
      );
      expect(partyTypesAllowedMap.organisation).toBe(
        'settings_modal.access_control_tab_option_organisation',
      );
      expect(partyTypesAllowedMap.person).toBe('settings_modal.access_control_tab_option_person');
      expect(partyTypesAllowedMap.subUnit).toBe(
        'settings_modal.access_control_tab_option_sub_unit',
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

  describe('getSelectedPartyTypes', () => {
    it('should return an empty array when no party types are allowed', () => {
      const partyTypesAllowed = {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: false,
      };
      const result = getSelectedPartyTypes(partyTypesAllowed);
      expect(result).toEqual([]);
    });

    it('should return an array with allowed party types', () => {
      const partyTypesAllowed = {
        person: true,
        organisation: false,
        subUnit: true,
        bankruptcyEstate: false,
      };
      const result = getSelectedPartyTypes(partyTypesAllowed);
      expect(result).toEqual(['person', 'subUnit']);
    });

    it('should return all party types when all are allowed', () => {
      const partyTypesAllowed = {
        person: true,
        organisation: true,
        subUnit: true,
        bankruptcyEstate: true,
      };
      const result = getSelectedPartyTypes(partyTypesAllowed);
      expect(result).toEqual(['person', 'organisation', 'subUnit', 'bankruptcyEstate']);
    });

    it('should return an empty array when partyTypesAllowed is empty', () => {
      const partyTypesAllowed = {} as any;
      const result = getSelectedPartyTypes(partyTypesAllowed);
      expect(result).toEqual([]);
    });
  });
});
