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
  CodeListData,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import { codeListsNewResponse } from './test-data/codeListsNewResponse';
import { codeLists } from './test-data/codeLists';
import type { CodeListsNewResponse } from 'app-shared/types/api/CodeListsNewResponse';
import type { UpdateOrgCodeListsPayload } from 'app-shared/types/api/UpdateOrgCodeListsPayload';
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
      const result = backendCodeListsToLibraryCodeLists(codeListsNewResponse);
      const expectedResult: CodeListData[] = [
        { name: 'animals', codes: codeLists.animals },
        { name: 'vehicles', codes: codeLists.vehicles },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('Ignores code lists with errors', () => {
      const backendCodeLists: CodeListsNewResponse = {
        ...codeListsNewResponse,
        codeListWrappers: [
          { title: 'animals', codeList: { codes: codeLists.animals }, hasError: false },
          { title: 'vehicles', codeList: null, hasError: true },
        ],
      };
      const result = backendCodeListsToLibraryCodeLists(backendCodeLists);
      const expectedResult: CodeListData[] = [{ name: 'animals', codes: codeLists.animals }];
      expect(result).toEqual(expectedResult);
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
        codeListsNewResponse,
        updatedCodeLists,
        commitMessage,
      );
      const expectedResult: UpdateOrgCodeListsPayload = {
        codeListWrappers: [
          { title: 'animals', codeList: { codes: codeLists.animals } },
          { title: 'vehicles', codeList: { codes: codeLists.vehicles } },
        ],
        baseCommitSha: codeListsNewResponse.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Sets codeList to null for deleted code lists', () => {
      const updatedCodeLists: CodeListData[] = [{ name: 'animals', codes: codeLists.animals }];
      const commitMessage = 'Lorem ipsum';
      const result = libraryCodeListsToUpdatePayload(
        codeListsNewResponse,
        updatedCodeLists,
        commitMessage,
      );
      const expectedResult: UpdateOrgCodeListsPayload = {
        codeListWrappers: [
          { title: 'animals', codeList: { codes: codeLists.animals } },
          { title: 'vehicles', codeList: null },
        ],
        baseCommitSha: codeListsNewResponse.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });

    it('Ignores code lists with errors in the original data', () => {
      const originalData: CodeListsNewResponse = {
        ...codeListsNewResponse,
        codeListWrappers: [
          { title: 'animals', codeList: { codes: codeLists.animals }, hasError: false },
          { title: 'vehicles', codeList: null, hasError: true },
        ],
      };
      const updatedCodeLists: CodeListData[] = [{ name: 'animals', codes: codeLists.animals }];
      const commitMessage = 'Lorem ipsum';
      const result = libraryCodeListsToUpdatePayload(originalData, updatedCodeLists, commitMessage);
      const expectedResult: UpdateOrgCodeListsPayload = {
        codeListWrappers: [{ title: 'animals', codeList: { codes: codeLists.animals } }],
        baseCommitSha: originalData.commitSha,
        commitMessage,
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('libraryCodeListDataToBackendCodeListData', () => {
    it('Converts library code list data to backend code list data', () => {
      const libraryCodeListData: CodeListData = {
        name: 'animals',
        codes: codeLists.animals,
      };
      const result = libraryCodeListDataToBackendCodeListData(libraryCodeListData);
      const expectedResult: CodeListDataNew = {
        title: 'animals',
        codeList: { codes: codeLists.animals },
      };
      expect(result).toEqual(expectedResult);
    });
  });
});
