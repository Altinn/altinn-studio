import React, { ReactNode, useState } from 'react';
import classes from './SettingsModalButton.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppPolicyQuery } from 'app-development/hooks/queries';
import { Button, Spinner } from '@digdir/design-system-react';
import { SettingsModal } from './SettingsModal';

/**
 * @component
 *    Displays a button to open the Settings modal
 *
 * @returns {ReactNode} - The rendered component
 */
export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();

  // Get the policy data
  const { data: policyData, isLoading: policyLoading } = useAppPolicyQuery(org, app);

  const [isOpen, setIsOpen] = useState(true);

  /**
   * Display spinner when loading, else display component
   */
  if (policyLoading) {
    <div>
      <Spinner size='2xLarge' variant='interaction' title={t('settings_modal.loading_policy')} />
    </div>;
  }
  return (
    <div>
      {/*TODO - Move button to the correct place to open the modal from. Issue: #11047*/}
      <Button className={classes.button} onClick={() => setIsOpen(true)}>
        {t('settings_modal.open_button')}
      </Button>
      <SettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        policy={policyData}
        org={org}
        app={app}
      />
    </div>
  );
};
