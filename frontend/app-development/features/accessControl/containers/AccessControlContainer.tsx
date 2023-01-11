import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AltinnColumnLayout } from 'app-shared/components/AltinnColumnLayout';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { ApplicationMetadataActions } from '../../../sharedResources/applicationMetadata/applicationMetadataSlice';
import { CheckboxGroup, CheckboxGroupVariant } from '@digdir/design-system-react';
import classes from './AccessControlContainer.module.css';
import type { RootState } from '../../../store';
import { useAppSelector } from 'app-development/common/hooks';

export interface IAccessControlContainerProps {
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

export function AccessControlContainer({ language }: IAccessControlContainerProps) {
  const dispatch = useDispatch();
  const t = (key: string) => getLanguageFromKey(key, language);

  const [partyTypesAllowed, setPartyTypesAllowed] = useState<IPartyTypesAllowed>({
    bankruptcyEstate: false,
    organisation: false,
    person: false,
    subUnit: false,
  });

  const applicationMetadata = useAppSelector(
    (state: RootState) => state.applicationMetadataState.applicationMetadata
  );

  useEffect(() => {
    if (!applicationMetadata?.partyTypesAllowed) {
      return;
    }

    const usePartyTypesAllowed: IPartyTypesAllowed = {
      bankruptcyEstate: !!applicationMetadata.partyTypesAllowed?.bankruptcyEstate,
      organisation: !!applicationMetadata.partyTypesAllowed?.organisation,
      person: !!applicationMetadata.partyTypesAllowed?.person,
      subUnit: !!applicationMetadata.partyTypesAllowed?.subUnit,
    };

    setPartyTypesAllowed(usePartyTypesAllowed);
  }, [applicationMetadata]);

  useEffect(() => {
    dispatch(ApplicationMetadataActions.getApplicationMetadata());
  }, [dispatch]);

  const handlePartyTypesAllowedChange = (partyTypes: string[]) => {
    const newPartyTypesAllowed = { ...partyTypesAllowed };
    Object.keys(partyTypesAllowed).forEach((key: keyof IPartyTypesAllowed) => {
      newPartyTypesAllowed[key] = partyTypes.includes(key as string);
    });

    setPartyTypesAllowed(newPartyTypesAllowed);
    const newApplicationMetadata = JSON.parse(JSON.stringify(applicationMetadata || {}));
    newApplicationMetadata.partyTypesAllowed = newPartyTypesAllowed;
    dispatch(
      ApplicationMetadataActions.putApplicationMetadata({
        applicationMetadata: newApplicationMetadata,
      })
    );
  };

  const partyTypeKeys = Object.keys(PartyTypes);

  const SideMenu = (): JSX.Element => {
    return (
      <>
        <p className={classes.sidebarHeader}>{t('access_control.about_header')}</p>
        <div className={classes.sidebarSectionContainer}>
          <p className={classes.sidebarSectionHeader}>
            {t('access_control.test_initiation_header')}
          </p>
          <p className={classes.infoText}>{t('access_control.test_initiation')}</p>
        </div>
        <div className={classes.sidebarSectionContainer}>
          <p className={classes.sidebarSectionHeader}>{t('access_control.test_what_header')}</p>
          <p className={classes.infoText}>{t('access_control.test_what')}</p>
        </div>
      </>
    );
  };

  return (
    <div>
      <AltinnColumnLayout header={t('access_control.header')} sideMenuChildren={<SideMenu />}>
        <CheckboxGroup
          data-testid='access-control-container'
          description={t('access_control.party_type')}
          items={partyTypeKeys.map((key: keyof IPartyTypesAllowed) => ({
            checkboxId: undefined,
            checked: !!partyTypesAllowed[key],
            description: undefined,
            disabled: false,
            label: t(`access_control.${key}`) as string,
            name: key,
          }))}
          legend={t('access_control.party_type_header')}
          onChange={(values) => handlePartyTypesAllowedChange(values)}
          variant={CheckboxGroupVariant.Horizontal}
        />
      </AltinnColumnLayout>
    </div>
  );
}
