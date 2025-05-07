import type { CodeListItem } from '../types/CodeListItem';
import {
  description1Resource,
  description2Resource,
  description3Resource,
  helpText1Resource,
  helpText2Resource,
  helpText3Resource,
  label1Resource,
  label2Resource,
  label3Resource,
} from './textResources';
import type { CodeList } from '../types/CodeList';

const item1: CodeListItem = {
  description: description1Resource.id,
  helpText: helpText1Resource.id,
  label: label1Resource.id,
  value: 'test1',
};

const item2: CodeListItem = {
  description: description2Resource.id,
  helpText: helpText2Resource.id,
  label: label2Resource.id,
  value: 'test2',
};

const item3: CodeListItem = {
  description: description3Resource.id,
  helpText: helpText3Resource.id,
  label: label3Resource.id,
  value: 'test3',
};

export const codeListWithStrings: CodeList = [item1, item2, item3];
