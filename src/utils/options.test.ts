import { getOptionLookupKey, getOptionLookupKeys, removeGroupOptionsByIndex } from 'src/utils/options';
import type { IMapping } from 'src/layout/common.generated';
import type { ILayout } from 'src/layout/layout';
import type { IOptions, IRepeatingGroups } from 'src/types';

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
