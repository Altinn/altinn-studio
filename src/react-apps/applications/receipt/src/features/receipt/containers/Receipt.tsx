import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Axios from 'axios';
import * as React from 'react';
import AltinnContentLoader from '../../../../../shared/src/components/molecules/AltinnContentLoader';
import AltinnModal from '../../../../../shared/src/components/molecules/AltinnModal';
import AltinnAppHeader from '../../../../../shared/src/components/organisms/AltinnAppHeader';
import AltinnReceipt from '../../../../../shared/src/components/organisms/AltinnReceipt';
import theme from '../../../../../shared/src/theme/altinnStudioTheme';
import { IApplication, IAttachment, IInstance, IParty, IProfile  } from '../../../../../shared/src/types';
import { getCurrentTaskData } from '../../../../../shared/src/utils/applicationMetaDataUtils';
import { getInstancePdf, mapInstanceAttachments } from '../../../../../shared/src/utils/attachmentsUtils';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { returnUrlToMessagebox } from '../../../../../shared/src/utils/urlHelper';
import { getInstanceMetaDataObject } from '../../../utils/receipt';
import { altinnOrganisationsUrl, getApplicationMetadataUrl, getInstanceMetadataUrl, getPartyUrl, getUserUrl, languageUrl } from '../../../utils/urlHelper';

const styles = () => createStyles({
  body: {
    paddingLeft: '96px !important',
    paddingRight: '96px !important',
    ['@media only print']: {
      paddingLeft: '48px !important',
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
  const [pdf, setPdf] = React.useState<IAttachment>(null);
  const isPrint = useMediaQuery('print');

  const fetchParty = async () => {
    try {
      const response = await Axios.get<IParty>(getPartyUrl());
      setParty(response.data);
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

  const fetchInstance = async () => {
    try {
      const response = await Axios.get<IInstance>(getInstanceMetadataUrl());
      setInstance(response.data);
    } catch (error)  {
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

  const fetchLanguage = async () => {
    try {
      const response = await Axios.get(languageUrl);
      setLanguage(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getTitle = (): string => {
    const applicationTitle = application ? application.title.nb : '';
    return `${applicationTitle} ${getLanguageFromKey('receipt_platform.is_sent', language)}`;
  };

  const handleModalClose = () => {
    window.location.href = returnUrlToMessagebox(window.location.origin);
  };

  const isLoading = (): boolean => {
    return (!party || !instance || !organisations || !application || !language || !user);
  };

  React.useEffect(() => {
    if (instance && application) {
      const defaultElement = getCurrentTaskData(application, instance);
      setAttachments(mapInstanceAttachments(instance.data, defaultElement.id));
      setPdf(getInstancePdf(instance.data, true));
    }
    if (!application && instance) {
      fetchApplication();
    }
  }, [instance, application]);

  React.useEffect(() => {
    fetchInstance();
    fetchParty();
    fetchOrganisations();
    fetchUser();
    fetchLanguage();
  }, []);

  return (
    <>
      <AltinnAppHeader
        logoColor={theme.altinnPalette.primary.blueDarker}
        headerBackgroundColor={theme.altinnPalette.primary.blue}
        party={party ? party : {} as IParty}
        userParty={user ? user.party : {} as IParty}
      />
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
            attachments={attachments}
            pdf={pdf ? [pdf] : null}
            instanceMetaDataObject={getInstanceMetaDataObject(instance, party, language, organisations, application)}
            titleSubmitted={getLanguageFromKey('receipt_platform.sent_content', language)}
          />
        }
      </AltinnModal>
    </>
  );
}

export default withStyles(styles)(Receipt);
