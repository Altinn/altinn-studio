import {
  backendCodeListsToLibraryCodeLists,
  libraryCodeListsToUpdatePayload,
  textResourcesWithLanguageToLibraryTextResources,
  textResourceWithLanguageToMutationArgs,
} from './utils';
import type {
  TextResource,
  TextResources,
  TextResourceWithLanguage,
  CodeListData,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import {
  sharedResourcesResponse,
  sharedResourcesResponseWithProblem,
  sharedResourcesResponseWithInvalidFormat,
} from './test-data/sharedResourcesResponse';
import { codeLists } from './test-data/codeLists';
import type { UpdateSharedResourcesRequest } from 'app-shared/types/api/UpdateSharedResourcesRequest';

describe('utils', () => {
  describe('textResourceWithLanguageToMutationArgs', () => {
    it('Converts text resource with language to mutation args', () => {
      const language = 'nb';
      const textResource: TextResource = {
        id: 'some-id',
        value: 'Some value',
      };
      const textResourceWithLanguage: TextResourceWithLanguage = {
        language,
        textResource,
      };
      const expectedResult: UpdateOrgTextResourcesMutationArgs = {
        language,
        payload: { 'some-id': 'Some value' },
      };
      const result = textResourceWithLanguageToMutationArgs(textResourceWithLanguage);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('textResourcesWithLanguageToLibraryTextResources', () => {
    it('Converts text resources with language to library text resources', () => {
      const textResource1: ITextResource = { id: 'some-id-1', value: 'Some value 1' };
      const textResource2: ITextResource = { id: 'some-id-2', value: 'Some value 2' };
      const textResources: ITextResource[] = [textResource1, textResource2];
      const textResourcesWithLanguage: ITextResourcesWithLanguage = {
        language: 'nb',
        resources: textResources,
      };
      const expectedResult: TextResources = { nb: textResources };
      const result = textResourcesWithLanguageToLibraryTextResources(textResourcesWithLanguage);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('backendCodeListsToLibraryCodeLists', () => {
    it('Converts backend code lists to library code lists', () => {
      const result = backendCodeListsToLibraryCodeLists(sharedResourcesResponse);
      const expectedResult: CodeListData[] = [
        { name: 'animals', codes: codeLists.animals },
        { name: 'vehicles', codes: codeLists.vehicles },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('Returns empty array for code lists with problems', () => {
      const result = backendCodeListsToLibraryCodeLists(sharedResourcesResponseWithProblem);
      const expectedResult: CodeListData[] = [
        { name: 'animals', codes: codeLists.animals },
        { name: 'vehicles', codes: [] },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('Returns empty array for invalid code list format', () => {
      const result = backendCodeListsToLibraryCodeLists(sharedResourcesResponseWithInvalidFormat);
      const expectedResult: CodeListData[] = [
        { name: 'animals', codes: codeLists.animals },
        { name: 'invalid', codes: [] },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('Returns empty array when response is undefined', () => {
      const result = backendCodeListsToLibraryCodeLists(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('libraryCodeListsToUpdatePayload', () => {
    it('Converts library code lists to update payload', () => {
      const updatedCodeLists: CodeListData[] = [
        { name: 'animals', codes: codeLists.animals },
        { name: 'vehicles', codes: codeLists.vehicles },
      ];
      const commitMessage = 'Lorem ipsum';
      const result = libraryCodeListsToUpdatePayload(
        sharedResourcesResponse,
        updatedCodeLists,
        commitMessage,
      );
      const expectedResult: UpdateSharedResourcesRequest = {
        files: [
          {
            path: 'CodeLists/animals.json',
            content: JSON.stringify({ codes: codeLists.animals }, null, 2),
          },
          {
            path: 'CodeLists/vehicles.json',
            content: JSON.stringify({ codes: codeLists.vehicles }, null, 2),
          },
        ],
        baseCommitSha: sharedResourcesResponse.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Marks deleted code lists with empty content', () => {
      const updatedCodeLists: CodeListData[] = [{ name: 'animals', codes: codeLists.animals }];
      const commitMessage = 'Lorem ipsum';
      const result = libraryCodeListsToUpdatePayload(
        sharedResourcesResponse,
        updatedCodeLists,
        commitMessage,
      );
      const expectedResult: UpdateSharedResourcesRequest = {
        files: [
          {
            path: 'CodeLists/animals.json',
            content: JSON.stringify({ codes: codeLists.animals }, null, 2),
          },
          { path: 'CodeLists/vehicles.json', content: '' },
        ],
        baseCommitSha: sharedResourcesResponse.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Ignores code lists with problems in the original data', () => {
      const updatedCodeLists: CodeListData[] = [{ name: 'animals', codes: codeLists.animals }];
      const commitMessage = 'Lorem ipsum';
      const result = libraryCodeListsToUpdatePayload(
        sharedResourcesResponseWithProblem,
        updatedCodeLists,
        commitMessage,
      );
      const expectedResult: UpdateSharedResourcesRequest = {
        files: [
          {
            path: 'CodeLists/animals.json',
            content: JSON.stringify({ codes: codeLists.animals }, null, 2),
          },
        ],
        baseCommitSha: sharedResourcesResponseWithProblem.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Throws error when current data is undefined', () => {
      const updatedCodeLists: CodeListData[] = [{ name: 'animals', codes: codeLists.animals }];
      const commitMessage = 'Lorem ipsum';
      expect(() =>
        libraryCodeListsToUpdatePayload(undefined, updatedCodeLists, commitMessage),
      ).toThrow('Current data is required to create update payload');
    });
  });
});
