import * as React from 'react';
import { RouteChildrenProps, withRouter } from 'react-router';
import { createTheme } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import {
  AltinnReceipt,
  AltinnContentLoader,
  AltinnContentIconReceipt,
  AltinnButton,
  AltinnLoader,
} from 'altinn-shared/components';
import { IAttachment, IParty } from 'altinn-shared/types';
import { getAppName, getLanguageFromKey } from 'altinn-shared/utils/language';
import { mapInstanceAttachments } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getAttachmentGroupings } from 'altinn-shared/utils/attachmentsUtils';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import { IAltinnWindow } from '../../../types';
import { get } from '../../../utils/networking';
import { getValidationUrl } from '../../../utils/urlHelper';
import { updateValidations } from '../../form/validation/validationSlice';
import { mapDataElementValidationToRedux } from '../../../utils/validation';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import OrgsActions from '../../../shared/resources/orgs/orgsActions';
import { IApplicationMetadata } from '../../../shared/resources/applicationMetadata';
import { getTextFromAppOrDefault } from '../../../utils/textResource';
import moment from 'moment';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';

export type IConfirmProps = RouteChildrenProps;

const theme = createTheme(AltinnAppTheme);

const useStyles = makeStyles({
  button: {
    color: theme.altinnPalette.primary.black,
    background: theme.altinnPalette.primary.blue,
    textTransform: 'none',
    fontWeight: 400,
    height: 36,
    borderRadius: '0',
    '&:hover': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
      outline: 'none',
    },
    marginTop: 28,
  },
});

export interface ISummaryData {
  languageData?: any;
  instanceOwnerParty?: any;
}

const loaderStyles = {
  paddingTop: '30px',
  marginLeft: '40px',
  height: '64px',
};

export const returnConfirmSummaryObject = (data: ISummaryData) => {
  const obj: any = {};
  const { languageData, instanceOwnerParty } = data;

  let sender = '';
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
  const dispatch = useAppDispatch();

  const [attachments, setAttachments] = React.useState<IAttachment[]>([]);
  const [lastChangedDateTime, setLastChangedDateTime] = React.useState('');
  const [instanceMetaObject, setInstanceMetaObject] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const applicationMetadata: IApplicationMetadata = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata,
  );
  const instance = useAppSelector((state) => state.instanceData.instance);
  const language = useAppSelector((state) => state.language.language);
  const parties = useAppSelector((state) => state.party.parties);
  const validations = useAppSelector(
    (state) => state.formValidations.validations,
  );
  const userLanguage = useAppSelector((state) => state.profile.profile?.profileSettingPreference.language);

  const routeParams: any = props.match.params;

  const { instanceId } = window as Window as IAltinnWindow;
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );

  const isLoading = (): boolean =>
    !attachments ||
    !instanceMetaObject ||
    !lastChangedDateTime ||
    !instance ||
    !lastChangedDateTime ||
    !parties;

  React.useEffect(() => {
    OrgsActions.fetchOrgs();
    InstanceDataActions.getInstanceData(
      routeParams.partyId,
      routeParams.instanceGuid,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (instance && instance.org && parties && applicationMetadata) {
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });

      const obj = returnConfirmSummaryObject({
        languageData: language,
        instanceOwnerParty,
      });
      setInstanceMetaObject(obj);
    }
  }, [parties, instance, lastChangedDateTime, applicationMetadata, language]);

  React.useEffect(() => {
    if (instance && instance.data && applicationMetadata) {
      const appLogicDataTypes = applicationMetadata.dataTypes.filter(
        (dataType) => !!dataType.appLogic,
      );
      const attachmentsResult = mapInstanceAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
      setAttachments(attachmentsResult);
      setLastChangedDateTime(
        moment(instance.lastChanged).format('DD.MM.YYYY / HH:mm'),
      );
    }
  }, [instance, applicationMetadata]);

  React.useEffect(() => {
    setIsSubmitting(false);
  }, [validations]);

  const onClickConfirm = () => {
    setIsSubmitting(true);
    get(getValidationUrl(instanceId))
      .then((data: any) => {
        const mappedValidations = mapDataElementValidationToRedux(
          data,
          {},
          textResources,
        );
        dispatch(updateValidations({ validations: mappedValidations }));
        if (data.length === 0) {
          ProcessDispatcher.completeProcess();
        }
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <>
      {isLoading() && (
        <AltinnContentLoader width={705} height={561}>
          <AltinnContentIconReceipt />
        </AltinnContentLoader>
      )}
      {!isLoading() && (
        <>
          <AltinnReceipt
            attachmentGroupings={getAttachmentGroupings(
              attachments,
              applicationMetadata,
              textResources,
            )}
            body={getTextFromAppOrDefault(
              'confirm.body',
              textResources,
              language,
              [getAppName(textResources, applicationMetadata, userLanguage)],
            )}
            collapsibleTitle={getTextFromAppOrDefault(
              'confirm.attachments',
              textResources,
              language,
              null,
              true,
            )}
            hideCollapsibleCount={true}
            instanceMetaDataObject={instanceMetaObject}
            title={getTextFromAppOrDefault(
              'confirm.title',
              textResources,
              language,
              null,
              true,
            )}
            titleSubmitted={getTextFromAppOrDefault(
              'confirm.answers',
              textResources,
              language,
              null,
              true,
            )}
          />
          {isSubmitting ? (
            <AltinnLoader
              style={loaderStyles}
              srContent={getLanguageFromKey('general.loading', language)}
            />
          ) : (
            <AltinnButton
              btnText={getTextFromAppOrDefault(
                'confirm.button_text',
                textResources,
                language,
              )}
              onClickFunction={onClickConfirm}
              className={classes.button}
              id='confirm-button'
            />
          )}
        </>
      )}
    </>
  );
};

export default withRouter(Confirm);
