import * as React from 'react';
import { RouteChildrenProps, withRouter } from 'react-router';
import { useSelector } from 'react-redux';
import moment = require('moment');
import { createMuiTheme } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { AltinnReceipt, AltinnContentLoader, AltinnContentIconReceipt, AltinnButton } from 'altinn-shared/components';
import { IAttachment, IInstance, IParty, IPresentationField } from 'altinn-shared/types';
import {getLanguageFromKey, getUserLanguage, getParsedLanguageFromKey, getParsedLanguageFromText} from 'altinn-shared/utils/language';
import { getCurrentTaskData, mapInstanceAttachments, getInstancePdf } from 'altinn-shared/utils';
import {AltinnAppTheme} from 'altinn-shared/theme'
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import { IAltinnWindow, IRuntimeState } from '../../../types';
import { get } from '../../../utils/networking';
import { getValidationUrl } from '../../../utils/urlHelper';
import FormValidationActions from '../../form/validation/validationActions';
import { mapDataElementValidationToRedux } from '../../../utils/validation';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import OrgsActions from '../../../shared/resources/orgs/orgsActions';
import { ITextResource } from '../../../types/global';
import { IApplicationMetadata } from '../../../shared/resources/applicationMetadata';

export interface IConfirmProps extends RouteChildrenProps {}

const theme = createMuiTheme(AltinnAppTheme);

const useStyles = makeStyles({
  button: {
    'color': theme.altinnPalette.primary.black,
    'background': theme.altinnPalette.primary.blueMedium,
    'textTransform': 'none' as 'none',
    'fontWeight': 400,
    'height': 36,
    'borderRadius': '0',
    '&:hover': {
      background: theme.altinnPalette.primary.blueMedium,
      color: theme.altinnPalette.primary.black,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueMedium,
      color: theme.altinnPalette.primary.black,
    },
    'marginTop': 28
  },
});

export interface ISummaryData {
  languageData?: any;
  instanceOwnerParty?: any;
  presentationFields: IPresentationField[];
}

export const returnConfirmSummaryObject = (data: ISummaryData): {} => {
  const obj: any = {};
  const { languageData, presentationFields, instanceOwnerParty } = data;

  presentationFields.forEach((field: IPresentationField) => {
    obj[getLanguageFromKey(field.textResource, languageData)] = field.value;
  })

  let sender: string = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }
  obj[getLanguageFromKey('confirm.sender', languageData)] = sender;

  return obj;
};

const Confirm = (props: IConfirmProps) => {

  const classes = useStyles();

  const [appName, setAppName] = React.useState('');
  const [attachments, setAttachments] = React.useState([]);
  const [pdf, setPdf] = React.useState<IAttachment>(null);
  const [lastChangedDateTime, setLastChangedDateTime] = React.useState('');
  const [instanceMetaObject, setInstanceMetaObject] = React.useState({});
  const [userLanguage, setUserLanguage] = React.useState('nb');

  const applicationMetadata: IApplicationMetadata = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const instance: IInstance = useSelector((state: IRuntimeState) => state.instanceData.instance);
  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const parties: IParty[] = useSelector((state: IRuntimeState) => state.party.parties);

  const routeParams: any = props.match.params;

  const { instanceId } = window as Window as IAltinnWindow;
  const layout = useSelector((state: IRuntimeState) => state.formLayout.layout);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);

  const isLoading = (): boolean => (
    !attachments ||
    !instanceMetaObject ||
    !lastChangedDateTime ||
    !appName ||
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
    if (instance && instance.org && parties && applicationMetadata) {
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });

      const presentationFields = applicationMetadata.presentationFields ? 
        applicationMetadata.presentationFields.filter((field) => field.taskIds.includes(instance.process.currentTask.elementId))
        : [];

      const obj = returnConfirmSummaryObject({
        languageData: language,
        instanceOwnerParty,
        presentationFields,
      });
      setInstanceMetaObject(obj);
    }
  }, [parties, instance, lastChangedDateTime, applicationMetadata]);

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
      const pdfElement = getInstancePdf(instance.data);
      setPdf(pdfElement);

      const defaultDataElementLastChangedDateTime = defaultElement ? defaultElement.lastChanged : null;
      if (defaultDataElementLastChangedDateTime) {
        setLastChangedDateTime(moment(defaultDataElementLastChangedDateTime).format('DD.MM.YYYY / HH:mm'));
      }
    }
  }, [instance, applicationMetadata]);

  const onClickConfirm = () => {
    get(getValidationUrl(instanceId)).then((data: any) => {
      const mappedValidations = mapDataElementValidationToRedux(data, layout, textResources);
      FormValidationActions.updateValidations(mappedValidations);
      if (data.length === 0) {
        ProcessDispatcher.completeProcess();
      }
    });
  }

  const getTextFromKey = (key: string, params?: string[]) => {
    let text: ITextResource;
    if (text = textResources.find((resource: ITextResource) => resource.id === key)) {
      return getParsedLanguageFromText(text.value);
    }

    return getParsedLanguageFromKey(key, language, params);
  }

  return (
    <>
    {isLoading() &&
        <AltinnContentLoader width={705} height={561}>
          <AltinnContentIconReceipt/>
        </AltinnContentLoader>
    }
    {!isLoading() &&
    <>
      <AltinnReceipt 
        attachments={attachments}
        body={getTextFromKey('confirm.body', [appName])}
        collapsibleTitle={getTextFromKey('confirm.attachments')}
        hideCollapsibleCount={true}
        instanceMetaDataObject={instanceMetaObject}
        title={`${getTextFromKey('confirm.title')}`}
        titleSubmitted={pdf ? getLanguageFromKey('confirm.answers', language) : null}
        pdf={pdf ? [pdf] : null}
      />
      <AltinnButton
        btnText={getTextFromKey('confirm.button_text')}
        onClickFunction={onClickConfirm}
        className={classes.button}
      />
    </>
    }
    </>
  
  );
}

export default withRouter(Confirm);
