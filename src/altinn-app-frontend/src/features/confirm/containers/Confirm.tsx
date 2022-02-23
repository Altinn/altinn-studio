import React from 'react';
import { useParams } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';

import {
  AltinnReceipt,
  AltinnContentLoader,
  AltinnContentIconReceipt,
  AltinnButton,
  AltinnLoader,
} from 'altinn-shared/components';
import { IParty } from 'altinn-shared/types';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import { mapInstanceAttachments } from 'altinn-shared/utils';
import { getAttachmentGroupings, getInstancePdf } from 'altinn-shared/utils/attachmentsUtils';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import { IAltinnWindow } from '../../../types';
import { get } from '../../../utils/networking';
import { getValidationUrl } from '../../../utils/appUrlHelper';
import { updateValidations } from '../../form/validation/validationSlice';
import { mapDataElementValidationToRedux } from '../../../utils/validation';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import { getTextFromAppOrDefault } from '../../../utils/textResource';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { selectAppName } from 'src/selectors/language';

const useStyles = makeStyles((theme) => ({
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
}));

export interface ISummaryData {
  languageData?: any;
  instanceOwnerParty?: any;
}

const loaderStyles = {
  paddingTop: '30px',
  marginLeft: '40px',
  height: '64px',
};

export const returnConfirmSummaryObject = ({
  languageData,
  instanceOwnerParty,
}: ISummaryData) => {
  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }

  return {
    [getLanguageFromKey('confirm.sender', languageData)]: sender,
  };
};

interface IParams {
  partyId: string;
  instanceGuid: string;
}

const Confirm = () => {
  const applicationMetadata = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata,
  );
  const instance = useAppSelector((state) => state.instanceData.instance);
  const language = useAppSelector((state) => state.language.language);
  const parties = useAppSelector((state) => state.party.parties);
  const appName = useAppSelector(selectAppName);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );

  const { partyId, instanceGuid }: IParams = useParams();

  const isLoading = !instance || !parties;

  React.useEffect(() => {
    InstanceDataActions.getInstanceData(partyId, instanceGuid);
  }, [partyId, instanceGuid]);

  const getInstanceMetaObject = () => {
    if (instance && instance.org && parties && applicationMetadata) {
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });

      return returnConfirmSummaryObject({
        languageData: language,
        instanceOwnerParty,
      });
    }

    return {};
  };

  const getAttachments = () => {
    if (instance && instance.data && applicationMetadata) {
      const appLogicDataTypes = applicationMetadata.dataTypes.filter(
        (dataType) => !!dataType.appLogic,
      );

      return mapInstanceAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
    }
  };

  return (
    <>
      {isLoading ? (
        <AltinnContentLoader width={705} height={561}>
          <AltinnContentIconReceipt />
        </AltinnContentLoader>
      ) : (
        <>
          <AltinnReceipt
            attachmentGroupings={getAttachmentGroupings(
              getAttachments(),
              applicationMetadata,
              textResources,
            )}
            body={getTextFromAppOrDefault(
              'confirm.body',
              textResources,
              language,
              [appName],
            )}
            collapsibleTitle={getTextFromAppOrDefault(
              'confirm.attachments',
              textResources,
              language,
              null,
              true,
            )}
            hideCollapsibleCount={true}
            instanceMetaDataObject={getInstanceMetaObject()}
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
            pdf={getInstancePdf(instance.data)}
          />
          <SubmitButton />
        </>
      )}
    </>
  );
};

const SubmitButton = () => {
  const classes = useStyles();

  const dispatch = useAppDispatch();

  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const language = useAppSelector((state) => state.language.language);

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const { instanceId } = window as Window as IAltinnWindow;

  const handleConfirmClick = () => {
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
        } else {
          setIsSubmitting(false);
        }
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  };

  if (isSubmitting) {
    return (
      <AltinnLoader
        style={loaderStyles}
        srContent={getLanguageFromKey('general.loading', language)}
      />
    );
  }

  return (
    <AltinnButton
      btnText={getTextFromAppOrDefault(
        'confirm.button_text',
        textResources,
        language,
      )}
      onClickFunction={handleConfirmClick}
      className={classes.button}
      id='confirm-button'
    />
  );
};

export default Confirm;
