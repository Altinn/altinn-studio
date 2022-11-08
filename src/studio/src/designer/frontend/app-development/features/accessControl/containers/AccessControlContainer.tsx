import React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { ApplicationMetadataActions } from '../../../sharedResources/applicationMetadata/applicationMetadataSlice';
import {
  makeGetApplicationMetadata
} from '../../../sharedResources/applicationMetadata/selectors/applicationMetadataSelector';
import type { RootState } from 'store';
import { CheckboxGroup, CheckboxGroupVariant } from '@altinn/altinn-design-system';
import classes from './AccessControlContainer.module.css';

interface IAccessControlContainerProvidedProps {
  classes: any;
  applicationMetadata: any;
  dispatch?: Dispatch;
}

export interface IAccessControlContainerProps
  extends IAccessControlContainerProvidedProps {
  language: any;
}

export interface IAccessControlContainerState {
  partyTypesAllowed: IPartyTypesAllowed;
  setStateCalled: boolean;
}

export interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export enum PartyTypes {
  bankruptcyEstate = 'bankruptcyEstate',
  organisation = 'organisation',
  person = 'person',
  subUnit = 'subUnit',
}

export class AccessControlContainerClass extends React.Component<
  IAccessControlContainerProps,
  IAccessControlContainerState
> {
  public static getDerivedStateFromProps(
    nextProps: IAccessControlContainerProps,
    state: IAccessControlContainerState,
  ) {
    if (state.setStateCalled) {
      return {
        ...state,
        setStateCalled: false,
      };
    }

    const { partyTypesAllowed } = nextProps.applicationMetadata;
    if (!partyTypesAllowed) {
      return null;
    }
    if (state.partyTypesAllowed !== partyTypesAllowed) {
      return {
        partyTypesAllowed,
      };
    }
    return null;
  }

  constructor(props: IAccessControlContainerProps) {
    super(props);
    const { partyTypesAllowed } = props.applicationMetadata;
    this.state = {
      partyTypesAllowed: {
        bankruptcyEstate: !!partyTypesAllowed?.bankruptcyEstate,
        organisation: !!partyTypesAllowed?.organisation,
        person: !!partyTypesAllowed?.person,
        subUnit: !!partyTypesAllowed?.subUnit,
      },
      setStateCalled: false,
    };
  }

  public componentDidMount() {
    this.props.dispatch(ApplicationMetadataActions.getApplicationMetadata());
  }

  public handlePartyTypesAllowedChange(partyTypes: string[]) {
    this.setState((prev) => {
      const partyTypesAllowed = { ...prev.partyTypesAllowed };
      Object
        .keys(partyTypesAllowed)
        .forEach((key: keyof IPartyTypesAllowed) => {
          partyTypesAllowed[key] = partyTypes.includes(key as string);
        });
      return {
        partyTypesAllowed,
        setStateCalled: true,
      };
    }, this.saveApplicationMetadata);
  }

  public saveApplicationMetadata() {
    const newApplicationMetadata = JSON.parse(
      JSON.stringify(
        this.props.applicationMetadata ? this.props.applicationMetadata : {},
      ),
    );
    newApplicationMetadata.partyTypesAllowed = this.state.partyTypesAllowed;
    this.props.dispatch(
      ApplicationMetadataActions.putApplicationMetadata({
        applicationMetadata: newApplicationMetadata,
      }),
    );
  }

  public renderMainContent = (): JSX.Element => {
    return <>{this.renderPartySection()}</>;
  };

  public renderPartySection = (): JSX.Element => {
    const partyTypeKeys = Object.keys(PartyTypes);
    const t = (key: string) => getLanguageFromKey(key, this.props.language);
    return (
      <CheckboxGroup
        data-testid='access-control-container'
        description={t('access_control.party_type')}
        items={partyTypeKeys.map((key: keyof IPartyTypesAllowed) => ({
          checkboxId: undefined,
          checked: !!this.state.partyTypesAllowed[key],
          description: undefined,
          disabled: false,
          label: t(`access_control.${key}`) as string,
          name: key,
        }))}
        legend={t('access_control.party_type_header')}
        onChange={(values) => this.handlePartyTypesAllowedChange(values)}
        variant={CheckboxGroupVariant.Horizontal}
      />
    );
  };

  public renderSideMenu = (): JSX.Element => {
    const t = (key: string) => getLanguageFromKey(key, this.props.language);
    return (
      <>
        <p className={classes.sidebarHeader}>
          {t('access_control.about_header')}
        </p>
        <div className={classes.sidebarSectionContainer}>
          <p className={classes.sidebarSectionHeader}>
            {t('access_control.test_initiation_header')}
          </p>
          <p className={classes.infoText}>
            {t('access_control.test_initiation')}
          </p>
        </div>
        <div className={classes.sidebarSectionContainer}>
          <p className={classes.sidebarSectionHeader}>
            {t('access_control.test_what_header')}
          </p>
          <p className={classes.infoText}>
            {t('access_control.test_what')}
          </p>
        </div>
      </>
    );
  };

  public render() {
    return (
      <AltinnColumnLayout
        aboveColumnChildren={
          <div className={classes.versionControlHeader}>
            <VersionControlHeader language={this.props.language} />
          </div>
        }
        sideMenuChildren={this.renderSideMenu()}
        header={getLanguageFromKey(
          'access_control.header',
          this.props.language,
        )}
      >
        {this.renderMainContent()}
      </AltinnColumnLayout>
    );
  }
}

const makeMapStateToProps = () => {
  const getApplicationMetadata = makeGetApplicationMetadata();

  return (
    state: RootState,
    props: IAccessControlContainerProvidedProps,
  ): IAccessControlContainerProps => ({
    language: state.languageState.language,
    applicationMetadata: getApplicationMetadata(state),
    ...props,
  });
};

export default connect(makeMapStateToProps)(AccessControlContainerClass);
