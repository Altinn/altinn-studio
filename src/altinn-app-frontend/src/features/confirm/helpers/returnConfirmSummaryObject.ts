import { getTextFromAppOrDefault } from 'src/utils/textResource';

import type { ILanguage, IParty, ITextResource } from 'altinn-shared/types';

export interface ISummaryData {
  languageData?: ILanguage;
  instanceOwnerParty?: IParty;
  textResources?: ITextResource[];
}

export const returnConfirmSummaryObject = ({
  languageData,
  instanceOwnerParty,
  textResources,
}: ISummaryData) => {
  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }

  const key = getTextFromAppOrDefault(
    'confirm.sender',
    textResources || [],
    languageData || {},
    undefined,
    true,
  );

  return {
    [key]: sender,
  };
};
