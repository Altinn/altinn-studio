import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  useAppDispatch,
  useAppSelector,
  useInstanceIdParams,
} from 'src/common/hooks';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { selectAppName } from 'src/selectors/language';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { getValidationUrl } from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { mapDataElementValidationToRedux } from 'src/utils/validation';
import type { IAltinnWindow } from 'src/types';

import {
  AltinnButton,
  AltinnContentIconReceipt,
  AltinnContentLoader,
  AltinnLoader,
  AltinnReceipt,
} from 'altinn-shared/components';
import { mapInstanceAttachments } from 'altinn-shared/utils';
import {
  getAttachmentGroupings,
  getInstancePdf,
} from 'altinn-shared/utils/attachmentsUtils';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import type { ILanguage, IParty, ITextResource } from 'altinn-shared/types';

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
  languageData?: ILanguage;
  instanceOwnerParty?: IParty;
  textResources?: ITextResource[];
}

const loaderStyles = {
  paddingTop: '30px',
  marginLeft: '40px',
  height: '64px',
};

export const returnConfirmSummaryObject = ({
  languageData,
  instanceOwnerParty,
  textResources,
}: ISummaryData) => {
  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }

  return {
    [getTextFromAppOrDefault(
      'confirm.sender',
      textResources,
      languageData,
      null,
      true,
    )]: sender,
  };
};

const Confirm = () => {
  const dispatch = useAppDispatch();
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

  const { instanceId } = useInstanceIdParams();

  const isLoading = !instance || !parties;

  React.useEffect(() => {
    dispatch(
      InstanceDataActions.get({
        instanceId,
      }),
    );
  }, [instanceId, dispatch]);

  const getInstanceMetaObject = () => {
    if (instance && instance.org && parties && applicationMetadata) {
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });

      return returnConfirmSummaryObject({
        languageData: language,
        instanceOwnerParty,
        textResources,
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
    <div id='ConfirmContainer'>
      {isLoading ? (
        <AltinnContentLoader
          width={705}
          height={561}
        >
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
    </div>
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
        dispatch(
          ValidationActions.updateValidations({
            validations: mappedValidations,
          }),
        );
        if (data.length === 0) {
          dispatch(ProcessActions.complete());
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
