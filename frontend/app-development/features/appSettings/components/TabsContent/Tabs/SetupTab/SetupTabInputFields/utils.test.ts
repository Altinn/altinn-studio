import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { onEntryShowKey, updateOnEntryShow } from './utils';

describe('SetupTabInputFields utils', () => {
  describe('updateOnEntryShow', () => {
    it('Enables the onEntry show field when set to true', () => {
      const result = updateOnEntryShow(metadataWithoutOnEntry, true);
      expect(result).toEqual(metadataWithOnEntryShow);
    });

    it('Does not change anything when onEntry was already enabled and it is enabled again', () => {
      const result = updateOnEntryShow(metadataWithOnEntryShowAndInstanceSelection, true);
      expect(result).toEqual(metadataWithOnEntryShowAndInstanceSelection);
    });

    it('Returns application metadata without onEntry when set to false and instanceSelection is not set', () => {
      const result = updateOnEntryShow(metadataWithoutOnEntry, false);
      expect(result).toEqual(metadataWithoutOnEntry);
    });

    it('Returns application metadata without onEntry when set to false and instanceSelection is set', () => {
      const result = updateOnEntryShow(metadataWithOnEntryShowAndInstanceSelection, false);
      expect(result).toEqual(metadataWithoutOnEntry);
    });

    it('Does not change anything when onEntry was already disabled and it is disabled again', () => {
      const result = updateOnEntryShow(metadataWithoutOnEntry, false);
      expect(result).toEqual(metadataWithoutOnEntry);
    });
  });
});

const metadataWithoutOnEntry: ApplicationMetadata = {
  id: 'test',
  org: 'org',
};

const metadataWithOnEntryShow: ApplicationMetadata = {
  ...metadataWithoutOnEntry,
  onEntry: {
    show: onEntryShowKey,
  },
};

const metadataWithOnEntryShowAndInstanceSelection: ApplicationMetadata = {
  ...metadataWithoutOnEntry,
  onEntry: {
    show: onEntryShowKey,
    instanceSelection: {
      sortDirection: 'asc',
      rowsPerPageOptions: [12, 24],
      defaultSelectedOption: 12,
    },
  },
};
