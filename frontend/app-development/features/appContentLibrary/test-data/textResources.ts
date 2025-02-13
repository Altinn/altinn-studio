import type { ITextResource, ITextResources } from 'app-shared/types/global';

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
const label1Nb = 'Ledetekst 1';
const description1Nb = 'Beskrivelse 1';
const helpText1Nb = 'Hjelpetekst 1';
const label2Nb = 'Ledetekst 2';
const description2Nb = 'Beskrivelse 2';
const helpText2Nb = 'Hjelpetekst 2';
const label3Nb = 'Ledetekst 3';
const description3Nb = 'Beskrivelse 3';
const helpText3Nb = 'Hjelpetekst 3';
const label4Nb = 'Ledetekst 4';
const description4Nb = 'Beskrivelse 4';
const helpText4Nb = 'Hjelpetekst 4';
const label1En = 'Label 1';
const description1En = 'Description 1';
const helpText1En = 'Help text 1';
const label2En = 'Label 2';
const description2En = 'Description 2';
const helpText2En = 'Help text 2';
const label3En = 'Label 3';
const description3En = 'Description 3';
const helpText3En = 'Help text 3';
const label4En = 'Label 4';
const description4En = 'Description 4';
const helpText4En = 'Help text 4';

export const label1ResourceNb: ITextResource = { id: label1Id, value: label1Nb };
export const label1ResourceEn: ITextResource = { id: label1Id, value: label1En };
export const description1ResourceNb: ITextResource = { id: description1Id, value: description1Nb };
export const description1ResourceEn: ITextResource = { id: description1Id, value: description1En };
export const helpText1ResourceNb: ITextResource = { id: helpText1Id, value: helpText1Nb };
export const helpText1ResourceEn: ITextResource = { id: helpText1Id, value: helpText1En };
export const label2ResourceNb: ITextResource = { id: label2Id, value: label2Nb };
export const label2ResourceEn: ITextResource = { id: label2Id, value: label2En };
export const description2ResourceNb: ITextResource = { id: description2Id, value: description2Nb };
export const description2ResourceEn: ITextResource = { id: description2Id, value: description2En };
export const helpText2ResourceNb: ITextResource = { id: helpText2Id, value: helpText2Nb };
export const helpText2ResourceEn: ITextResource = { id: helpText2Id, value: helpText2En };
export const label3ResourceNb: ITextResource = { id: label3Id, value: label3Nb };
export const label3ResourceEn: ITextResource = { id: label3Id, value: label3En };
export const description3ResourceNb: ITextResource = { id: description3Id, value: description3Nb };
export const description3ResourceEn: ITextResource = { id: description3Id, value: description3En };
export const helpText3ResourceNb: ITextResource = { id: helpText3Id, value: helpText3Nb };
export const helpText3ResourceEn: ITextResource = { id: helpText3Id, value: helpText3En };
export const label4ResourceNb: ITextResource = { id: label4Id, value: label4Nb };
export const label4ResourceEn: ITextResource = { id: label4Id, value: label4En };
export const description4ResourceNb: ITextResource = { id: description4Id, value: description4Nb };
export const description4ResourceEn: ITextResource = { id: description4Id, value: description4En };
export const helpText4ResourceNb: ITextResource = { id: helpText4Id, value: helpText4Nb };
export const helpText4ResourceEn: ITextResource = { id: helpText4Id, value: helpText4En };

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

export const textResourcesEn: ITextResource[] = [
  label1ResourceEn,
  description1ResourceEn,
  helpText1ResourceEn,
  label2ResourceEn,
  description2ResourceEn,
  helpText2ResourceEn,
  label3ResourceEn,
  description3ResourceEn,
  helpText3ResourceEn,
  label4ResourceEn,
  description4ResourceEn,
  helpText4ResourceEn,
];

export const textResources: ITextResources = {
  nb: textResourcesNb,
  en: textResourcesEn,
};
