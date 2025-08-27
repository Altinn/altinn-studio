import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';

export const label1TextResource: ITextResource = {
  id: 'label1',
  value: 'Ledetekst 1',
};
export const label2TextResource: ITextResource = {
  id: 'label2',
  value: 'Ledetekst 2',
};
export const label3TextResource: ITextResource = {
  id: 'label3',
  value: 'Ledetekst 3',
};
export const label4TextResource: ITextResource = {
  id: 'label4',
  value: 'Ledetekst 4',
};
export const label5TextResource: ITextResource = {
  id: 'label5',
  value: 'Ledetekst 5',
};

export const description1TextResource: ITextResource = {
  id: 'description1',
  value: 'Beskrivelse 1',
};
export const description2TextResource: ITextResource = {
  id: 'description2',
  value: 'Beskrivelse 2',
};
export const description3TextResource: ITextResource = {
  id: 'description3',
  value: 'Beskrivelse 3',
};
export const description4TextResource: ITextResource = {
  id: 'description4',
  value: 'Beskrivelse 4',
};
export const description5TextResource: ITextResource = {
  id: 'description5',
  value: 'Beskrivelse 5',
};

export const helpText1TextResource: ITextResource = {
  id: 'helpText1',
  value: 'Hjelpetekst 1',
};
export const helpText2TextResource: ITextResource = {
  id: 'helpText2',
  value: 'Hjelpetekst 2',
};
export const helpText3TextResource: ITextResource = {
  id: 'helpText3',
  value: 'Hjelpetekst 3',
};
export const helpText4TextResource: ITextResource = {
  id: 'helpText4',
  value: 'Hjelpetekst 4',
};
export const helpText5TextResource: ITextResource = {
  id: 'helpText5',
  value: 'Hjelpetekst 5',
};

const textResources: ITextResource[] = [
  label1TextResource,
  label2TextResource,
  label3TextResource,
  label4TextResource,
  label5TextResource,
  description1TextResource,
  description2TextResource,
  description3TextResource,
  description4TextResource,
  description5TextResource,
  helpText1TextResource,
  helpText2TextResource,
  helpText3TextResource,
  helpText4TextResource,
  helpText5TextResource,
];

export const textResourcesMock: ITextResourcesWithLanguage = {
  language: 'nb',
  resources: textResources,
};
