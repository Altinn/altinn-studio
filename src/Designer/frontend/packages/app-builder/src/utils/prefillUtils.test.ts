import { describe, expect, it } from 'vitest';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import { getAvailableRegisterFields, getPrefill, setPrefill } from './prefillUtils';

describe('prefill', () => {
  it('finds the register field that prefills a data model field', () => {
    const config = { [PrefillSource.DSF]: { FirstName: 'fornavn' } };
    expect(getPrefill(config, 'fornavn')).toEqual({
      source: PrefillSource.DSF,
      registerField: 'FirstName',
    });
    expect(getPrefill(config, 'etternavn')).toBeUndefined();
  });

  it('moves the field to another register and keeps the other fields', () => {
    const config = { [PrefillSource.DSF]: { FirstName: 'fornavn', LastName: 'etternavn' } };
    const updated = setPrefill(config, 'fornavn', {
      source: PrefillSource.UserProfile,
      registerField: 'Email',
    });
    expect(updated).toEqual({
      [PrefillSource.DSF]: { LastName: 'etternavn' },
      [PrefillSource.UserProfile]: { Email: 'fornavn' },
    });
  });

  it('removes the prefill', () => {
    const config = { allowOverwrite: true, [PrefillSource.ER]: { Name: 'navn' } };
    expect(setPrefill(config, 'navn', undefined)).toEqual({
      allowOverwrite: true,
      [PrefillSource.ER]: {},
    });
  });
});

describe('getAvailableRegisterFields', () => {
  it('leaves out register fields that fill in another field, but keeps the field own', () => {
    const config = { [PrefillSource.DSF]: { Name: 'navn', SSN: 'fodselsnummer' } };
    const available = getAvailableRegisterFields(config, PrefillSource.DSF, 'navn');
    expect(available).toContain('Name');
    expect(available).not.toContain('SSN');
  });
});
