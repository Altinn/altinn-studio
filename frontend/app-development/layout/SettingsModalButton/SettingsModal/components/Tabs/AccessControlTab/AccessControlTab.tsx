import React, { ReactNode, useEffect, useState } from 'react';
import classes from './AccessControlTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Checkbox, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import {
  getPartyTypesAllowedOptions,
  initialPartyTypes,
  partyTypesAllowedMap,
} from '../../../utils/tabUtils/accessControlTabUtils';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';

export type AccessControlTabProps = {
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the access control for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AccessControlTab = ({ org, app }: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();

  const {
    status: appMetadataStatus,
    isLoading: appMetadataLoading,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const [partyTypesAllowed, setPartyTypesAllowed] = useState<PartyTypesAllowed>(
    appMetadata?.partyTypesAllowed ?? initialPartyTypes,
  );

  useEffect(() => {
    if (!appMetadataLoading) {
      setPartyTypesAllowed(appMetadata?.partyTypesAllowed ?? initialPartyTypes);
    }
  }, [appMetadataLoading, appMetadata]);

  /**
   * Update the selected party types when clicking an option
   */
  const handleChange = (partyTypes: string[]) => {
    const newPartyTypesAllowed = { ...partyTypesAllowed };

    Object.keys(partyTypesAllowed).forEach((key) => {
      newPartyTypesAllowed[key] = partyTypes.includes(key);
    });

    setPartyTypesAllowed(newPartyTypesAllowed);
  };

  /**
   * Save the metadata with the new party types
   */
  const handleSavePartyTypes = () => {
    updateAppMetadataMutation({ ...appMetadata, partyTypesAllowed });
  };

  const displayCheckboxes = () => {
    return getPartyTypesAllowedOptions().map((option) => (
      <Checkbox value={option.value} key={option.value} size='small'>
        {t(option.label)}
      </Checkbox>
    ));
  };

  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'loading': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        return (
          <Checkbox.Group
            legend={t('settings_modal.access_control_tab_checkbox_legend')}
            size='small'
            onChange={handleChange}
            onBlur={handleSavePartyTypes}
            value={Object.keys(partyTypesAllowedMap).filter((key) => partyTypesAllowed[key])}
          >
            <Paragraph as='span' size='small' short className={classes.checkboxParagraph}>
              {t('settings_modal.access_control_tab_checkbox_description')}
            </Paragraph>
            {displayCheckboxes()}
          </Checkbox.Group>
        );
      }
    }
  };

  return (
    <div>
      <TabHeader text={t('settings_modal.access_control_tab_heading')} />
      {displayContent()}
    </div>
  );
};
