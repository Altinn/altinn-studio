import React from 'react';

import classes from './ConfigPanel.module.css';
import { VersionAlert } from './VersionAlert';
import { supportsProcessEditor } from '../../utils/processEditorUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';

export interface ConfigPanelProps {
  appLibVersion: string;
}

/**
 * @component
 *  Displays the configuration panel area of the ProcessEditor
 *
 * @property {string}[appLibVersion] - The app-lib version the user has
 *
 * @returns {ReactNode} - The rendered component
 */
export const ConfigPanel = ({ appLibVersion }: ConfigPanelProps) => {
  const { t } = useTranslation();
  const isEditAllowed: boolean = supportsProcessEditor(appLibVersion);
  return (
    <div className={classes.configPanel}>
      {!isEditAllowed && <VersionAlert appLibVersion={appLibVersion} />}
      <div className={classes.content}>
        <h2>{t('process_editor.configuration_panel_heading')}</h2>
        <Alert severity='info'>
          <Heading level={3} size='xxsmall'>
            {t('process_editor.configuration_panel.under_development_title')}
          </Heading>
          <Paragraph size='small'>
            {t('process_editor.configuration_panel.under_development_body')}
          </Paragraph>
        </Alert>
      </div>
    </div>
  );
};
