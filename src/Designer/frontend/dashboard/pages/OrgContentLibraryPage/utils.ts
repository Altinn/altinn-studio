import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
  CodeListData as LibraryCodeListData,
  CodeListFile as LibraryCodeListFile,
  OrdinaryCodeListFile as LibraryOrdinaryCodeListFile,
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
import { FileNameUtils } from '@studio/pure-functions';
import type { BackendLibraryFile, FileKind, LibraryFile } from 'app-shared/types/LibraryFile';

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
): LibraryCodeListFile[] {
  return response.files.map(backendCodeListToLibraryCodeList);
}

function backendCodeListToLibraryCodeList(backendFile: BackendLibraryFile): LibraryCodeListFile {
  const libraryFile = addFileKind(backendFile);
  const fileName = FileNameUtils.extractFileName(libraryFile.path);
  return tryConvertFile(libraryFile, fileName);
}

function addFileKind(file: BackendLibraryFile): LibraryFile {
  /* istanbul ignore else */
  if (isOfKind('content', file)) {
    return { ...file, kind: 'content' };
  } else if (isOfKind('url', file)) {
    return { ...file, kind: 'url' };
  } else if (isOfKind('problem', file)) {
    return { ...file, kind: 'problem' };
  } else {
    throw Error('Could not determine file kind.');
  }
}

function isOfKind<Kind extends FileKind>(
  kind: Kind,
  backendFile: BackendLibraryFile,
): backendFile is BackendLibraryFile<Kind> {
  switch (kind) {
    case 'content':
      return (
        'content' in backendFile &&
        backendFile.content !== undefined &&
        backendFile.content !== null
      );
    case 'url':
      return 'url' in backendFile && backendFile.url !== undefined && backendFile.url !== null;
    case 'problem':
      return (
        'problem' in backendFile &&
        backendFile.problem !== undefined &&
        backendFile.problem !== null
      );
  }
}

function tryConvertFile(file: LibraryFile, fileName: string): LibraryCodeListFile {
  switch (file.kind) {
    case 'content':
      return convertToLibraryCodeListFile(file, fileName);
    case 'problem':
      return displayProblem(file, fileName);
    case 'url':
      throw Error('Code list files should be json files.');
  }
}

function displayProblem(
  { problem }: LibraryFile<'problem'>,
  fileName: string,
): LibraryCodeListFile {
  return { name: fileName, problem };
}

function convertToLibraryCodeListFile(
  file: LibraryFile<'content'>,
  fileName: string,
): LibraryCodeListFile {
  const decoded = atobUTF8(file.content);
  return {
    name: fileName,
    content: decoded,
  };
}

function atobUTF8(data: string): string {
  const decodedData = atob(data);
  const utf8data = new Uint8Array(decodedData.length);
  const decoder = new TextDecoder('utf-8');
  [...decodedData].forEach((char, i) => (utf8data[i] = char.charCodeAt(0)));

  return decoder.decode(utf8data);
}

export function libraryCodeListsToUpdatePayload(
  currentData: SharedResourcesResponse,
  updatedCodeListFiles: LibraryCodeListFile[],
  commitMessage: string,
): UpdateSharedResourcesRequest {
  const ordinaryFiles = filterOutProblematicFiles(updatedCodeListFiles);
  const files: FileMetadata[] = mapFiles(ordinaryFiles);
  const updatedNames = new Set(updatedCodeListFiles.map((cl) => cl.name));
  const deletedFiles = filterFilesToDelete(currentData, updatedNames);

  return {
    files: [...files, ...deletedFiles],
    baseCommitSha: currentData.commitSha,
    commitMessage,
  };
}

const filterOutProblematicFiles = (files: LibraryCodeListFile[]): LibraryOrdinaryCodeListFile[] =>
  files.filter(hasContent);

const hasContent = (file: LibraryCodeListFile): file is LibraryOrdinaryCodeListFile =>
  file.hasOwnProperty('content');

function mapFiles(updatedCodeListFiles: LibraryOrdinaryCodeListFile[]): FileMetadata[] {
  return updatedCodeListFiles.map(({ name, content }) => ({
    path: `${CODE_LIST_FOLDER}/${name}`,
    content,
  }));
}

function filterFilesToDelete(currentData: SharedResourcesResponse, updatedNames: Set<string>) {
  return currentData.files
    .map(addFileKind)
    .filter((file) => isDeleted(file, updatedNames))
    .map((file) => ({
      path: file.path,
      content: null,
    }));
}

function isDeleted(file: LibraryFile, updatedNames: Set<string>): boolean {
  const fileName = FileNameUtils.extractFileName(file.path);
  return file.kind !== 'problem' && !updatedNames.has(fileName);
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
