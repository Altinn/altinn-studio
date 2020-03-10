import moment from 'moment';
import { IApplication, IInstance, IParty } from '../../../shared/src/types';
import { getCurrentTaskData } from '../../../shared/src/utils/applicationMetaDataUtils';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { getInstanceId } from './instance';

export const getInstanceMetaDataObject = (
  instance: IInstance,
  party: IParty,
  language: any,
  organisations: any,
  application: IApplication) => {
  const obj = {} as any;

  if (!instance || !party || !language || !organisations) {
    return obj;
  }

  let dateSubmitted;
  if (instance.data) {
    const lastChanged = getCurrentTaskData(application, instance).lastChanged;
    dateSubmitted = moment(lastChanged).format('DD.MM.YYYY / HH:mm');
  }
  obj[getLanguageFromKey('receipt_platform.date_sent', language)] = dateSubmitted;
  let sender: string = '';
  if (party && party.ssn) {
    sender = `${party.ssn}-${party.name}`;
  } else if (party && party.orgNumber) {
    sender = `${party.orgNumber}-${party.name}`;
  }
  obj[getLanguageFromKey('receipt_platform.sender', language)] = sender;
  obj[getLanguageFromKey('receipt_platform.receiver', language)] = getOrganisationDisplayName(instance, organisations);
  obj[getLanguageFromKey('receipt_platform.reference_number', language)] = getInstanceId();
  return obj;
};

export const getOrganisationDisplayName = (instance: IInstance, organisations: any ): string => {
  if (!organisations) {
    return instance.org.toUpperCase();
  } else {
    // TODO: fetch this language based on language cookie
    if (organisations.orgs[instance.org]) {
        return organisations.orgs[instance.org].name.nb.toUpperCase();
    } else {
      return instance.org.toUpperCase();
    }
  }
};
