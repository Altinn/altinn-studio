import { type StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';

export const rowElementMock1: StudioCheckboxTableRowElement = {
  value: 'test-value 1',
  label: 'Test Label 1',
  description: 'Test Description 1',
  checked: false,
};

export const rowElementMock2: StudioCheckboxTableRowElement = {
  value: 'test-value 2',
  label: 'Test Label 2',
  description: 'Test Description 2',
  checked: true,
};

export const rowElementMocks: StudioCheckboxTableRowElement[] = [rowElementMock1, rowElementMock2];
