import { createStyles, WithStyles, Grid, withStyles, createMuiTheme } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Axios from 'axios';
import * as React from 'react';
import { getLanguageFromCode } from 'altinn-shared/language';
import { AltinnContentLoader, AltinnModal, AltinnAppHeader, AltinnReceipt, AltinnSubstatusPaper } from 'altinn-shared/components';
import { IApplication, IAttachment, IInstance, IParty, IProfile, IExtendedInstance, ITextResource } from 'altinn-shared/types';
import { getCurrentTaskData } from 'altinn-shared/utils/applicationMetaDataUtils';
import { mapInstanceAttachments, getAttachmentGroupings, getInstancePdf } from 'altinn-shared/utils/attachmentsUtils';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils/language';
import { returnUrlToMessagebox } from 'altinn-shared/utils/urlHelper';
import AltinnReceiptTheme from 'altinn-shared/theme/altinnReceiptTheme';
import { getInstanceMetaDataObject } from '../../../utils/receipt';
import { altinnOrganisationsUrl, getApplicationMetadataUrl, getUserUrl, getExtendedInstanceUrl, getTextResourceUrl } from '../../../utils/urlHelper';

const theme = createMuiTheme(AltinnReceiptTheme);

const styles = () => createStyles({
  body: {
    paddingLeft: '96px !important',
    paddingRight: '96px !important',
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

function Receipt(props: WithStyles<typeof styles>) {
  const [party, setParty] = React.useState<IParty>(null);
  const [instance, setInstance] = React.useState<IInstance>(null);
  const [organisations, setOrganisations] = React.useState(null);
  const [application, setApplication] = React.useState<IApplication>(null);
  const [user, setUser] = React.useState<IProfile>(null);
  const [language, setLanguage] = React.useState(null);
  const [attachments, setAttachments] = React.useState<IAttachment[]>(null);
  const [textResources, setTextResources] = React.useState<ITextResource[]>(null);
  const [pdf, setPdf] = React.useState<IAttachment>(null);
  const isPrint = useMediaQuery('print');

  const fetchInstanceAndParty = async () => {
    try {
      const response = await Axios.get<IExtendedInstance>(getExtendedInstanceUrl());
      setParty(response.data.party);
      setInstance(response.data.instance);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchApplication = async () => {
    try {
      const app = instance.appId.split('/')[1];
      const response = await Axios.get<IApplication>(getApplicationMetadataUrl(instance.org, app));
      setApplication(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrganisations = async () => {
    try {
      const response = await Axios.get(altinnOrganisationsUrl);
      setOrganisations(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await Axios.get<IProfile>(getUserUrl());
      setUser(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLanguage = async (languageCode: string) => {
    try {
      const fetchedLanguage = getLanguageFromCode(languageCode);
      setLanguage({ receipt_platform: { ...fetchedLanguage.receipt_platform } });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTextResources = async () => {
    try {
      const app = instance.appId.split('/')[1];
      const response = await Axios.get(getTextResourceUrl(instance.org, app, user.profileSettingPreference.language));
      setTextResources(response.data.resources);
    } catch (error) {
      console.error(error);
      setTextResources([]);
    }
  };

  const getTitle = (): string => {
    const applicationTitle = getTextResourceByKey('ServiceName', textResources);
    return `${applicationTitle} ${getLanguageFromKey('receipt_platform.is_sent', language)}`;
  };

  const handleModalClose = () => {
    window.location.href = returnUrlToMessagebox(window.location.origin);
  };

  const isLoading = (): boolean => {
    return (!party || !instance || !organisations || !application || !language || !user || !textResources);
  };

  React.useEffect(() => {
    if (instance && application) {
      const defaultElement = getCurrentTaskData(application, instance);
      setAttachments(mapInstanceAttachments(instance.data, defaultElement.id, true));
      setPdf(getInstancePdf(instance.data, true));
    }
    if (!application && instance) {
      fetchApplication();
    }

    if (!textResources && instance && user) {
      fetchTextResources();
    }
  }, [instance, application, user]);

  React.useEffect(() => {
    fetchInstanceAndParty();
    fetchOrganisations();
    fetchUser();
  }, []);

  React.useEffect(() => {
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
      justify='center'
      alignItems='center'
    >
      <AltinnAppHeader
        logoColor={theme.altinnPalette.primary.blueDarker}
        headerBackgroundColor={theme.altinnPalette.primary.blue}
        party={party || {} as IParty}
        userParty={user ? user.party : {} as IParty}
      />
      {instance?.status?.substatus &&
        <Grid item={true} className={props.classes.substatus}>
          <AltinnSubstatusPaper
            label={getTextResourceByKey(instance.status.substatus.label, textResources)}
            description={getTextResourceByKey(instance.status.substatus.description, textResources)}
          />
        </Grid>
      }
      <AltinnModal
        classes={props.classes}
        isOpen={true}
        onClose={handleModalClose}
        hideBackdrop={true}
        hideCloseIcon={isPrint}
        printView={true}
        closeButtonOutsideModal={true}
        headerText={getLanguageFromKey('receipt_platform.receipt', language)}
      >
        {isLoading() &&
          <AltinnContentLoader/>
        }
        {!isLoading() &&
          <AltinnReceipt
            title={getTitle()}
            body={getLanguageFromKey('receipt_platform.helper_text', language)}
            collapsibleTitle={getLanguageFromKey('receipt_platform.attachments', language)}
            attachmentGroupings={getAttachmentGroupings(attachments, application, textResources)}
            instanceMetaDataObject={getInstanceMetaDataObject(instance, party, language, organisations, application)}
            titleSubmitted={getLanguageFromKey('receipt_platform.sent_content', language)}
            pdf={pdf ? [pdf] : null}
          />
        }
      </AltinnModal>
    </Grid>
  );
}

export default withStyles(styles)(Receipt);
