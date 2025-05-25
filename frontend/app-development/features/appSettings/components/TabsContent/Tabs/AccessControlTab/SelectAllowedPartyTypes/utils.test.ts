import {
  initialPartyTypes,
  partyTypesAllowedMap,
  getPartyTypesAllowedOptions,
  getSelectedPartyTypes,
  mapSelectedValuesToPartyTypesAllowed,
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
        'app_settings.access_control_tab_option_bankruptcy_estate',
      );
      expect(partyTypesAllowedMap.organisation).toBe(
        'app_settings.access_control_tab_option_organisation',
      );
      expect(partyTypesAllowedMap.person).toBe('app_settings.access_control_tab_option_person');
      expect(partyTypesAllowedMap.subUnit).toBe('app_settings.access_control_tab_option_sub_unit');
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

  describe('mapSelectedValuesToPartyTypesAllowed', () => {
    it('should return all values set to false when no values are selected', () => {
      const selectedValues: string[] = [];
      const result = mapSelectedValuesToPartyTypesAllowed(selectedValues);
      expect(result).toEqual({
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: false,
      });
    });

    it('should return correct values when some values are selected', () => {
      const selectedValues: string[] = ['person', 'subUnit'];
      const result = mapSelectedValuesToPartyTypesAllowed(selectedValues);
      expect(result).toEqual({
        person: true,
        organisation: false,
        subUnit: true,
        bankruptcyEstate: false,
      });
    });

    it('should return all values set to true when all values are selected', () => {
      const selectedValues: string[] = ['person', 'organisation', 'subUnit', 'bankruptcyEstate'];
      const result = mapSelectedValuesToPartyTypesAllowed(selectedValues);
      expect(result).toEqual({
        person: true,
        organisation: true,
        subUnit: true,
        bankruptcyEstate: true,
      });
    });

    it('should return all values set to false when selectedValues contains invalid keys', () => {
      const selectedValues: string[] = ['invalidKey1', 'invalidKey2'];
      const result = mapSelectedValuesToPartyTypesAllowed(selectedValues);
      expect(result).toEqual({
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: false,
      });
    });

    it('should ignore invalid keys and map only valid keys', () => {
      const selectedValues: string[] = ['person', 'invalidKey', 'subUnit'];
      const result = mapSelectedValuesToPartyTypesAllowed(selectedValues);
      expect(result).toEqual({
        person: true,
        organisation: false,
        subUnit: true,
        bankruptcyEstate: false,
      });
    });
  });
});
