import type { CodeListData } from '../../../../types/CodeListData';
import type { CodeList } from '../../../../types/CodeList';
import { CodeListFile, OrdinaryCodeListFile } from '../../../../types/CodeListFile';
import { isCodeListValid } from './validators/isCodelistValid';
import { FileNameUtils } from '@studio/pure-functions';
import { Guard } from '@studio/guard';

export const updateName = (file: CodeListFile, name: string): CodeListFile => {
  const extension = FileNameUtils.extractExtension(file.name);
  return {
    ...file,
    name: name + '.' + extension,
  };
};

export const updateCodes = (file: CodeListFile, codes: CodeList): OrdinaryCodeListFile => ({
  ...file,
  content: codeListToString(codes),
});

export function codeListFileToData(file: CodeListFile): CodeListData {
  Guard.againstNonJsonTypes(file.name);
  const name = FileNameUtils.removeExtension(file.name);
  return hasContent(file)
    ? { name, codes: codeListFileContentToData(file.content) }
    : { name, codes: [] };
}

const hasContent = (file: CodeListFile): file is OrdinaryCodeListFile =>
  file.hasOwnProperty('content');

function codeListFileContentToData(fileContent: string): CodeList {
  try {
    const data = JSON.parse(fileContent);
    return isCodeListValid(data) ? data : [];
  } catch {
    return [];
  }
}

export function codeListToString(codeList: CodeList): string {
  return JSON.stringify(codeList);
}
