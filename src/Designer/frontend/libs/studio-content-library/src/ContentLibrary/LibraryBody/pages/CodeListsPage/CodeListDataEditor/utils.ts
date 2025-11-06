import type { CodeListData } from '../types/CodeListData';
import type { CodeList } from '../types/CodeList';

export const updateName = (data: CodeListData, name: string): CodeListData => ({ ...data, name });

export const updateCodes = (data: CodeListData, codes: CodeList): CodeListData => ({
  ...data,
  codes,
});
