import { coloursFile, countriesFile, fruitsFile } from './codeLists';
import type { CodeListFileMap } from '../types/CodeListFileMap';
import type { CodeListFile } from '../../../../types/CodeListFile';

export const coloursKey = '779c7233-f0c8-449e-84ae-24cf6340e8bc';
export const fruitsKey = '001b2353-bc35-4e48-968d-d95cec09b0bc';
export const countriesKey = 'c2b0e032-8800-4b60-9e9e-ffe4197bcbad';

export const codeListMap: CodeListFileMap = new Map<string, CodeListFile>([
  [coloursKey, coloursFile],
  [fruitsKey, fruitsFile],
  [countriesKey, countriesFile],
]);
