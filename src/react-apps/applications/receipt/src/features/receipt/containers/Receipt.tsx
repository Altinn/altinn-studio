import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Axios from 'axios';
import * as moment from 'moment';
import * as React from 'react';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import AltinnContentLoader from '../../../../../shared/src/components/molecules/AltinnContentLoader';
import AltinnAppHeader from '../../../../../shared/src/components/organisms/AltinnAppHeader';
import AltinnReceipt from '../../../../../shared/src/components/organisms/AltinnReceipt';
import theme from '../../../../../shared/src/theme/altinnStudioTheme';
import { IApplication, IAttachment, IData, IInstance, IParty, IProfile  } from '../../../../../shared/src/types';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { getInstanceId } from '../../../utils/instance';
import { altinnOrganisationsUrl, altinnUrl, getApplicationMetadataUrl, getInstanceMetadataUrl, getPartyUrl, getUrlQueryParameterByKey, getUserUrl, getMessageBoxUrl } from '../../../utils/urlHelper';

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
  const [organizations, setOrganizations] = React.useState(null);
  const [application, setApplication] = React.useState<IApplication>(null);
  const [user, setUser] = React.useState<IProfile>(null);
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

  const fetchOrganizations = async () => {
    try {
      const response = await Axios.get(altinnOrganisationsUrl);
      setOrganizations(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUser = async () => {
    if (!user) {
      return;
    }
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
          url: dataElement.dataLinks.platform,
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
      dateSubmitted = moment(instance.lastChangedDateTime).format('DD.MM.YYYY / HH:MM');
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
    window.location.href = getMessageBoxUrl();
  };

  const isLoading = (): boolean => {
    // todo: add user
    return (!party || !instance || !organizations || !application);
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
        <AltinnModal
          classes={props.classes}
          isOpen={true}
          onClose={handleModalClose}
          hideBackdrop={true}
          hideCloseIcon={isPrint}
          headerText={getLanguageFromKey('Kvittering', {})}
        >
        {isLoading() &&
          <AltinnContentLoader/>
        }
        {!isLoading() &&
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
        }
        </AltinnModal>
    </div>
  );
}

export default withStyles(styles)(Receipt);
