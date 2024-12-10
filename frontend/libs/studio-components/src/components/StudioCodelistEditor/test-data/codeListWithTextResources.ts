import type { CodeListItem } from '../types/CodeListItem';
import {
  description1Id,
  description2Id,
  description3Id,
  helpText1Id,
  helpText2Id,
  helpText3Id,
  label1Id,
  label2Id,
  label3Id,
} from './textResources';
import type { CodeList } from '../types/CodeList';
import { codeListWithoutTextResources } from './codeListWithoutTextResources';

const item1: CodeListItem = {
  ...codeListWithoutTextResources[0],
  description: description1Id,
  helpText: helpText1Id,
  label: label1Id,
};

const item2: CodeListItem = {
  ...codeListWithoutTextResources[1],
  description: description2Id,
  helpText: helpText2Id,
  label: label2Id,
};

const item3: CodeListItem = {
  ...codeListWithoutTextResources[2],
  description: description3Id,
  helpText: helpText3Id,
  label: label3Id,
};

export const codeListWithTextResources: CodeList = [item1, item2, item3];
