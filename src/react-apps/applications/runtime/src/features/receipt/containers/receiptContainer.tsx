import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteChildrenProps, withRouter } from 'react-router';
import ReceiptComponent from '../../../../../shared/src/components/organisms/AltinnReceipt';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';

interface IReceiptContainerProvidedProps {
  classes: any;
}

export interface IReceiptContainerProps extends IReceiptContainerProvidedProps {
  attachments: any;
  formConfig: any;
  language: any;
  profile: any;
  route: any;
}

const styles = () => createStyles({

});

const ReceiptContainer = (props: IReceiptContainerProps & RouteChildrenProps) => {

  const instanceMetaDataObject = (formConfig: any, language: any, profile: any, instanceGuid: string): {} => {

    const obj: any = {};

    obj[getLanguageFromKey('receipt_container.date_sendt', language)] = '01.01.2020 / 12:21';

    let sender: string = '';
    if (profile && profile.party.person.ssn) {
      sender = `${profile.party.person.ssn}-${profile.party.name}`;
    } else if (profile) {
      sender = `${profile.party.orgNumber}-${profile.party.name}`;
    }
    obj[getLanguageFromKey('receipt_container.sender', language)] = sender;

    obj[getLanguageFromKey('receipt_container.receiver', language)] = formConfig.org;

    obj[getLanguageFromKey('receipt_container.ref_num', language)] = instanceGuid;

    return obj;
  };

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
      title={`${props.formConfig.serviceName} ${getLanguageFromKey('receipt_container.title_part_is_submitted', props.language)}`}
      attachments={attachments}
      collapsibleTitle={getLanguageFromKey('receipt_container.attachments', props.language)}
      instanceMetaDataObject={instanceMetaDataObject(
        props.formConfig,
        props.language,
        props.profile,
        props.route.instanceGuid,
        )}
      subtitle={getLanguageFromKey('receipt_container.subtitle', props.language)}
      subtitleurl='http://some.link'
      pdf={pdf}
      body={getLanguageFromKey('receipt_container.body', props.language)}
      titleSubmitted={getLanguageFromKey('receipt_container.title_submitted', props.language)}
    />
  );

};

const mapStateToProps: (
  state: IRuntimeState,
  props: IReceiptContainerProvidedProps,
) => IReceiptContainerProps = (state: IRuntimeState, props: IReceiptContainerProvidedProps & RouteChildrenProps) => ({
  attachments: state.attachments,
  classes: props.classes,
  formConfig: state.formConfig,
  language: state.language.language,
  profile: state.profile.profile,
  route: props.match.params,
});

export default withRouter(
  withStyles(styles)(connect(mapStateToProps)(ReceiptContainer)),
  );
