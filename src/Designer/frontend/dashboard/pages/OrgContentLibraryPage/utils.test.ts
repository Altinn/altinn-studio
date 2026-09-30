import {
  backendCodeListsToLibraryCodeLists,
  libraryCodeListDataToBackendCodeListData,
  libraryCodeListsToUpdatePayload,
  textResourcesWithLanguageToLibraryTextResources,
  textResourceWithLanguageToMutationArgs,
} from './utils';
import type {
  TextResource,
  TextResources,
  TextResourceWithLanguage,
  CodeList,
  CodeListData,
  CodeListFile,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import {
  sharedResourcesResponse,
  sharedResourcesResponseWithProblem,
  sharedResourcesResponseWithInvalidFormat,
} from './test-data/sharedResourcesResponse';
import { codeListsUTF8 } from './test-data/codeLists';
import type { UpdateSharedResourcesRequest } from 'app-shared/types/api/UpdateSharedResourcesRequest';
import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';

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
      const { animals, vehicles } = codeListsUTF8;
      const expectedResult: CodeListFile[] = [
        { name: 'animals.json', content: animals },
        { name: 'vehicles.json', content: vehicles },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('Returns problem info for code lists with problems', () => {
      const result = backendCodeListsToLibraryCodeLists(sharedResourcesResponseWithProblem);
      const { animals } = codeListsUTF8;
      const expectedResult: CodeListFile[] = [
        { name: 'animals.json', content: animals },
        { name: 'vehicles.json', problem: expect.objectContaining({ status: expect.anything() }) },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('Accepts invalid code list format', () => {
      const result = backendCodeListsToLibraryCodeLists(sharedResourcesResponseWithInvalidFormat);
      const { animals } = codeListsUTF8;
      const expectedResult: CodeListFile[] = [
        { name: 'animals.json', content: animals },
        { name: 'invalid.json', content: expect.any(String) },
      ];
      expect(result).toEqual(expectedResult);
    });
  });

  describe('libraryCodeListsToUpdatePayload', () => {
    it('Converts library code lists to update payload', () => {
      const updatedCodeLists: CodeListFile[] = [
        { name: 'animals.json', content: codeListsUTF8.animals },
        { name: 'vehicles.json', content: codeListsUTF8.vehicles },
      ];
      const commitMessage = 'Lorem ipsum';
      const data = sharedResourcesResponse;
      const result = libraryCodeListsToUpdatePayload(data, updatedCodeLists, commitMessage);
      const expectedResult: UpdateSharedResourcesRequest = {
        files: [
          {
            path: 'CodeLists/animals.json',
            content: codeListsUTF8.animals,
          },
          {
            path: 'CodeLists/vehicles.json',
            content: codeListsUTF8.vehicles,
          },
        ],
        baseCommitSha: data.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Marks deleted code lists with null as content', () => {
      const { animals } = codeListsUTF8;
      const updatedCodeLists: CodeListFile[] = [{ name: 'animals.json', content: animals }];
      const commitMessage = 'Lorem ipsum';
      const data = sharedResourcesResponse;
      const result = libraryCodeListsToUpdatePayload(data, updatedCodeLists, commitMessage);
      const expectedResult: UpdateSharedResourcesRequest = {
        files: [
          {
            path: 'CodeLists/animals.json',
            content: animals,
          },
          { path: 'CodeLists/vehicles.json', content: null },
        ],
        baseCommitSha: data.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Ignores code lists with problems in the original data', () => {
      const { animals } = codeListsUTF8;
      const updatedCodeLists: CodeListFile[] = [{ name: 'animals.json', content: animals }];
      const commitMessage = 'Lorem ipsum';
      const data = sharedResourcesResponseWithProblem;
      const result = libraryCodeListsToUpdatePayload(data, updatedCodeLists, commitMessage);
      const expectedResult: UpdateSharedResourcesRequest = {
        files: [
          {
            path: 'CodeLists/animals.json',
            content: animals,
          },
        ],
        baseCommitSha: data.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('libraryCodeListDataToBackendCodeListData', () => {
    it('Converts library code list data to backend code list data', () => {
      const codes: CodeList = JSON.parse(codeListsUTF8.animals);
      const libraryCodeListData: CodeListData = { name: 'animals', codes };
      const result = libraryCodeListDataToBackendCodeListData(libraryCodeListData);
      const expectedResult: CodeListDataNew = { title: 'animals', codeList: { codes } };
      expect(result).toEqual(expectedResult);
    });
  });
});
