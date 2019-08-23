import * as moment from 'moment';
import { useState } from 'react';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { RouteChildrenProps, withRouter } from 'react-router';
import ReceiptComponent from '../../../../../shared/src/components/organisms/AltinnReceipt';
import { getLanguageFromKey, getUserLanguage } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';
import { IAttachment } from './../../../../../shared/src/types/index';
import InstanceDataActions from './../../../shared/resources/instanceData/instanceDataActions';
import OrgsActions from './../../../shared/resources/orgs/orgsActions';

import { returnUrlToMessagebox } from './../../../../../shared/src/utils/urlHelper';

export interface IReceiptContainerProps extends RouteChildrenProps {
}

interface IData {
  id: string;
  elementType: string;
  fileName: string;
  contentType: string;
  storageUrl: string;
  dataLinks: IDataLinks;
  fileSize: number;
  isLocked: boolean;
  createdDateTime: Date;
  lastChangedDateTime: Date;
}

interface IDataLinks {
  apps: string;
}

const ReceiptContainer = (props: IReceiptContainerProps ) => {
  const [appName, setAppName] = React.useState('');
  const [attachments, setAttachments] = useState([]);
  const [instanceLastChangedDateTime, setInstanceLastChangedDateTime] = useState('');
  const [instanceMetaObject, setInstanceMetaObject] = useState({});
  const [userLanguage, setUserLanguage] = React.useState('nb');

  const allOrgs: any = useSelector((state: IRuntimeState) => state.organizationMetaData.allOrgs);
  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const instance: any = useSelector((state: IRuntimeState) => state.instanceData.instance);
  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const profile: any = useSelector((state: IRuntimeState) => state.profile);

  const origin = window.location.origin;
  const routeParams: any = props.match.params;

  const instanceMetaDataObject = (
      orgsData: any,
      languageData: any,
      profileData: any,
      instanceGuid: string,
      userLanguageString: string,
      lastChangedDateTime: string,
    ): {} => {
    const obj: any = {};

    obj[getLanguageFromKey('receipt_container.date_sendt', languageData)] = lastChangedDateTime;

    let sender: string = '';
    if (profileData.profile && profile.profile.party.person.ssn) {
      sender = `${profileData.profile.party.person.ssn}-${profileData.profile.party.name}`;
    } else if (profile) {
      sender = `${profileData.profile.party.orgNumber}-${profileData.profile.party.name}`;
    }
    obj[getLanguageFromKey('receipt_container.sender', languageData)] = sender;

    const receiver: string = 'tdd';
    obj[getLanguageFromKey('receipt_container.receiver', languageData)] = orgsData[receiver].name[userLanguageString];

    obj[getLanguageFromKey('receipt_container.ref_num', languageData)] = instanceGuid;

    return obj;
  };

  const returnAttachments = (): IAttachment[] => {
    if (!instance) {
      return [];
    } else {
      const tempAttachments: IAttachment[] = [];
      instance.data.forEach((dataElement: IData) => {
        if (dataElement.elementType !== 'default') {
          tempAttachments.push({
          name: dataElement.fileName,
          url: dataElement.dataLinks.apps,
          iconClass: 'reg reg-attachment' });
        }
      });
      return tempAttachments;
    }
  };

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
    OrgsActions.fetchOrgs();
    InstanceDataActions.getInstanceData(routeParams.partyId, routeParams.instanceGuid);
  }, []);

  React.useEffect(() => {
    if (allOrgs != null && profile.profile) {
      const obj = instanceMetaDataObject(
        allOrgs, language, profile, routeParams.instanceGuid, userLanguage, instanceLastChangedDateTime,
      );
      setInstanceMetaObject(obj);
    }
  }, [allOrgs, profile, instance]);

  React.useEffect(() => {
    if (applicationMetadata && applicationMetadata.title) {
      setAppName(applicationMetadata.title[userLanguage]);
    }
  }, [applicationMetadata, userLanguage]);

  React.useEffect(() => {
    const attachmentsResult = returnAttachments();
    setAttachments(attachmentsResult);
    if (instance) {
      setInstanceLastChangedDateTime(moment(instance.lastChangedDateTime).format('DD.MM.YYYY / HH:MM'));
    }
  }, [instance]);

  // TODO: Implement PDF support when implemented
  // const pdf = [{
  //   name: 'InnsendtSkjema.pdf',
  //   iconClass: 'reg reg-attachment',
  //   url: 'http://url.til.skjema/fil.pdf',
  // }];

  return (
    <ReceiptComponent
      attachments={attachments}
      body={getLanguageFromKey('receipt_container.body', language)}
      collapsibleTitle={getLanguageFromKey('receipt_container.attachments', language)}
      instanceMetaDataObject={instanceMetaObject}
      subtitle={getLanguageFromKey('receipt_container.subtitle', language)}
      subtitleurl={returnUrlToMessagebox(origin)}
      title={`${appName} ${getLanguageFromKey('receipt_container.title_part_is_submitted', language)}`}
      titleSubmitted={getLanguageFromKey('receipt_container.title_submitted', language)}
    />
  );

};

export default withRouter(ReceiptContainer);
