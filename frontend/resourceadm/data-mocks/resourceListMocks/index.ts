import type { ResourceListItem } from "app-shared/types/ResourceAdm"

export const dataToFilterMock: ResourceListItem[] = [
  { title: { nb: 'Test', nn: 'Test', en: 'Test' }, createdBy: 'William', lastChanged: '24.08.2023', hasPolicy: true, identifier: '1' },
  { title: { nb: 'Test 2', nn: 'Test 2', en: 'Test 2' }, createdBy: 'William', lastChanged: '24.08.2023', hasPolicy: true, identifier: '1' },
  { title: { nb: '123', nn: '123', en: '123' }, createdBy: 'William', lastChanged: '24.08.2023', hasPolicy: true, identifier: '1' },
];

export const searchValueMock1: string = 'sT 2';
export const searchValueMock2: string = 'ST 2';
export const searchValueMock3: string = 'TEST 2';
export const searchValueMock4: string = 'TeSt 2';
export const searchValueMock5: string = 'tEsT 2';

