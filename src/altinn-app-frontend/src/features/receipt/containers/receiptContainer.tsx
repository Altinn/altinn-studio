import { useState } from 'react';
import * as React from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RouteChildrenProps, withRouter } from 'react-router';
import { AltinnContentIconReceipt, AltinnContentLoader, AltinnReceipt as ReceiptComponent} from 'altinn-shared/components';
import { IInstance, IParty, ITextResource } from 'altinn-shared/types';
import { getCurrentTaskData,
  mapInstanceAttachments,
  getLanguageFromKey,
  getUserLanguage,
  returnUrlToMessagebox } from 'altinn-shared/utils';
import { getAttachmentGroupings } from 'altinn-shared/utils/attachmentsUtils';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import OrgsActions from '../../../shared/resources/orgs/orgsActions';
import { IRuntimeState } from '../../../types';

export interface IReceiptContainerProps extends RouteChildrenProps {
}

export const returnInstanceMetaDataObject = (
  orgsData: any,
  languageData: any,
  instanceOwnerParty: any,
  instanceGuid: string,
  userLanguageString: string,
  lastChangedDateTime: string,
  org: any,
): {} => {
  const obj: any = {};

  obj[getLanguageFromKey('receipt.date_sent', languageData)] = lastChangedDateTime;

  let sender: string = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }
  obj[getLanguageFromKey('receipt.sender', languageData)] = sender;

  if (orgsData[org]) {
    obj[getLanguageFromKey('receipt.receiver', languageData)] = orgsData[org].name[userLanguageString];
  } else {
    // This is only related to testing in Altinn Studio Dev
    obj[getLanguageFromKey('receipt.receiver', languageData)] = 'Error: Receiver org not found';
  }

  obj[getLanguageFromKey('receipt.ref_num', languageData)] = instanceGuid.split('-')[4];

  return obj;
};

const ReceiptContainer = (props: IReceiptContainerProps) => {
  const [appName, setAppName] = React.useState('');
  const [attachments, setAttachments] = useState([]);
  const [lastChangedDateTime, setLastChangedDateTime] = useState('');
  const [instanceMetaObject, setInstanceMetaObject] = useState({});
  const [userLanguage, setUserLanguage] = React.useState('nb');

  const allOrgs: any = useSelector((state: IRuntimeState) => state.organisationMetaData.allOrgs);
  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const instance: IInstance = useSelector((state: IRuntimeState) => state.instanceData.instance);
  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const parties: IParty[] = useSelector((state: IRuntimeState) => state.party.parties);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);

  const origin = window.location.origin;
  const routeParams: any = props.match.params;

  const isLoading = (): boolean => (
    !attachments ||
    !instanceMetaObject ||
    !lastChangedDateTime ||
    !appName ||
    !allOrgs ||
    !instance ||
    !lastChangedDateTime ||
    !parties
  );

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
    OrgsActions.fetchOrgs();
    InstanceDataActions.getInstanceData(routeParams.partyId, routeParams.instanceGuid);
  }, []);

  React.useEffect(() => {
    if (allOrgs != null && instance && instance.org && allOrgs && parties) {
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });

      const obj = returnInstanceMetaDataObject(
        allOrgs,
        language,
        instanceOwnerParty,
        routeParams.instanceGuid,
        userLanguage,
        lastChangedDateTime,
        instance.org,
      );
      setInstanceMetaObject(obj);
    }
  }, [allOrgs, parties, instance, lastChangedDateTime]);

  React.useEffect(() => {
    if (applicationMetadata && applicationMetadata.title) {
      setAppName(applicationMetadata.title[userLanguage]);
    }
  }, [applicationMetadata, userLanguage]);

  React.useEffect(() => {
    if (instance && instance.data && applicationMetadata) {
      const defaultElement = getCurrentTaskData(applicationMetadata, instance);

      const attachmentsResult = mapInstanceAttachments(instance.data, defaultElement.id);
      setAttachments(attachmentsResult);

      const defaultDataElementLastChangedDateTime = defaultElement ? defaultElement.lastChanged : null;
      if (defaultDataElementLastChangedDateTime) {
        setLastChangedDateTime(moment(defaultDataElementLastChangedDateTime).format('DD.MM.YYYY / HH:mm'));
      }
    }
  }, [instance, applicationMetadata]);

  return (
    <>
      {isLoading() &&
        <AltinnContentLoader width={705} height={561}>
          <AltinnContentIconReceipt/>
        </AltinnContentLoader>
      }
      {!isLoading() &&
        <ReceiptComponent
          attachmentGroupings={getAttachmentGroupings(attachments, applicationMetadata, textResources)}
          body={getLanguageFromKey('receipt.body', language)}
          collapsibleTitle={getLanguageFromKey('receipt.attachments', language)}
          instanceMetaDataObject={instanceMetaObject}
          subtitle={getLanguageFromKey('receipt.subtitle', language)}
          subtitleurl={returnUrlToMessagebox(origin)}
          title={`${appName} ${getLanguageFromKey('receipt.title_part_is_submitted', language)}`}
          titleSubmitted={getLanguageFromKey('receipt.title_submitted', language)}
        />
      }
    </>
  );
};

export default withRouter(ReceiptContainer);
