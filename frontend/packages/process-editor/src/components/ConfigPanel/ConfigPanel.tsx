import React from 'react';

import classes from './ConfigPanel.module.css';
import { useTranslation } from 'react-i18next';
import { Divider, Heading, HelpText, Paragraph } from '@digdir/design-system-react';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { ConfigIcon } from './ConfigIcon';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../utils/configPanelUtils';
import { ConfigDetailsRow } from './ConfigDetailsRow';

/**
 * @component
 *  Displays the configuration panel area of the ProcessEditor
 *
 * @returns {JSX.Element} - The rendered component
 */
export const ConfigPanel = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const configTitle = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText = t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));

  const displayContent = () => {
    if (bpmnDetails === null || bpmnDetails.type === BpmnTypeEnum.Process) {
      return (
        <Paragraph className={classes.configPanelNotSelectedText} size='small'>
          {t('process_editor.configuration_panel_no_task')}
        </Paragraph>
      );
    } else if (bpmnDetails.type === BpmnTypeEnum.Task) {
      return (
        <>
          <div className={classes.headerWrapper}>
            <div className={classes.headerTextAndIconWrapper}>
              <ConfigIcon taskType={bpmnDetails.taskType} />
              <Heading level={2} size='xsmall'>
                {configTitle}
              </Heading>
            </div>
            <HelpText
              size='medium'
              title={t('process_editor.configuration_panel_header_help_text_title')}
            >
              <Paragraph size='small'>{configHeaderHelpText}</Paragraph>
            </HelpText>
          </div>
          <Divider />
          <div className={classes.configDetailsRowWrapper}>
            <ConfigDetailsRow
              title={t('process_editor.configuration_panel_id_label')}
              text={bpmnDetails.id}
            />
            <ConfigDetailsRow
              title={t('process_editor.configuration_panel_name_label')}
              text={bpmnDetails.name}
            />
          </div>
          <Divider />
        </>
      );
    } else {
      return (
        <Paragraph className={classes.configPanelNotSelectedText} size='small'>
          {t('process_editor.configuration_panel_element_not_supported')}
        </Paragraph>
      );
    }
  };

  return <div className={classes.configPanel}>{displayContent()}</div>;
};
