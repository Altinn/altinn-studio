import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
  CodeListData as LibraryCodeListData,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { GetSharedResourcesResponse } from 'app-shared/types/api/GetSharedResourcesResponse';
import type {
  UpdateSharedResourcesRequest,
  FileMetadata,
} from 'app-shared/types/api/UpdateSharedResourcesRequest';

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
  response: GetSharedResourcesResponse | undefined,
): LibraryCodeListData[] {
  if (!response) return [];

  return response.files.flatMap((file) => {
    const fileName = file.path.split('/').pop()?.replace('.json', '') || 'unknown';

    if (file.problem || !file.content) {
      // TODO: We should show the user that a codelist is corrupted
      return [
        {
          name: fileName,
          codes: [],
        },
      ];
    }

    try {
      const codeList = JSON.parse(atobUTF8(file.content));
      return [
        {
          name: fileName,
          codes: Array.isArray(codeList.codes) ? codeList.codes : [],
        },
      ];
    } catch {
      // TODO: We should show the user that a codelist is corrupted
      return [
        {
          name: fileName,
          codes: [],
        },
      ];
    }
  });
}

function atobUTF8(data: string) {
  const decodedData = atob(data);
  const utf8data = new Uint8Array(decodedData.length);
  const decoder = new TextDecoder('utf-8');
  for (let i = 0; i < decodedData.length; i++) {
    utf8data[i] = decodedData.charCodeAt(i);
  }
  return decoder.decode(utf8data);
}

export function btoaUTF8(data: string) {
  const encoder = new TextEncoder();
  const utf8data = encoder.encode(data);
  let binary = '';
  for (let i = 0; i < utf8data.length; i++) {
    binary += String.fromCharCode(utf8data[i]);
  }
  return btoa(binary);
}

export function libraryCodeListsToUpdatePayload(
  currentData: GetSharedResourcesResponse | undefined,
  updatedCodeLists: LibraryCodeListData[],
  commitMessage: string,
): UpdateSharedResourcesRequest {
  if (!currentData) {
    throw new Error('Current data is required to create update payload');
  }

  const files: FileMetadata[] = updatedCodeLists.map((codeList) => ({
    path: `CodeLists/${codeList.name}.json`,
    content: JSON.stringify({ codes: codeList.codes }, null, 2),
  }));

  // Add files with empty content for deleted code lists
  const updatedNames = new Set(updatedCodeLists.map((cl) => cl.name));
  const deletedFiles = currentData.files
    .filter((file) => !file.problem)
    .filter((file) => {
      const fileName = file.path.split('/').pop()?.replace('.json', '');
      return fileName && !updatedNames.has(fileName);
    })
    .map((file) => ({
      path: file.path,
      content: '',
    }));

  return {
    files: [...files, ...deletedFiles],
    baseCommitSha: currentData.commitSha,
    commitMessage,
  };
}
