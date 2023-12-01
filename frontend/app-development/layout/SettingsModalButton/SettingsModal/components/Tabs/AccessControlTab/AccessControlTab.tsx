import React, { ReactNode } from 'react';
import classes from './AccessControlTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Checkbox, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import {
  getPartyTypesAllowedOptions,
  initialPartyTypes,
} from '../../../utils/tabUtils/accessControlTabUtils';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { TabContent } from '../../TabContent';

export type AccessControlTabProps = {
  org: string;
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
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleChange = (newPartyTypes: string[], currentPartyTypesAllowed: PartyTypesAllowed) => {
    const newPartyTypesAllowed = { ...currentPartyTypesAllowed };

    Object.keys(currentPartyTypesAllowed).forEach((key) => {
      newPartyTypesAllowed[key] = newPartyTypes.includes(key);
    });
    updateAppMetadataMutation({ ...appMetadata, partyTypesAllowed: newPartyTypesAllowed });
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
      case 'pending': {
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
        const currentPartyTypesAllowed = appMetadata?.partyTypesAllowed ?? initialPartyTypes;
        return (
          <Checkbox.Group
            legend={t('settings_modal.access_control_tab_checkbox_legend')}
            size='small'
            onChange={(newValues: string[]) => handleChange(newValues, currentPartyTypesAllowed)}
            value={Object.keys(currentPartyTypesAllowed).filter(
              (key) => currentPartyTypesAllowed[key],
            )}
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
    <TabContent>
      <TabHeader text={t('settings_modal.access_control_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};
