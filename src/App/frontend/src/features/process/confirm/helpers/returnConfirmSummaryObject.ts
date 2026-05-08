import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IParty } from 'src/types/shared';

interface ISummaryData {
  instanceOwnerParty?: IParty;
  langTools: IUseLanguage;
}

export function getInstanceSender(instanceOwnerParty?: IParty): string {
  if (!instanceOwnerParty) {
    return '';
  }
  const identifier = instanceOwnerParty.ssn ?? instanceOwnerParty.orgNumber;
  return identifier ? `${identifier}-${instanceOwnerParty.name}` : instanceOwnerParty.name;
}

export const returnConfirmSummaryObject = ({ instanceOwnerParty, langTools }: ISummaryData): SummaryDataObject => {
  const sender = getInstanceSender(instanceOwnerParty);

  const key = langTools.langAsString('confirm.sender');

  return {
    [key]: {
      value: sender,
    },
  };
};
