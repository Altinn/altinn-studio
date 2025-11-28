import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
  CodeListData as LibraryCodeListData,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { CodeListsNewResponse } from 'app-shared/types/api/CodeListsNewResponse';
import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';
import type { UpdateOrgCodeListsPayload } from 'app-shared/types/api/UpdateOrgCodeListsPayload';
import type { DeletableCodeListData } from 'app-shared/types/DeletableCodeListData';

export function textResourceWithLanguageToMutationArgs({
  language,
  textResource,
}: LibraryTextResourceWithLanguage): UpdateOrgTextResourcesMutationArgs {
  const payload: KeyValuePairs<string> = { [textResource.id]: textResource.value };
  return { language, payload };
}

export function textResourcesWithLanguageToLibraryTextResources({
  language,
  resources,
}: ITextResourcesWithLanguage): LibraryTextResources {
  return { [language]: resources };
}

export function backendCodeListsToLibraryCodeLists(
  codeLists: CodeListsNewResponse,
): LibraryCodeListData[] {
  return codeLists.codeListWrappers.filter(isWithoutError).map(({ codeList, title }) => ({
    name: title,
    codes: codeList.codes,
  }));
}

function isWithoutError(codeListData: CodeListDataNew): codeListData is ValidCodeListData {
  return codeListData.codeList && !codeListData.hasError;
}

type ValidCodeListData = Required<Omit<CodeListDataNew, 'hasError'>>;

export function libraryCodeListsToUpdatePayload(
  currentData: CodeListsNewResponse,
  updatedCodeLists: LibraryCodeListData[],
  commitMessage: string,
): UpdateOrgCodeListsPayload {
  const updatedLists = mapUpdatedLists(updatedCodeLists);
  const deletedLists = extractDeletedLists(currentData.codeListWrappers, updatedCodeLists);
  return {
    codeListWrappers: updatedLists.concat(deletedLists),
    baseCommitSha: currentData.commitSha,
    commitMessage,
  };
}

function mapUpdatedLists(updatedCodeLists: LibraryCodeListData[]): DeletableCodeListData[] {
  return updatedCodeLists.map(libraryCodeListDataToBackendCodeListData);
}

export function libraryCodeListDataToBackendCodeListData({
  name,
  codes,
}: LibraryCodeListData): Required<Pick<CodeListDataNew, 'title' | 'codeList'>> {
  return {
    title: name,
    codeList: { codes },
  };
}

function extractDeletedLists(
  currentCodeLists: CodeListDataNew[],
  updatedCodeLists: LibraryCodeListData[],
): DeletableCodeListData[] {
  const updatedTitles = updatedCodeLists.map((cl) => cl.name);
  return currentCodeLists
    .filter(isWithoutError)
    .filter((cl) => !updatedTitles.includes(cl.title))
    .map((cl) => ({ title: cl.title, codeList: null }));
}
