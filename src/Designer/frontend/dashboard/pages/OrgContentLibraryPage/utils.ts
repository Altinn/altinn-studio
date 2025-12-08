import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
  CodeListData as LibraryCodeListData,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { SharedResourcesResponse } from 'app-shared/types/api/GetSharedResourcesResponse';
import type {
  UpdateSharedResourcesRequest,
  FileMetadata,
} from 'app-shared/types/api/UpdateSharedResourcesRequest';
import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';
import { CODE_LIST_FOLDER } from 'app-shared/constants';
import { FileNameUtils } from '@studio/pure-functions';

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
  return response.files.map((file) => {
    const fileName = FileNameUtils.extractFileName(FileNameUtils.removeExtension(file.path));

    if (FileNameUtils.extractExtension(file.path) != 'json') {
      return { name: fileName, codes: [] };
    }

    if (file.problem || !file.content) {
      // TODO: We should show the user that a codelist is corrupted
      return { name: fileName, codes: [] };
    }

    try {
      const codeList = JSON.parse(atobUTF8(file.content));
      return {
        name: fileName,
        codes: Array.isArray(codeList.codes) ? codeList.codes : [],
      };
    } catch {
      // TODO: We should show the user that a codelist is corrupted
      return { name: fileName, codes: [] };
    }
  });
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
  currentData: SharedResourcesResponse | undefined,
  updatedCodeLists: LibraryCodeListData[],
  commitMessage: string,
): UpdateSharedResourcesRequest {
  if (!currentData) {
    throw new Error('Current data is required to create update payload');
  }

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
    .filter((file) => !file.problem)
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
