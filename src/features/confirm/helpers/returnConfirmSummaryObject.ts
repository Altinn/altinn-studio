import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { ILanguage, IParty, ITextResource } from 'src/types/shared';

export interface ISummaryData {
  languageData?: ILanguage;
  instanceOwnerParty?: IParty;
  textResources?: ITextResource[];
}

export const returnConfirmSummaryObject = ({
  languageData,
  instanceOwnerParty,
  textResources,
}: ISummaryData): SummaryDataObject => {
  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }

  const key = getTextFromAppOrDefault('confirm.sender', textResources || [], languageData || {}, undefined, true);

  return {
    [key]: {
      value: sender,
    },
  };
};
