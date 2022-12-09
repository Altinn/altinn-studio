import {
  getOptionLookupKey,
  getOptionLookupKeys,
  removeGroupOptionsByIndex,
  setupSourceOptions,
} from 'src/utils/options';
import type { IFormData } from 'src/features/form/data';
import type { ILayout } from 'src/features/form/layout';
import type { IMapping, IOptions, IOptionSource, IRepeatingGroups } from 'src/types';
import type { IDataSources, ITextResource } from 'src/types/shared';

describe('utils > options', () => {
  describe('getOptionLookupKey', () => {
    it('should return id if no mapping is present', () => {
      const result = getOptionLookupKey({ id: 'mockId' });
      const expected = 'mockId';
      expect(result).toEqual(expected);
    });

    it('should return stringified object consisting of id and mapping if mapping if present', () => {
      const result = getOptionLookupKey({
        id: 'mockId',
        mapping: {
          someDataField: 'someUrlParam',
        },
      });
      const expected = '{"id":"mockId","mapping":{"someDataField":"someUrlParam"}}';
      expect(result).toEqual(expected);
    });
  });

  describe('getOptionLookupKeys', () => {
    it('should return stringified objects where repeating groups are initialized with correct indexes', () => {
      const mapping: IMapping = {
        someTotallyOtherField: 'someOtherUrlParam',
        'someGroup[{0}].someDataField': 'someUrlParam',
      };
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 2,
          dataModelBinding: 'someGroup',
          editIndex: -1,
        },
      };

      const expected = {
        keys: [
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[0].someDataField': 'someUrlParam',
            },
          },
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[1].someDataField': 'someUrlParam',
            },
          },
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[2].someDataField': 'someUrlParam',
            },
          },
        ],
        keyWithIndexIndicator: {
          id: 'mockId',
          mapping: {
            someTotallyOtherField: 'someOtherUrlParam',
            'someGroup[{0}].someDataField': 'someUrlParam',
          },
        },
      };
      const result = getOptionLookupKeys({
        id: 'mockId',
        mapping,
        repeatingGroups,
      });

      expect(result).toEqual(expected);
    });

    it('should return objects where repeating groups are initialized with correct indexes for nested rep groups', () => {
      const mapping: IMapping = {
        someTotallyOtherField: 'someOtherUrlParam',
        'someGroup[{0}].someOtherGroup[{1}].someField': 'someUrlParam',
      };
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 2,
          dataModelBinding: 'someGroup',
          editIndex: -1,
        },
        'someOtherGroup-0': {
          index: 2,
          dataModelBinding: 'someGroup.someOtherGroup',
          editIndex: -1,
        },
      };

      const expected = {
        keys: [
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[0].someOtherGroup[0].someField': 'someUrlParam',
            },
          },
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[0].someOtherGroup[1].someField': 'someUrlParam',
            },
          },
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[0].someOtherGroup[2].someField': 'someUrlParam',
            },
          },
        ],
        keyWithIndexIndicator: {
          id: 'mockId',
          mapping: {
            someTotallyOtherField: 'someOtherUrlParam',
            'someGroup[{0}].someOtherGroup[{1}].someField': 'someUrlParam',
          },
        },
      };
      const result = getOptionLookupKeys({
        id: 'mockId',
        mapping,
        repeatingGroups,
      });

      expect(result).toEqual(expected);
    });

    it('should return objects where repeating groups are initialized with correct indexes for nested rep groups', () => {
      const mapping: IMapping = {
        someTotallyOtherField: 'someOtherUrlParam',
        'someGroup[{0}].someOtherGroup[{1}].someField': 'someUrlParam',
      };
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 0,
          dataModelBinding: 'someGroup',
          editIndex: -1,
        },
        'someOtherGroup-0': {
          index: 0,
          dataModelBinding: 'someGroup.someOtherGroup',
          editIndex: -1,
        },
      };

      const expected = {
        keys: [
          {
            id: 'mockId',
            mapping: {
              someTotallyOtherField: 'someOtherUrlParam',
              'someGroup[0].someOtherGroup[0].someField': 'someUrlParam',
            },
          },
        ],
        keyWithIndexIndicator: {
          id: 'mockId',
          mapping: {
            someTotallyOtherField: 'someOtherUrlParam',
            'someGroup[{0}].someOtherGroup[{1}].someField': 'someUrlParam',
          },
        },
      };
      const result = getOptionLookupKeys({
        id: 'mockId',
        mapping,
        repeatingGroups,
      });

      expect(result).toEqual(expected);
    });
  });

  describe('setupSourceOptions', () => {
    it('should setup correct set of options', () => {
      const source: IOptionSource = {
        group: 'someGroup',
        label: 'dropdown.label',
        value: 'someGroup[{0}].fieldUsedAsValue',
      };
      const relevantTextResource: ITextResource = {
        id: 'dropdown.label',
        value: '{0}',
        unparsedValue: '{0}',
        variables: [
          {
            key: 'someGroup[{0}].fieldUsedAsLabel',
            dataSource: 'dataModel.default',
          },
        ],
      };
      const relevantFormData: IFormData = {
        'someGroup[0].fieldUsedAsValue': 'Value 1',
        'someGroup[0].fieldUsedAsLabel': 'Label 1',
        'someGroup[1].fieldUsedAsValue': 'Value 2',
        'someGroup[1].fieldUsedAsLabel': 'Label 2',
        'someGroup[2].fieldUsedAsValue': 'Value 3',
        'someGroup[2].fieldUsedAsLabel': 'Label 3',
      };
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 2,
          dataModelBinding: 'someGroup',
        },
      };

      const dataSources: IDataSources = {
        dataModel: relevantFormData,
      };

      const options = setupSourceOptions({
        source,
        relevantTextResource,
        relevantFormData,
        repeatingGroups,
        dataSources,
      });

      if (!options) {
        throw new Error('Options not found');
      }

      expect(options.length).toBe(3);

      expect(options[0].label).toBe('Label 1');
      expect(options[0].value).toBe('Value 1');

      expect(options[1].label).toBe('Label 2');
      expect(options[1].value).toBe('Value 2');

      expect(options[2].label).toBe('Label 3');
      expect(options[2].value).toBe('Value 3');
    });
  });

  describe('removeGroupOptionsByIndex', () => {
    it('should delete a given index if options with mapping exists', () => {
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 0,
          dataModelBinding: 'someGroup',
        },
      };
      const options: IOptions = {
        '{"id":"other","mapping":{"someGroup[0].someField":"someParam"}}': {
          mapping: {
            'someGroup[0].someField': 'someParam',
          },
          id: 'some',
          options: [],
        },
        '{"id":"other","mapping":{"someOtherGroup[0].someField":"someParam"}}': {
          mapping: {
            'someOtherGroup[0].someField': 'someParam',
          },
          id: 'other',
          options: [],
        },
      };

      const expected: IOptions = {
        '{"id":"other","mapping":{"someOtherGroup[0].someField":"someParam"}}': {
          mapping: {
            'someOtherGroup[0].someField': 'someParam',
          },
          id: 'other',
          options: [],
        },
      };

      const result = removeGroupOptionsByIndex({
        groupId: 'someGroup',
        index: 0,
        repeatingGroups,
        options,
        layout: [],
      });

      expect(result).toEqual(expected);
    });

    it('should shift mappings if group length is greater than index deleted', () => {
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 1,
          dataModelBinding: 'someGroup',
        },
      };
      const options: IOptions = {
        '{"id":"some","mapping":{"someGroup[0].someField":"someParam"}}': {
          mapping: {
            'someGroup[0].someField': 'someParam',
          },
          id: 'some',
          options: [{ label: 'deleted label', value: 'deleted value' }],
        },
        '{"id":"some","mapping":{"someGroup[1].someField":"someParam"}}': {
          mapping: {
            'someGroup[1].someField': 'someParam',
          },
          id: 'some',
          options: [{ label: 'shifted label', value: 'shifted value' }],
        },
        '{"id":"other","mapping":{"someOtherGroup[0].someField":"someParam"}}': {
          mapping: {
            'someOtherGroup[0].someField': 'someParam',
          },
          id: 'other',
          options: [],
        },
      };

      const expected: IOptions = {
        '{"id":"some","mapping":{"someGroup[0].someField":"someParam"}}': {
          mapping: {
            'someGroup[0].someField': 'someParam',
          },
          id: 'some',
          options: [{ label: 'shifted label', value: 'shifted value' }],
        },
        '{"id":"other","mapping":{"someOtherGroup[0].someField":"someParam"}}': {
          mapping: {
            'someOtherGroup[0].someField': 'someParam',
          },
          id: 'other',
          options: [],
        },
      };

      const result = removeGroupOptionsByIndex({
        groupId: 'someGroup',
        index: 0,
        repeatingGroups,
        options,
        layout: [],
      });

      expect(result).toEqual(expected);
    });

    it('should shift mappings for nested groups if group length is greater than index deleted', () => {
      const layout: ILayout = [
        {
          type: 'Group',
          id: 'someGroup',
          dataModelBindings: {
            group: 'someGroup',
          },
          children: ['someSubGroup'],
        },
      ];
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 0,
          dataModelBinding: 'someGroup',
        },
        'someSubGroup-0': {
          index: 1,
          dataModelBinding: 'someGroup.someSubGroup',
          baseGroupId: 'someSubGroup',
        },
      };
      const options: IOptions = {
        '{"id":"some","mapping":{"someGroup[0].someSubGroup[0].someField":"someParam"}}': {
          mapping: {
            'someGroup[0].someSubGroup[0].someField': 'someParam',
          },
          id: 'some',
          options: [{ label: 'deleted label', value: 'deleted value' }],
        },
        '{"id":"some","mapping":{"someGroup[0].someSubGroup[1].someField":"someParam"}}': {
          mapping: {
            'someGroup[0].someSubGroup[1].someField': 'someParam',
          },
          id: 'some',
          options: [{ label: 'shifted label', value: 'shifted value' }],
        },
        '{"id":"other","mapping":{"someOtherGroup[0].someField":"someParam"}}': {
          mapping: {
            'someOtherGroup[0].someField': 'someParam',
          },
          id: 'other',
          options: [],
        },
      };

      const expected: IOptions = {
        '{"id":"some","mapping":{"someGroup[0].someSubGroup[0].someField":"someParam"}}': {
          mapping: {
            'someGroup[0].someSubGroup[0].someField': 'someParam',
          },
          id: 'some',
          options: [{ label: 'shifted label', value: 'shifted value' }],
        },
        '{"id":"other","mapping":{"someOtherGroup[0].someField":"someParam"}}': {
          mapping: {
            'someOtherGroup[0].someField': 'someParam',
          },
          id: 'other',
          options: [],
        },
      };

      const result = removeGroupOptionsByIndex({
        groupId: 'someSubGroup-0',
        index: 0,
        repeatingGroups,
        options,
        layout,
      });

      expect(result).toEqual(expected);
    });

    it('should leave options that does not have mappings untouched', () => {
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 0,
          dataModelBinding: 'someGroup',
        },
      };
      const options: IOptions = {
        someOption: {
          id: 'some',
          options: [],
        },
        someOtherOption: {
          id: 'other',
          options: [{ label: 'dummy', value: 'value' }],
        },
      };
      const result = removeGroupOptionsByIndex({
        groupId: 'someGroup',
        index: 0,
        repeatingGroups,
        options,
        layout: [],
      });

      expect(result).toEqual(options);
    });
  });
});
