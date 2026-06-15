import type { CodeListData } from '../../../../types/CodeListData';
import type { CodeList } from '../../../../types/CodeList';
import type { CodeListFile, OrdinaryCodeListFile } from '../../../../types/CodeListFile';
import { isCodeListValid } from './validators/isCodelistValid';
import { FileNameUtils } from '@studio/pure-functions';
import { Guard } from '@studio/guard';
import type { CodeListParseErrorCode } from '../../../../types/CodeListParseErrorCode';

export const updateName = <FileInfo extends { name: string } = CodeListFile>(
  file: FileInfo,
  name: string,
): FileInfo => {
  const extension = FileNameUtils.extractExtension(file.name);
  return {
    ...file,
    name: name + '.' + extension,
  };
};

export const updateCodes = (file: OrdinaryCodeListFile, codes: CodeList): OrdinaryCodeListFile => ({
  ...file,
  content: codeListToString(codes),
});

export function codeListFileToData(file: OrdinaryCodeListFile): CodeListData {
  return { name: getCodeListNameFromFile(file), codes: codeListFileContentToData(file.content) };
}

export function getCodeListNameFromFile(file: CodeListFile): string {
  Guard.againstNonJsonTypes(file.name);
  return FileNameUtils.removeExtension(file.name);
}

export const hasContent = (file: CodeListFile): file is OrdinaryCodeListFile =>
  file.hasOwnProperty('content');

export function codeListFileContentToData(fileContent: string): CodeList {
  let data: unknown;
  try {
    data = JSON.parse(fileContent);
  } catch {
    throw new CodeListParseError('invalid-json-syntax');
  }
  if (!isCodeListValid(data)) throw new CodeListParseError('invalid-code-list');
  return data;
}

export class CodeListParseError {
  readonly #code: CodeListParseErrorCode;
  constructor(code: CodeListParseErrorCode) {
    this.#code = code;
  }
  get code(): CodeListParseErrorCode {
    return this.#code;
  }
}

export function codeListToString(codeList: CodeList): string {
  return JSON.stringify(codeList);
}

export type FileState = 'saved' | 'changed' | 'added' | 'withProblem';

export function fileState(currentFile: CodeListFile, savedFile: CodeListFile | null): FileState {
  if (!savedFile) return 'added';
  else if (!hasContent(savedFile) || !hasContent(currentFile)) return 'withProblem';
  else if (areFilesEqual(currentFile, savedFile)) return 'saved';
  else return 'changed';
}

function areFilesEqual(file1: OrdinaryCodeListFile, file2: OrdinaryCodeListFile): boolean {
  return file1.name === file2.name && file1.content === file2.content;
}
