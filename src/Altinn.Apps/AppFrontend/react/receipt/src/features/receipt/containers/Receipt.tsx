import {
  createStyles,
  WithStyles,
  Grid,
  withStyles,
  createTheme,
} from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Axios from 'axios';
import * as React from 'react';
import { getLanguageFromCode } from 'altinn-shared/language';
import {
  AltinnContentLoader,
  AltinnModal,
  AltinnAppHeader,
  AltinnReceipt,
  AltinnSubstatusPaper,
} from 'altinn-shared/components';
import {
  IApplication,
  IAttachment,
  IInstance,
  IParty,
  IProfile,
  IExtendedInstance,
  ITextResource,
} from 'altinn-shared/types';
import {
  mapInstanceAttachments,
  getAttachmentGroupings,
  getInstancePdf,
} from 'altinn-shared/utils/attachmentsUtils';
import {
  getLanguageFromKey,
  getTextResourceByKey,
} from 'altinn-shared/utils/language';
import { returnUrlToMessagebox } from 'altinn-shared/utils/urlHelper';
import AltinnReceiptTheme from 'altinn-shared/theme/altinnReceiptTheme';
import { getInstanceMetaDataObject } from '../../../utils/receipt';
import {
  altinnOrganisationsUrl,
  getApplicationMetadataUrl,
  getUserUrl,
  getExtendedInstanceUrl,
  getTextResourceUrl,
} from '../../../utils/urlHelper';

const theme = createTheme(AltinnReceiptTheme);

const styles = () =>
  createStyles({
    body: {
      '@media only print': {
        paddingLeft: '48px !important',
      },
    },
    substatus: {
      maxWidth: '875px',
      [theme.breakpoints.down('sm')]: {
        width: '95%',
      },
      [theme.breakpoints.up('md')]: {
        width: '80%',
      },
    },
  });

const cancelSignalMessage = 'canceled';

const logFetchError = (error: any) => {
  if (error?.message !== cancelSignalMessage) {
    console.error(error);
  }
};

