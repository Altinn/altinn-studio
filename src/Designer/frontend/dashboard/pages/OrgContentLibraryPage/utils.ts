import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
  CodeListData as LibraryCodeListData,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { SharedResourcesResponse } from 'app-shared/types/api/SharedResourcesResponse';
import type {
  UpdateSharedResourcesRequest,
  FileMetadata,
} from 'app-shared/types/api/UpdateSharedResourcesRequest';
import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';
import { CODE_LIST_FOLDER } from 'app-shared/constants';
import { FileNameUtils, Guard } from '@studio/pure-functions';
import type { LibraryFile } from 'app-shared/types/LibraryFile';
import { isCodeListValid } from './validators/isCodelistValid';

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
  response: SharedResourcesResponse,
): LibraryCodeListData[] {
  return response.files.map(backendCodeListToLibraryCodeList);
}

function backendCodeListToLibraryCodeList(file: LibraryFile): LibraryCodeListData {
  const fileWithExtension = FileNameUtils.extractFileName(file.path);
  Guard.AgainstNonJsonTypes(fileWithExtension);
  const fileName = FileNameUtils.removeExtension(fileWithExtension);
  return tryConvertFile(file, fileName);
}

function tryConvertFile(file: LibraryFile, fileName: string) {
  switch (file.kind) {
    case 'content':
      return convertToLibraryCodeListData(file, fileName);
    case 'problem':
      return displayProblem(fileName);
    case 'url':
      return throwForUrl();
  }
}

function throwForUrl(): LibraryCodeListData {
  throw Error('Code list files should be json files.');
}

function displayProblem(fileName: string): LibraryCodeListData {
  // TODO: We should show the user that a codelist is corrupted
  return { name: fileName, codes: [] };
}

function convertToLibraryCodeListData(
  file: LibraryFile<'content'>,
  fileName: string,
): LibraryCodeListData {
  try {
    const codeList = JSON.parse(atobUTF8(file.content));
    return {
      name: fileName,
      codes: isCodeListValid(codeList) ? codeList : [],
    };
  } catch {
    // TODO: We should show the user that a codelist is corrupted
    return { name: fileName, codes: [] };
  }
}

function atobUTF8(data: string): string {
  const decodedData = atob(data);
  const utf8data = new Uint8Array(decodedData.length);
  const decoder = new TextDecoder('utf-8');
  [...decodedData].forEach((char, i) => (utf8data[i] = char.charCodeAt(0)));

  return decoder.decode(utf8data);
}

export function btoaUTF8(data: string): string {
  const encoder = new TextEncoder();
  const utf8data = encoder.encode(data);
  const binary = utf8data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');

  return btoa(binary);
}

export function libraryCodeListsToUpdatePayload(
  currentData: SharedResourcesResponse,
  updatedCodeLists: LibraryCodeListData[],
  commitMessage: string,
): UpdateSharedResourcesRequest {
  const files: FileMetadata[] = mapFiles(updatedCodeLists);
  const updatedNames = new Set(updatedCodeLists.map((cl) => cl.name));
  const deletedFiles = filterFilesToDelete(currentData, updatedNames);

  return {
    files: [...files, ...deletedFiles],
    baseCommitSha: currentData.commitSha,
    commitMessage,
  };
}

function mapFiles(updatedCodeLists: LibraryCodeListData[]): FileMetadata[] {
  return updatedCodeLists.map((codeList) => ({
    path: `${CODE_LIST_FOLDER}/${codeList.name}.json`,
    content: JSON.stringify({ codes: codeList.codes }, null, 2),
  }));
}

function filterFilesToDelete(currentData: SharedResourcesResponse, updatedNames: Set<string>) {
  // Add files with empty content for deleted code lists
  return currentData.files
    .filter((file) => file.kind !== 'problem')
    .filter((file) => {
      const fileName = FileNameUtils.extractFileName(FileNameUtils.removeExtension(file.path));
      return fileName && !updatedNames.has(fileName);
    })
    .map((file) => ({
      path: file.path,
      content: '',
    }));
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
