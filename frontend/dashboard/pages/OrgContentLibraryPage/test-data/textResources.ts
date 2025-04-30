import type {
  ITextResource,
  ITextResources,
  ITextResourcesWithLanguage,
} from 'app-shared/types/global';

const label1Id = 'label1';
const description1Id = 'description1';
const helpText1Id = 'helpText1';
const label2Id = 'label2';
const description2Id = 'description2';
const helpText2Id = 'helpText2';
const label3Id = 'label3';
const description3Id = 'description3';
const helpText3Id = 'helpText3';
const label4Id = 'label4';
const description4Id = 'description4';
const helpText4Id = 'helpText4';

export const label1ResourceNb: ITextResource = { id: label1Id, value: 'Ledetekst 1' };
export const description1ResourceNb: ITextResource = { id: description1Id, value: 'Beskrivelse 1' };
export const helpText1ResourceNb: ITextResource = { id: helpText1Id, value: 'Hjelpetekst 1' };
export const label2ResourceNb: ITextResource = { id: label2Id, value: 'Ledetekst 2' };
export const description2ResourceNb: ITextResource = { id: description2Id, value: 'Beskrivelse 2' };
export const helpText2ResourceNb: ITextResource = { id: helpText2Id, value: 'Hjelpetekst 2' };
export const label3ResourceNb: ITextResource = { id: label3Id, value: 'Ledetekst 3' };
export const description3ResourceNb: ITextResource = { id: description3Id, value: 'Beskrivelse 3' };
export const helpText3ResourceNb: ITextResource = { id: helpText3Id, value: 'Hjelpetekst 3' };
export const label4ResourceNb: ITextResource = { id: label4Id, value: 'Ledetekst 4' };
export const description4ResourceNb: ITextResource = { id: description4Id, value: 'Beskrivelse 4' };
export const helpText4ResourceNb: ITextResource = { id: helpText4Id, value: 'Hjelpetekst 4' };

export const textResourcesNb: ITextResource[] = [
  label1ResourceNb,
  description1ResourceNb,
  helpText1ResourceNb,
  label2ResourceNb,
  description2ResourceNb,
  helpText2ResourceNb,
  label3ResourceNb,
  description3ResourceNb,
  helpText3ResourceNb,
  label4ResourceNb,
  description4ResourceNb,
  helpText4ResourceNb,
];

export const textResourcesWithLanguage: ITextResourcesWithLanguage = {
  language: 'nb',
  resources: textResourcesNb,
};

export const textResources: ITextResources = {
  nb: textResourcesNb,
};
