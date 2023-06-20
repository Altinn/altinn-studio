import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IParty } from 'src/types/shared';

export interface ISummaryData {
  instanceOwnerParty?: IParty;
  langTools: IUseLanguage;
}

export const returnConfirmSummaryObject = ({ instanceOwnerParty, langTools }: ISummaryData): SummaryDataObject => {
  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }

  const key = langTools.langAsString('confirm.sender');

  return {
    [key]: {
      value: sender,
    },
  };
};
