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
import { codeListWithoutTextResources } from './codeListWithoutTextResources';

const item1: CodeListItem = {
  ...codeListWithoutTextResources[0],
  description: description1Resource.id,
  helpText: helpText1Resource.id,
  label: label1Resource.id,
};

const item2: CodeListItem = {
  ...codeListWithoutTextResources[1],
  description: description2Resource.id,
  helpText: helpText2Resource.id,
  label: label2Resource.id,
};

const item3: CodeListItem = {
  ...codeListWithoutTextResources[2],
  description: description3Resource.id,
  helpText: helpText3Resource.id,
  label: label3Resource.id,
};

export const codeListWithTextResources: CodeList = [item1, item2, item3];
