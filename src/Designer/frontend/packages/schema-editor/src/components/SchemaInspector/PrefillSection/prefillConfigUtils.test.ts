import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import {
  findPrefillMapping,
  removePrefillMapping,
  renamePrefillMappings,
  setPrefillMapping,
} from './prefillConfigUtils';

describe('prefillConfigUtils', () => {
  describe('findPrefillMapping', () => {
    it('Returns undefined when there is no mapping for the given field', () => {
      expect(findPrefillMapping({}, 'someField')).toBeUndefined();
    });

    it('Finds the source and key mapped to the given field', () => {
      const config: PrefillConfig = { ER: { OrgNumber: 'someField' } };
      expect(findPrefillMapping(config, 'someField')).toEqual({
        source: PrefillSource.ER,
        key: 'OrgNumber',
      });
    });

    it('Finds a mapping under QueryParameters', () => {
      const config: PrefillConfig = { QueryParameters: { caseId: 'someField' } };
      expect(findPrefillMapping(config, 'someField')).toEqual({
        source: PrefillSource.QueryParameters,
        key: 'caseId',
      });
    });
  });

  describe('removePrefillMapping', () => {
    it('Removes the mapping for the given field and drops the source entirely if it becomes empty', () => {
      const config: PrefillConfig = { ER: { OrgNumber: 'someField' } };
      expect(removePrefillMapping(config, 'someField')).toEqual({});
    });

    it('Keeps other mappings under the same source', () => {
      const config: PrefillConfig = { ER: { OrgNumber: 'someField', Name: 'otherField' } };
      expect(removePrefillMapping(config, 'someField')).toEqual({ ER: { Name: 'otherField' } });
    });

    it('Returns the config unchanged when there is no mapping for the given field', () => {
      const config: PrefillConfig = { ER: { Name: 'otherField' } };
      expect(removePrefillMapping(config, 'someField')).toEqual(config);
    });
  });

  describe('setPrefillMapping', () => {
    it('Adds a new mapping', () => {
      expect(setPrefillMapping({}, 'someField', PrefillSource.ER, 'OrgNumber')).toEqual({
        ER: { OrgNumber: 'someField' },
      });
    });

    it('Replaces an existing mapping for the same field under a different source', () => {
      const config: PrefillConfig = { ER: { OrgNumber: 'someField' } };
      expect(setPrefillMapping(config, 'someField', PrefillSource.DSF, 'SSN')).toEqual({
        DSF: { SSN: 'someField' },
      });
    });

    it('Preserves unrelated mappings', () => {
      const config: PrefillConfig = { ER: { Name: 'otherField' } };
      expect(setPrefillMapping(config, 'someField', PrefillSource.DSF, 'SSN')).toEqual({
        ER: { Name: 'otherField' },
        DSF: { SSN: 'someField' },
      });
    });
  });

  describe('renamePrefillMappings', () => {
    it('Renames a mapping that points exactly to the renamed field', () => {
      const config: PrefillConfig = { ER: { OrgNumber: 'Foretak.OrgNr' } };
      expect(renamePrefillMappings(config, 'Foretak.OrgNr', 'Firma.OrgNr')).toEqual({
        ER: { OrgNumber: 'Firma.OrgNr' },
      });
    });

    it('Renames mappings that point to a descendant of the renamed field', () => {
      const config: PrefillConfig = {
        ER: { OrgNumber: 'Foretak.OrgNr' },
        DSF: { Name: 'Foretak.Navn' },
      };
      expect(renamePrefillMappings(config, 'Foretak', 'Firma')).toEqual({
        ER: { OrgNumber: 'Firma.OrgNr' },
        DSF: { Name: 'Firma.Navn' },
      });
    });

    it('Does not rename mappings for unrelated fields with a shared prefix', () => {
      const config: PrefillConfig = { ER: { Name: 'ForetakNavn.Name' } };
      expect(renamePrefillMappings(config, 'Foretak', 'Firma')).toEqual(config);
    });

    it('Returns the same config reference when nothing needs to be renamed', () => {
      const config: PrefillConfig = { ER: { OrgNumber: 'someField' } };
      expect(renamePrefillMappings(config, 'unrelatedField', 'newName')).toBe(config);
    });

    it('Returns the same config reference when the config is empty', () => {
      const config: PrefillConfig = {};
      expect(renamePrefillMappings(config, 'someField', 'newName')).toBe(config);
    });
  });
});
