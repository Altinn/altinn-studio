import React from 'react';

import classes from './ConfigPanel.module.css';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '@digdir/design-system-react';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { ConfigContent } from './ConfigContent';
import { ConfigEndEvent } from './ConfigEndEvent';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

/**
 * @component
 *  Displays the configuration panel area of the ProcessEditor
 *
 * @returns {JSX.Element} - The rendered component
 */

export const ConfigPanel = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const [showEndEventConfig] = React.useState<boolean>(shouldDisplayFeature('customizeEndEvent'));

  const displayContent = () => {
    if (bpmnDetails === null || bpmnDetails.type === BpmnTypeEnum.Process) {
      return (
        <Paragraph className={classes.configPanelParagraph} size='small'>
          {t('process_editor.configuration_panel_no_task')}
        </Paragraph>
      );
    } else if (showEndEventConfig && bpmnDetails.type === BpmnTypeEnum.EndEvent) {
      return <ConfigEndEvent />;
    } else if (bpmnDetails.type === BpmnTypeEnum.Task) {
      return <ConfigContent />;
    } else {
      return (
        <Paragraph className={classes.configPanelParagraph} size='small'>
          {t('process_editor.configuration_panel_element_not_supported')}
        </Paragraph>
      );
    }
  };

  return <div className={classes.configPanel}>{displayContent()}</div>;
};
