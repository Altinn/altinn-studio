import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { RouteChildrenProps, RouteProps, withRouter, WithRouterProps } from 'react-router';
import ReceiptComponent from '../../../../../shared/src/components/organisms/AltinnReceipt';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';

import OrgsActions from './../../../shared/resources/orgs/orgsActions';

export interface IReceiptContainerProps extends WithStyles<typeof styles>, RouteChildrenProps {
}

const styles = () => createStyles({

});

const ReceiptContainer = (props: IReceiptContainerProps ) => {

  const [instanceObject, setInstanceObject] = useState({});
  // const attachments: any = useSelector((state: IRuntimeState) => state.attachments);
  const allOrgs: any = useSelector((state: IRuntimeState) => state.organizationMetaData.allOrgs);
  const profile: any = useSelector((state: IRuntimeState) => state.profile);
  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const { classes } = props;
  const routeParams: any = props.match.params;
  const formConfig: any = useSelector((state: IRuntimeState) => state.formConfig);

  const instanceMetaDataObject = (orgsData: any, languageData: any, profileData: any, instanceGuid: string): {} => {
    const obj: any = {};

    obj[getLanguageFromKey('receipt_container.date_sendt', languageData)] = '01.01.2020 / 12:21';

    let sender: string = '';
    if (profileData.profile && profile.profile.party.person.ssn) {
      sender = `${profileData.profile.party.person.ssn}-${profileData.profile.party.name}`;
    } else if (profile) {
      sender = `${profileData.profile.party.orgNumber}-${profileData.profile.party.name}`;
    }
    obj[getLanguageFromKey('receipt_container.sender', languageData)] = sender;

    const receiver: string = 'tdd';
    obj[getLanguageFromKey('receipt_container.receiver', languageData)] = orgsData[receiver].name.nb;

    obj[getLanguageFromKey('receipt_container.ref_num', languageData)] = instanceGuid;

    return obj;
  };

  React.useEffect(() => {
    OrgsActions.fetchOrgs();
  }, []);

  React.useEffect(() => {
    if (allOrgs != null && profile.profile) {
      const obj = instanceMetaDataObject(allOrgs, language, profile, routeParams.instanceGuid);
      setInstanceObject(obj);
    }
  }, [allOrgs, profile]);

  const attachments = [
    {
      name: 'fila.fil',
      iconClass: 'reg reg-attachment',
      url: 'http://some.place',
    },
    {
      name: 'fila2.fil',
      iconClass: 'reg reg-attachment',
      url: 'http://some.place2',
    },
    {
      name: 'fila.fil',
      iconClass: 'reg reg-attachment',
      url: 'http://some.place',
    },
    {
      name: 'fila2.fil',
      iconClass: 'reg reg-attachment',
      url: 'http://some.place2',
    },
    {
      name: 'fila.fil',
      iconClass: 'reg reg-attachment',
      url: 'http://some.place',
    },
    {
      name: 'fila2.fil',
      iconClass: 'reg reg-attachment',
      url: 'http://some.place2',
    },
  ];

  const pdf = [{
    name: 'InnsendtSkjema.pdf',
    iconClass: 'reg reg-attachment',
    url: 'http://url.til.skjema/fil.pdf',
  }];

  return (
    <ReceiptComponent
      // tslint:disable-next-line:max-line-length
      title={`${formConfig.serviceName} ${getLanguageFromKey('receipt_container.title_part_is_submitted', language)}`}
      attachments={attachments}
      collapsibleTitle={getLanguageFromKey('receipt_container.attachments', language)}
      instanceMetaDataObject={instanceObject}
      subtitle={getLanguageFromKey('receipt_container.subtitle', language)}
      subtitleurl='http://some.link'
      pdf={pdf}
      body={getLanguageFromKey('receipt_container.body', language)}
      titleSubmitted={getLanguageFromKey('receipt_container.title_submitted', language)}
    />
  );

};

export default withRouter(withStyles(styles)(ReceiptContainer));
