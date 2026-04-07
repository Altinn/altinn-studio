import { describe, expect, it } from '@jest/globals';

import { selectAllPaths } from 'src/features/formData/FormDataWrite';
import type { FormDataContext } from 'src/features/formData/FormDataWriteStateMachine';

const dataType = 'default';

function makeContext(formData?: object): FormDataContext {
  return {
    dataModels: formData
      ? {
          [dataType]: {
            debouncedCurrentData: formData,
          },
        }
      : {},
  } as FormDataContext;
}

describe('selectAllPaths', () => {
  function testSelectAllPaths(field: string, noRepGroup: boolean, formData: object) {
    return selectAllPaths({ dataType, field }, noRepGroup)(makeContext(formData));
  }

  it('returns an empty array when there is no reference', () => {
    expect(selectAllPaths(undefined, false)(makeContext({ person: { name: 'Ada' } }))).toEqual([]);
  });

  it('returns the raw field when noRepGroup is set', () => {
    expect(testSelectAllPaths('person.name', true, {})).toEqual(['person.name']);
  });

  it('finds a path in a regular nested object', () => {
    const formData = {
      person: {
        address: {
          street: 'Karl Johans gate',
        },
      },
    };

    expect(testSelectAllPaths('person.address.street', false, formData)).toEqual(['person.address.street']);
  });

  it('finds all matching paths across repeating groups', () => {
    const formData = {
      person: [{ name: 'Ada' }, { name: 'Bob' }, { name: 'Cleo' }],
    };

    expect(testSelectAllPaths('person.name', false, formData)).toEqual([
      'person[0].name',
      'person[1].name',
      'person[2].name',
    ]);
  });

  it('finds matching paths in nested repeating groups and includes missing values', () => {
    const formData = {
      groups: [
        { members: [{ id: 'a' }, { id: 'b' }] },
        { members: null },
        {},
        { members: [{}, { id: null }, { id: 'c' }] },
      ],
    };

    expect(testSelectAllPaths('groups.members.id', false, formData)).toEqual([
      'groups[0].members[0].id',
      'groups[0].members[1].id',
      'groups[3].members[0].id',
      'groups[3].members[1].id',
      'groups[3].members[2].id',
    ]);
  });

  it('returns an empty array when the data model is missing', () => {
    expect(testSelectAllPaths('person.name', false, {})).toEqual([]);
  });
});
