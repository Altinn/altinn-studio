import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { makeIndexedId } from 'src/features/form/layout/utils/makeIndexedId';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { ILayout } from 'src/layout/layout';

describe('makeIndexedId', () => {
  const layout: ILayout = [
    { id: 'topLevel', type: 'Text', value: 'Hello world' },
    { id: 'inGroup', type: 'Text', value: 'Hello world' },
    { id: 'inGroup2', type: 'Text', value: 'Hello world' },
    { id: 'g1', type: 'Group', children: ['inGroup', 'g2'] },
    { id: 'g2', type: 'Group', children: ['inGroup2'] },
    {
      id: 'rep1',
      type: 'RepeatingGroup',
      children: ['rep1a', 'rep1b', 'rep1c', 'rep1d', 'rep1g'],
      dataModelBindings: {
        group: { dataType: 'default', field: 'RepGroup' },
      },
    },
    { id: 'rep1a', type: 'Text', value: 'Hello world' },
    {
      id: 'rep1b',
      type: 'Input',
      dataModelBindings: { simpleBinding: { dataType: 'default', field: 'RepGroup.Input' } },
    },
    {
      id: 'rep1c',
      type: 'RepeatingGroup',
      children: ['rep1c1', 'rep1c2'],
      dataModelBindings: { group: { dataType: 'default', field: 'RepGroup.NestedRepGroup' } },
    },
    {
      id: 'rep1d',
      type: 'RepeatingGroup',
      children: ['rep1d1', 'rep1d2'],
      dataModelBindings: { group: { dataType: 'default', field: 'RepGroup.OtherNestedRepGroup' } },
    },
    { id: 'rep1d1', type: 'Text', value: 'Hello world' },
    {
      id: 'rep1d2',
      type: 'Input',
      dataModelBindings: { simpleBinding: { dataType: 'default', field: 'RepGroup.OtherNestedRepGroup.Input' } },
    },
    {
      id: 'rep1g',
      type: 'Group',
      children: ['rep1g1', 'rep1g2'],
    },
    { id: 'rep1g1', type: 'Text', value: 'Hello world' },
    {
      id: 'rep1g2',
      type: 'Input',
      dataModelBindings: { simpleBinding: { dataType: 'default', field: 'RepGroup.Group.Input' } },
    },
    { id: 'rep1c1', type: 'Text', value: 'Hello world' },
    {
      id: 'rep1c2',
      type: 'Input',
      dataModelBindings: { simpleBinding: { dataType: 'default', field: 'RepGroup.NestedRepGroup.Input' } },
    },
    {
      id: 'rep2',
      type: 'RepeatingGroup',
      children: ['rep2a', 'rep2b'],
      dataModelBindings: {
        group: { dataType: 'default', field: 'RepGroup' },
      },
    },
    { id: 'rep2a', type: 'Text', value: 'Hello world' },
    {
      id: 'rep2b',
      type: 'Input',
      dataModelBindings: { simpleBinding: { dataType: 'default', field: 'RepGroup.Input' } },
    },
    {
      id: 'rep3',
      type: 'RepeatingGroup',
      children: ['rep3a', 'rep3b'],
      dataModelBindings: {
        group: { dataType: 'default', field: 'OtherRepGroup' },
      },
    },
    { id: 'rep3a', type: 'Text', value: 'Hello world' },
    {
      id: 'rep3b',
      type: 'Input',
      dataModelBindings: { simpleBinding: { dataType: 'default', field: 'OtherRepGroup.Input' } },
    },
  ];

  const lookups = makeLayoutLookups({ Page1: layout });

  it.each([
    { id: 'topLevel', rowIds: [], expected: 'topLevel' },
    { id: 'topLevel', rowIds: [1], expected: 'topLevel' },
    { id: 'topLevel', rowIds: [2], expected: 'topLevel' },
    { id: 'topLevel', rowIds: [1, 2], expected: 'topLevel' },
    { id: 'topLevel', rowIds: [2, 1], expected: 'topLevel' },
    { id: 'inGroup', rowIds: [], expected: 'inGroup' },
    { id: 'inGroup', rowIds: [1], expected: 'inGroup' },
    { id: 'rep1b', rowIds: [], expected: undefined },
    { id: 'rep1b', rowIds: [1], expected: 'rep1b-1' },
    { id: 'rep1b', rowIds: [2], expected: 'rep1b-2' },
    { id: 'rep1b', rowIds: [1, 2], expected: 'rep1b-1' },
    { id: 'rep1b', rowIds: [2, 1], expected: 'rep1b-2' },
    { id: 'rep1d1', rowIds: [], expected: undefined },
    { id: 'rep1d1', rowIds: [1], expected: undefined },
    { id: 'rep1d1', rowIds: [1, 3], expected: undefined },
    { id: 'rep1d2', rowIds: [], expected: undefined },
    { id: 'rep1d2', rowIds: [1], expected: undefined },
    { id: 'rep1d2', rowIds: [1, 3], expected: undefined },
    { id: 'rep1g2', rowIds: [], expected: undefined },
    { id: 'rep1g2', rowIds: [1], expected: 'rep1g2-1' },
    { id: 'rep1g2', rowIds: [1, 1], expected: 'rep1g2-1' },
    { id: 'rep2b', rowIds: [], expected: undefined },
    { id: 'rep2b', rowIds: [5], expected: 'rep2b-5' },
    { id: 'rep2b', rowIds: [5, 6], expected: 'rep2b-5' },
    { id: 'rep3b', rowIds: [], expected: undefined },
    { id: 'rep3b', rowIds: [5], expected: undefined },
    { id: 'rep3b', rowIds: [5, 6], expected: undefined },
  ])('$id => $expected when in $rowIds', ({ id, rowIds, expected }) => {
    if (rowIds.length === 0) {
      expect(makeIndexedId(id, undefined, lookups)).toBe(expected);
    } else if (rowIds.length === 1) {
      const binding: IDataModelReference = { dataType: 'default', field: `RepGroup[${rowIds[0]}].Input` };
      expect(makeIndexedId(id, binding, lookups)).toBe(expected);
    } else if (rowIds.length === 2) {
      const binding: IDataModelReference = {
        dataType: 'default',
        field: `RepGroup[${rowIds[0]}].NestedRepGroup[${rowIds[1]}].Input`,
      };
      expect(makeIndexedId(id, binding, lookups)).toBe(expected);
    } else {
      throw new Error('Invalid rowIds');
    }
  });
});
