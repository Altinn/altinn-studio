import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';
import type { MultiLanguageText } from '../../../types/MultiLanguageText';

const label1: MultiLanguageText = {
  en: 'Label 1',
  nb: 'Ledetekst 1',
  nn: 'Ledetekst 1',
};
const label2: MultiLanguageText = {
  en: 'Label 2',
  nb: 'Ledetekst 2',
  nn: 'Ledetekst 2',
};
const label3: MultiLanguageText = {
  en: 'Label 3',
  nb: 'Ledetekst 3',
  nn: 'Ledetekst 3',
};
const description1: MultiLanguageText = {
  en: 'Description 1',
  nb: 'Beskrivelse 1',
  nn: 'Beskrivelse 1',
};
const description2: MultiLanguageText = {
  en: 'Description 2',
  nb: 'Beskrivelse 2',
  nn: 'Beskrivelse 2',
};
const description3: MultiLanguageText = {
  en: 'Description 3',
  nb: 'Beskrivelse 3',
  nn: 'Beskrivelse 3',
};
const helpText1: MultiLanguageText = {
  en: 'Help text 1',
  nb: 'Hjelpetekst 1',
  nn: 'Hjelpetekst 1',
};
const helpText2: MultiLanguageText = {
  en: 'Help text 2',
  nb: 'Hjelpetekst 2',
  nn: 'Hjelpetekst 2',
};
const helpText3: MultiLanguageText = {
  en: 'Help text 3',
  nb: 'Hjelpetekst 3',
  nn: 'Hjelpetekst 3',
};

const item1: CodeListItem = {
  description: description1,
  helpText: helpText1,
  label: label1,
  value: 'test1',
};

const item2: CodeListItem = {
  description: description2,
  helpText: helpText2,
  label: label2,
  value: 'test2',
};

const item3: CodeListItem = {
  description: description3,
  helpText: helpText3,
  label: label3,
  value: 'test3',
};

export const codeList: CodeList = [item1, item2, item3];
