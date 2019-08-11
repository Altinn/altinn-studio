import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteChildrenProps, withRouter } from 'react-router';
import ReceiptComponent from '../../../../../shared/src/components/organisms/AltinnReceipt';
import altinnTheme from '../../../../../shared/src/theme/altinnAppTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';

export interface IReceiptContainerProvidedProps {
  classes: any;
}

export interface IReceiptContainerProps extends IReceiptContainerProvidedProps {
  attachments: any;
  formConfig: any;
  language: any;
  route: any;
  profile: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({

});

const ReceiptContainer = (props: IReceiptContainerProps & RouteChildrenProps) => {

  const instanceMetaDataObject = (
    formConfig: any,
    language: any,
    profile: any,
    instanceGuid: string,
    ): {} => {

    const obj: {} = {};

    obj[getLanguageFromKey('receipt.date_sendt', language)] = '01.01.2020 / 12:21';

    let sender: string = '';
    if (profile && profile.party.person.ssn) {
      sender = `${profile.party.person.ssn}-${profile.party.name}`;
    } else if (profile) {
      sender = `${profile.party.orgNumber}-${profile.party.name}`;
    }
    obj[getLanguageFromKey('receipt.sender', language)] = sender;

    obj[getLanguageFromKey('receipt.receiver', language)] = formConfig.org;

    obj[getLanguageFromKey('receipt.ref_num', language)] = instanceGuid;

    return obj;
  };

  return (
    <ReceiptComponent
      attachments={props.attachments}
      language={props.language}
      instanceMetaDataObject={instanceMetaDataObject(
        props.formConfig,
        props.language,
        props.profile,
        props.route.instanceGuid,
        )}
      appName={props.formConfig.serviceName}
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
