import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import Axios from 'axios';
import * as moment from 'moment';
import * as React from 'react';
import AltinnAppHeader from '../../../../../shared/src/components/AltinnAppHeader';
import AltinnContentLoader from '../../../../../shared/src/components/AltinnContentLoader';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import AltinnReceipt from '../../../../../shared/src/components/organisms/AltinnReceipt';
import theme from '../../../../../shared/src/theme/altinnStudioTheme';
import { IAttachment, IParty } from '../../../../../shared/src/types';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IApplication, IData, IInstance } from '../../../types';
import { getInstanceId } from '../../../utils/instance';
import { altinnOrganisationsUrl, altinnUrl, getAltinnCloudUrl, getApplicationMetadataUrl, getInstanceMetadataUrl, getPartyUrl, getUrlQueryParameterByKey, getUserUrl } from '../../../utils/urlHelper';

const styles = () => createStyles({
  modal: {
    boxShadow: null,
    MozBoxShadow: null,
    WebkitBoxShadow: null,
  },
  body: {
    padding: 0,
  },
  modalContent: {
    margin: 48,
  },
});

function Receipt(props: WithStyles<typeof styles>) {

  const [party, setParty] = React.useState<IParty>(null);
  const [instance, setInstance] = React.useState<IInstance>(null);
  const [organizations, setOrganizations] = React.useState(null);
  const [application, setApplication] = React.useState<IApplication>(null);
  const [user, setUser] = React.useState(null);

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

  const fetchOrganizations = async () => {
    try {
      const response = await Axios.get(altinnOrganisationsUrl);
      setOrganizations(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await Axios.get(getUserUrl());
      setUser(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getOrganizationDisplayName = (): string => {
    if (!organizations) {
      return instance.org.toUpperCase();
    } else {
      // TODO: fetch this language based on language cookie
      if (organizations.orgs[instance.org]) {
        return organizations.orgs[instance.org].name.nb.toUpperCase();
      } else {
        return instance.org.toUpperCase();
      }
    }
  };

  const getAttachments = (): IAttachment[] => {
    if (!instance) {
      return [];
    } else {
      const attachments: IAttachment[] = [];
      instance.data.forEach((dataElement: IData) => {
        if (dataElement.elementType !== 'default') {
          attachments.push({
          name: dataElement.fileName,
          url: getAltinnCloudUrl() + dataElement.dataLinks.apps,
          iconClass: 'reg reg-attachment' });
        }
      });
      return attachments;
    }
  };

  const getTitle = (): string => {
    const applicationTitle = application ? application.title.nb : '';
    return `${applicationTitle} ${getLanguageFromKey('er sendt inn', {})}`;
  };

  const instanceMetaDataObject = (

    ): {} => {
    const obj = {} as any;
    let dateSubmitted;
    if (instance.lastChangedDateTime) {
      dateSubmitted = moment(instance.lastChangedDateTime).format('MM.DD.YYYY / HH:MM');
    }
    obj[getLanguageFromKey('Dato sendt', {})] = dateSubmitted;
    let sender: string = '';
    if (party && party.person.ssn) {
      sender = `${party.person.ssn}-${party.person.name}`;
    } else if (party) {
      sender = `${party.orgNumber}-${party.name}`;
    }
    obj[getLanguageFromKey('Avsender', {})] = sender;
    obj[getLanguageFromKey('Mottaker', {})] = getOrganizationDisplayName();
    obj[getLanguageFromKey('Referansenummer', {})] = getInstanceId();
    return obj;
  };

  const handleModalClose = () => {
    const urlQueryKey = 'goToUrl';
    let url = getUrlQueryParameterByKey(urlQueryKey);
    if (!url) {
      url = altinnUrl;
    }
    window.location.href = url;
  };

  const renderLoader = (): JSX.Element => {
    return(
      <AltinnModal
        classes={props.classes}
        isOpen={true}
        hideBackdrop={true}
        onClose={handleModalClose}
        hideCloseIcon={false}
        headerText={getLanguageFromKey('Kvittering', {})}
      >
        <AltinnContentLoader
          numberOfRows={3}
          height={200}
        />
      </AltinnModal>
    );
  };

  const renderContent = (): JSX.Element => {
    return(
      <AltinnModal
        classes={props.classes}
        isOpen={true}
        onClose={handleModalClose}
        hideBackdrop={true}
        hideCloseIcon={false}
        headerText={getLanguageFromKey('Kvittering', {})}
      >
        <div className={props.classes.modalContent}>
          <AltinnReceipt
            title={getTitle()}
            // tslint:disable-next-line: max-line-length
            body={'Det er gjennomført en maskinell kontroll under utfylling, men vi tar forbehold om at det kan bli oppdaget feil under saksbehandlingen og at annen dokumentasjon kan være nødvendig. Vennligst oppgi referansenummer ved eventuelle henvendelser til etaten.'}
            language={{shared_altinnreceipt: {
              attachments: 'Vedlegg',
            }}}
            attachments={getAttachments()}
            instanceMetaDataObject={instanceMetaDataObject()}
            titleSubmitted={'Følgende er sendt inn'}
          />
        </div>
      </AltinnModal>
    );
  };

  const isLoading = (): boolean => {
    // todo: add user
    return (!party || !instance || !organizations || !application || !user);
  };

  React.useEffect(() => {
    if (!application && instance) {
      fetchApplication();
    }
  }, [instance]);

  React.useEffect(() => {
    fetchInstance();
    fetchParty();
    fetchOrganizations();
    fetchUser();
  }, []);

  return (
    <div className={'container'}>
      <AltinnAppHeader
        logoColor={theme.altinnPalette.primary.blueDarker}
        headerColor={theme.altinnPalette.primary.blue}
        party={party ? party : {} as IParty}
        // tslint:disable-next-line: max-line-length
        userParty={{partyId: 12, person: {firstName: 'Steffen', middleName: '', lastName: 'Ekeberg'}, ssn: '123467'} as IParty}
      />
      {isLoading() && renderLoader()}
      {!isLoading() && renderContent()}
    </div>
  );
}

export default withStyles(styles)(Receipt);
