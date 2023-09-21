import React, { ReactNode, useState } from 'react';
import classes from './AccessControlTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Checkbox, Paragraph } from '@digdir/design-system-react';
import { ApplicationMetadata, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import {
  getPartyTypesAllowedOptions,
  initialPartyTypes,
  partyTypesAllowedMap,
} from '../../../utils/tabUtils/accessControlTabUtils';

export type AccessControlTabProps = {
  /**
   * The application's metadata
   */
  appMetadata: ApplicationMetadata;
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
 * @property {ApplicationMetadata}[appMetadata] - The application's metadata
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AccessControlTab = ({ appMetadata, org, app }: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const [partyTypesAllowed, setPartyTypesAllowed] = useState<PartyTypesAllowed>(
    appMetadata?.partyTypesAllowed ?? initialPartyTypes
  );

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

  return (
    <div>
      <TabHeader text={t('settings_modal.access_control_tab_heading')} />
      <Checkbox.Group
        legend={t('settings_modal.access_control_tab_checkbox_legend')}
        onChange={handleChange}
        onBlur={handleSavePartyTypes}
        value={Object.keys(partyTypesAllowedMap).filter((key) => partyTypesAllowed[key])}
      >
        <Paragraph as='span' size='small' short className={classes.checkboxParagraph}>
          {t('settings_modal.access_control_tab_checkbox_description')}
        </Paragraph>
        {displayCheckboxes()}
      </Checkbox.Group>
    </div>
  );
};