function Receipt(props: WithStyles<typeof styles>) {
  const [party, setParty] = React.useState<IParty>(null);
  const [instance, setInstance] = React.useState<IInstance>(null);
  const [organisations, setOrganisations] = React.useState(null);
  const [application, setApplication] = React.useState<IApplication>(null);
  const [user, setUser] = React.useState<IProfile>(null);
  const [language, setLanguage] = React.useState(null);
  const [attachments, setAttachments] = React.useState<IAttachment[]>(null);
  const [textResources, setTextResources] =
    React.useState<ITextResource[]>(null);
  const [pdf, setPdf] = React.useState<IAttachment[]>(null);

  const isPrint = useMediaQuery('print');

  const getTitle = (): string => {
    const applicationTitle = getTextResourceByKey('ServiceName', textResources);
    return `${applicationTitle} ${getLanguageFromKey(
      'receipt_platform.is_sent',
      language,
    )}`;
  };

  const handleModalClose = () => {
    window.location.href = returnUrlToMessagebox(window.location.origin);
  };

  const isLoading = (): boolean => {
    return (
      !party ||
      !instance ||
      !organisations ||
      !application ||
      !language ||
      !user ||
      !textResources
    );
  };

  React.useEffect(() => {
    const appAbortController = new AbortController();
    const textAbortController = new AbortController();

    const fetchApplication = async () => {
      try {
        const app = instance.appId.split('/')[1];
        const response = await Axios.get<IApplication>(
          getApplicationMetadataUrl(instance.org, app),
          {
            signal: appAbortController.signal,
          },
        );
        setApplication(response.data);
      } catch (error) {
        logFetchError(error);
      }
    };

    const fetchTextResources = async () => {
      try {
        const app = instance.appId.split('/')[1];
        const response = await Axios.get(
          getTextResourceUrl(
            instance.org,
            app,
            user.profileSettingPreference.language,
          ),
          {
            signal: textAbortController.signal,
          },
        );

        setTextResources(response.data.resources);
      } catch (error) {
        logFetchError(error);
        setTextResources([]);
      }
    };

    if (instance && application) {
      const appLogicDataTypes = application.dataTypes.filter(
        (dataType: any) => !!dataType.appLogic,
      );

      const attachmentsResult = mapInstanceAttachments(
        instance.data,
        appLogicDataTypes.map((type: any) => type.id),
        true,
      );
      setAttachments(attachmentsResult);
      setPdf(getInstancePdf(instance.data, true));
    }
    if (!application && instance) {
      fetchApplication();
    }

    if (!textResources && instance && user) {
      fetchTextResources();
    }

    return () => {
      appAbortController.abort();
      textAbortController.abort();
    };
  }, [instance, application, user, textResources]);

  React.useEffect(() => {
    const instanceAbortController = new AbortController();
    const orgAbortController = new AbortController();
    const userAbortController = new AbortController();

    const fetchInitialData = async () => {
      try {
        const [instanceResponse, orgResponse, userResponse] = await Promise.all(
          [
            Axios.get<IExtendedInstance>(getExtendedInstanceUrl(), {
              signal: instanceAbortController.signal,
            }),
            Axios.get(altinnOrganisationsUrl, {
              signal: orgAbortController.signal,
            }),
            Axios.get<IProfile>(getUserUrl(), {
              signal: userAbortController.signal,
            }),
          ],
        );

        setParty(instanceResponse.data.party);
        setInstance(instanceResponse.data.instance);
        setOrganisations(orgResponse.data);
        setUser(userResponse.data);
      } catch (error) {
        logFetchError(error);
      }
    };

    fetchInitialData();

    return () => {
      instanceAbortController.abort();
      orgAbortController.abort();
      userAbortController.abort();
    };
  }, []);

  React.useEffect(() => {
    const fetchLanguage = async (languageCode: string) => {
      try {
        const fetchedLanguage = getLanguageFromCode(languageCode);
        setLanguage({
          receipt_platform: { ...fetchedLanguage.receipt_platform },
        });
      } catch (error) {
        console.error(error);
      }
    };

    if (user) {
      if (user.profileSettingPreference?.language) {
        fetchLanguage(user.profileSettingPreference.language);
      } else {
        fetchLanguage('nb');
      }
    }
  }, [user]);

  return (
    <Grid
      container={true}
      direction='column'
      justifyContent='center'
      alignItems='center'
    >
      <AltinnAppHeader
        logoColor={theme.altinnPalette.primary.blueDarker}
        headerBackgroundColor={theme.altinnPalette.primary.blue}
        party={party || ({} as IParty)}
        userParty={user ? user.party : ({} as IParty)}
        logoutText={getLanguageFromKey('receipt_platform.log_out', language)}
        ariaLabelIcon={getLanguageFromKey(
          'receipt_platform.profile_icon_aria_label',
          language,
        )}
      />
      {instance?.status?.substatus && (
        <Grid item={true} className={props.classes.substatus}>
          <AltinnSubstatusPaper
            label={getTextResourceByKey(
              instance.status.substatus.label,
              textResources,
            )}
            description={getTextResourceByKey(
              instance.status.substatus.description,
              textResources,
            )}
          />
        </Grid>
      )}
      <AltinnModal
        classes={{ body: props.classes.body }}
        isOpen={true}
        onClose={handleModalClose}
        hideBackdrop={true}
        hideCloseIcon={isPrint}
        printView={true}
        closeButtonOutsideModal={true}
        headerText={getLanguageFromKey('receipt_platform.receipt', language)}
      >
        {isLoading() && <AltinnContentLoader />}
        {!isLoading() && (
          <AltinnReceipt
            title={getTitle()}
            body={getLanguageFromKey('receipt_platform.helper_text', language)}
            collapsibleTitle={getLanguageFromKey(
              'receipt_platform.attachments',
              language,
            )}
            attachmentGroupings={getAttachmentGroupings(
              attachments,
              application,
              textResources,
            )}
            instanceMetaDataObject={getInstanceMetaDataObject(
              instance,
              party,
              language,
              organisations,
              application,
            )}
            titleSubmitted={getLanguageFromKey(
              'receipt_platform.sent_content',
              language,
            )}
            pdf={pdf || null}
          />
        )}
      </AltinnModal>
    </Grid>
  );
}

export default withStyles(styles)(Receipt);
